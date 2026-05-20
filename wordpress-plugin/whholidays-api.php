<?php
/**
 * Plugin Name: WHHolidays Admin API
 * Description: Custom REST API endpoints for WHHolidays Admin Dashboard. Bridges Tour Master data to the Next.js admin panel.
 * Version:     1.0.0
 * Author:      WHHolidays
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'WHH_NS', 'whholidays/v1' );

// Flush rewrite rules on activation so REST routes register immediately.
register_activation_hook( __FILE__, function () { flush_rewrite_rules(); } );

// ─── Register all routes ──────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {

    // Next available trip number — returns e.g. { "next": "WH-221" }
    register_rest_route( WHH_NS, '/tours/next-number', [
        'methods'             => 'GET',
        'callback'            => 'whh_next_trip_number',
        'permission_callback' => 'whh_auth',
    ] );

    // Meta inspector — temporary diagnostic endpoint (admin only)
    register_rest_route( WHH_NS, '/tours/meta-inspect', [
        'methods'             => 'GET',
        'callback'            => 'whh_meta_inspect',
        'permission_callback' => 'whh_auth',
    ] );

    // Tours (Tour Master post type)
    register_rest_route( WHH_NS, '/tours', [
        [ 'methods' => 'GET',  'callback' => 'whh_get_tours',   'permission_callback' => 'whh_public' ],
        [ 'methods' => 'POST', 'callback' => 'whh_create_tour', 'permission_callback' => 'whh_auth' ],
    ] );
    register_rest_route( WHH_NS, '/tours/(?P<id>\d+)', [
        [ 'methods' => 'GET',    'callback' => 'whh_get_tour',    'permission_callback' => 'whh_public' ],
        [ 'methods' => 'PUT',    'callback' => 'whh_update_tour', 'permission_callback' => 'whh_auth' ],
        [ 'methods' => 'DELETE', 'callback' => 'whh_delete_tour', 'permission_callback' => 'whh_auth' ],
    ] );

    // Bookings (Tour Master custom table — read only, protected)
    register_rest_route( WHH_NS, '/bookings', [
        'methods' => 'GET', 'callback' => 'whh_get_bookings', 'permission_callback' => 'whh_auth',
    ] );
    register_rest_route( WHH_NS, '/bookings/(?P<id>\d+)', [
        'methods' => 'GET', 'callback' => 'whh_get_booking', 'permission_callback' => 'whh_auth',
    ] );

    // Customers (derived from booking records — read only, protected)
    register_rest_route( WHH_NS, '/customers', [
        'methods' => 'GET', 'callback' => 'whh_get_customers', 'permission_callback' => 'whh_auth',
    ] );
    register_rest_route( WHH_NS, '/customers/(?P<id>[\\w]+)', [
        'methods' => 'GET', 'callback' => 'whh_get_customer', 'permission_callback' => 'whh_auth',
    ] );

    // Packages (stored in wp_options as JSON, linked to tours by ID)
    register_rest_route( WHH_NS, '/packages', [
        [ 'methods' => 'GET',  'callback' => 'whh_get_packages',   'permission_callback' => 'whh_public' ],
        [ 'methods' => 'POST', 'callback' => 'whh_create_package', 'permission_callback' => 'whh_auth' ],
    ] );
    register_rest_route( WHH_NS, '/packages/(?P<id>[\\w-]+)', [
        [ 'methods' => 'GET',    'callback' => 'whh_get_package',    'permission_callback' => 'whh_public' ],
        [ 'methods' => 'PUT',    'callback' => 'whh_update_package', 'permission_callback' => 'whh_auth' ],
        [ 'methods' => 'DELETE', 'callback' => 'whh_delete_package', 'permission_callback' => 'whh_auth' ],
    ] );

    // Library entities: Cities, Hotels, Airlines, Excursions (stored in wp_options as JSON)
    foreach ( [ 'cities', 'hotels', 'airlines', 'excursions' ] as $entity ) {
        register_rest_route( WHH_NS, "/{$entity}", [
            [ 'methods' => 'GET',  'callback' => "whh_get_{$entity}",    'permission_callback' => 'whh_public' ],
            [ 'methods' => 'POST', 'callback' => "whh_create_{$entity}", 'permission_callback' => 'whh_auth' ],
        ] );
        register_rest_route( WHH_NS, "/{$entity}/(?P<id>[\\w-]+)", [
            [ 'methods' => 'GET',    'callback' => "whh_get_{$entity}_item",    'permission_callback' => 'whh_public' ],
            [ 'methods' => 'PUT',    'callback' => "whh_update_{$entity}_item", 'permission_callback' => 'whh_auth' ],
            [ 'methods' => 'DELETE', 'callback' => "whh_delete_{$entity}_item", 'permission_callback' => 'whh_auth' ],
        ] );
    }
} );

// ─── Authentication ───────────────────────────────────────────────────────────

/** Write operations require editor+ capability */
function whh_auth(): bool {
    return current_user_can( 'edit_posts' );
}

/** Read operations are public — tour data is not sensitive */
function whh_public(): bool {
    return true;
}

/**
 * Returns the next available sequential trip number.
 * Queries wp_postmeta for the highest stored "WH-NNN" value and adds 1.
 * Ignores post-ID-based fallbacks (which are 4+ digits like WH-7132).
 */
function whh_next_trip_number(): WP_REST_Response {
    global $wpdb;

    // Get the highest explicitly-stored WH-NNN trip number from post meta
    $max_val = $wpdb->get_var(
        "SELECT meta_value
         FROM {$wpdb->postmeta}
         WHERE meta_key = 'whh-trip-number'
           AND meta_value REGEXP '^WH-[0-9]+$'
         ORDER BY CAST(SUBSTRING(meta_value, 4) AS UNSIGNED) DESC
         LIMIT 1"
    );

    $next_num = $max_val ? ( (int) substr( $max_val, 3 ) + 1 ) : 1;

    return new WP_REST_Response( [
        'next' => 'WH-' . str_pad( $next_num, 3, '0', STR_PAD_LEFT ),
        'prev' => $max_val ?: null,
    ] );
}

// ─── Tour Master: format a tour post ─────────────────────────────────────────

function whh_format_tour( WP_Post $post ): array {
    $id = $post->ID;

    // --- Travel dates (stored in tourmaster-date-info as serialized array) ---
    $raw_dates  = get_post_meta( $id, 'tourmaster-date-info', true );
    $travel_date = '';
    $end_date    = '';

    if ( ! empty( $raw_dates ) ) {
        $dates = is_array( $raw_dates ) ? $raw_dates : maybe_unserialize( $raw_dates );
        if ( is_array( $dates ) && ! empty( $dates ) ) {
            $first = array_values( $dates )[0];
            // Tour Master uses both hyphen and underscore key styles across versions
            $travel_date = $first['start-date'] ?? $first['start_date'] ?? $first['date'] ?? '';
            $end_date    = $first['end-date']   ?? $first['end_date']   ?? '';
        }
    }

    // --- Duration ---
    $dur_val  = (int) ( get_post_meta( $id, 'tourmaster-duration', true ) ?: 0 );
    $dur_unit = strtolower( get_post_meta( $id, 'tourmaster-duration-unit', true ) ?: 'day' );

    if ( $dur_unit === 'night' ) {
        $duration_nights = $dur_val;
        $duration_days   = $dur_val + 1;
    } else {
        $duration_days   = $dur_val;
        $duration_nights = max( 0, $dur_val - 1 );
    }

    // --- Pricing (Tour Master stores price as EGP or local currency) ---
    $price_adult = (float) ( get_post_meta( $id, 'tourmaster-price', true ) ?: 0 );
    $price_child = (float) (
        get_post_meta( $id, 'tourmaster-child-price', true ) ?:
        get_post_meta( $id, 'tourmaster-price-children', true ) ?: 0
    );
    $deposit     = (float) ( get_post_meta( $id, 'tourmaster-deposit', true ) ?: 0 );
    $single_rate = (float) (
        get_post_meta( $id, 'tourmaster-single-price', true ) ?:
        get_post_meta( $id, 'tourmaster-price-single-supplement', true ) ?: 0
    );

    // --- Destination (from taxonomy) ---
    $dest_terms  = wp_get_post_terms( $id, 'tour-destination', [ 'fields' => 'names' ] );
    $destination = ( ! is_wp_error( $dest_terms ) && ! empty( $dest_terms ) )
        ? implode( ', ', $dest_terms )
        : '';

    // --- WHH custom meta (our dashboard fields stored as whh- prefixed keys) ---
    return [
        'id'              => (string) $id,
        'title'           => $post->post_title,
        'trip_number'     => get_post_meta( $id, 'whh-trip-number', true )
                                ?: ( 'WH-' . str_pad( $id, 3, '0', STR_PAD_LEFT ) ),
        'description'     => wp_strip_all_tags( $post->post_excerpt )
                                ?: wp_trim_words( wp_strip_all_tags( $post->post_content ), 40 ),
        'destination'     => $destination,
        'travel_date'     => $travel_date,
        'end_date'        => $end_date,
        'duration_days'   => $duration_days,
        'duration_nights' => $duration_nights,
        'price_adult'     => $price_adult,
        'price_child'     => $price_child,
        'deposit'         => $deposit,
        'single_rate'     => $single_rate,
        'featured_image'  => get_the_post_thumbnail_url( $id, 'large' ) ?: '',
        'status'          => $post->post_status === 'publish' ? 'published' : 'draft',
        // availability: manually set via dashboard; falls back to detecting SOLD in title
        'availability'    => get_post_meta( $id, 'whh-availability', true )
                                ?: ( stripos( $post->post_title, 'sold' ) !== false ? 'completed' : 'available' ),
        'created_at'      => $post->post_date_gmt . 'Z',
        'city_ids'        => whh_meta_json( $id, 'whh-city-ids' ),
        'hotel_ids'       => whh_meta_json( $id, 'whh-hotel-ids' ),
        'airline_ids'     => whh_meta_json( $id, 'whh-airline-ids' ),
        'excursion_ids'   => whh_meta_json( $id, 'whh-excursion-ids' ),
    ];
}

function whh_meta_json( int $post_id, string $key ): array {
    $raw     = get_post_meta( $post_id, $key, true );
    $decoded = json_decode( $raw, true );
    return is_array( $decoded ) ? $decoded : [];
}

// ─── Tours: CRUD ─────────────────────────────────────────────────────────────

function whh_get_tours( WP_REST_Request $req ): WP_REST_Response {
    $args = [
        'post_type'      => 'tour',
        'posts_per_page' => 200,
        'post_status'    => [ 'publish', 'draft' ],
        'orderby'        => 'date',
        'order'          => 'DESC',
    ];

    if ( $search = $req->get_param( 'search' ) ) {
        $args['s'] = sanitize_text_field( $search );
    }
    if ( $status = $req->get_param( 'status' ) ) {
        $args['post_status'] = $status === 'published' ? 'publish' : 'draft';
    }

    $posts = get_posts( $args );
    return new WP_REST_Response( array_map( 'whh_format_tour', $posts ), 200 );
}

function whh_get_tour( WP_REST_Request $req ): WP_REST_Response {
    $post = get_post( (int) $req['id'] );
    if ( ! $post || $post->post_type !== 'tour' ) {
        return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
    }
    return new WP_REST_Response( whh_format_tour( $post ), 200 );
}

function whh_create_tour( WP_REST_Request $req ): WP_REST_Response {
    $data    = $req->get_json_params();
    $post_id = wp_insert_post( [
        'post_type'    => 'tour',
        'post_title'   => sanitize_text_field( $data['title'] ?? '' ),
        'post_excerpt' => sanitize_textarea_field( $data['description'] ?? '' ),
        'post_status'  => ( $data['status'] ?? 'draft' ) === 'published' ? 'publish' : 'draft',
    ] );

    if ( is_wp_error( $post_id ) ) {
        return new WP_REST_Response( [ 'error' => $post_id->get_error_message() ], 500 );
    }

    whh_save_tour_meta( $post_id, $data );
    return new WP_REST_Response( whh_format_tour( get_post( $post_id ) ), 201 );
}

function whh_update_tour( WP_REST_Request $req ): WP_REST_Response {
    $post = get_post( (int) $req['id'] );
    if ( ! $post || $post->post_type !== 'tour' ) {
        return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
    }

    $data = $req->get_json_params();
    wp_update_post( [
        'ID'           => $post->ID,
        'post_title'   => sanitize_text_field( $data['title'] ?? $post->post_title ),
        'post_excerpt' => sanitize_textarea_field( $data['description'] ?? $post->post_excerpt ),
        'post_status'  => ( $data['status'] ?? 'draft' ) === 'published' ? 'publish' : 'draft',
    ] );

    whh_save_tour_meta( $post->ID, $data );
    return new WP_REST_Response( whh_format_tour( get_post( $post->ID ) ), 200 );
}

function whh_delete_tour( WP_REST_Request $req ): WP_REST_Response {
    $post = get_post( (int) $req['id'] );
    if ( ! $post || $post->post_type !== 'tour' ) {
        return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
    }
    wp_trash_post( $post->ID );
    return new WP_REST_Response( [ 'ok' => true ], 200 );
}

function whh_save_tour_meta( int $post_id, array $data ): void {
    // Tour Master native fields
    if ( isset( $data['price_adult'] ) )    update_post_meta( $post_id, 'tourmaster-price',          $data['price_adult'] );
    if ( isset( $data['price_child'] ) )    update_post_meta( $post_id, 'tourmaster-child-price',     $data['price_child'] );
    if ( isset( $data['deposit'] ) )        update_post_meta( $post_id, 'tourmaster-deposit',         $data['deposit'] );
    if ( isset( $data['single_rate'] ) )    update_post_meta( $post_id, 'tourmaster-single-price',    $data['single_rate'] );
    if ( isset( $data['duration_days'] ) )  update_post_meta( $post_id, 'tourmaster-duration',        $data['duration_days'] );
    update_post_meta( $post_id, 'tourmaster-duration-unit', 'Day' );

    // Travel dates in Tour Master's date-info format
    if ( ! empty( $data['travel_date'] ) ) {
        $date_info = [ [
            'start-date' => sanitize_text_field( $data['travel_date'] ),
            'end-date'   => sanitize_text_field( $data['end_date'] ?? '' ),
            'price'      => $data['price_adult'] ?? '',
            'room'       => '',
            'info'       => '',
        ] ];
        update_post_meta( $post_id, 'tourmaster-date-info', $date_info );
    }

    // WHH dashboard-specific fields
    if ( isset( $data['trip_number'] ) )   update_post_meta( $post_id, 'whh-trip-number',   sanitize_text_field( $data['trip_number'] ) );
    if ( isset( $data['availability'] ) )  update_post_meta( $post_id, 'whh-availability',  sanitize_text_field( $data['availability'] ) );
    if ( isset( $data['city_ids'] ) )      update_post_meta( $post_id, 'whh-city-ids',      wp_json_encode( $data['city_ids'] ) );
    if ( isset( $data['hotel_ids'] ) )     update_post_meta( $post_id, 'whh-hotel-ids',     wp_json_encode( $data['hotel_ids'] ) );
    if ( isset( $data['airline_ids'] ) )   update_post_meta( $post_id, 'whh-airline-ids',   wp_json_encode( $data['airline_ids'] ) );
    if ( isset( $data['excursion_ids'] ) ) update_post_meta( $post_id, 'whh-excursion-ids', wp_json_encode( $data['excursion_ids'] ) );
}

// ─── Bookings: read from tourmaster_record table ──────────────────────────────

function whh_booking_table(): ?string {
    global $wpdb;
    $table = $wpdb->prefix . 'tourmaster_record';
    return $wpdb->get_var( "SHOW TABLES LIKE '$table'" ) === $table ? $table : null;
}

function whh_format_booking( object $row ): array {
    // Tour Master column names vary slightly across versions — handle both
    $first = $row->billing_first_name ?? $row->first_name ?? '';
    $last  = $row->billing_last_name  ?? $row->last_name  ?? '';
    $name  = trim( "$first $last" ) ?: ( $row->name ?? 'Unknown' );

    return [
        'id'             => (string) ( $row->id ?? $row->ID ?? '' ),
        'customer_name'  => $name,
        'customer_email' => $row->billing_email ?? $row->email ?? '',
        'trip_id'        => (string) ( $row->post_id ?? '' ),
        'trip_title'     => get_the_title( (int) ( $row->post_id ?? 0 ) ) ?: 'Unknown Tour',
        'booking_date'   => $row->create_date ?? $row->created_date ?? $row->date ?? '',
        'status'         => $row->status ?? 'pending',
        'amount'         => (float) ( $row->price ?? $row->amount ?? $row->total ?? 0 ),
        'notes'          => $row->message ?? $row->notes ?? '',
    ];
}

function whh_get_bookings( WP_REST_Request $req ): WP_REST_Response {
    global $wpdb;
    $table = whh_booking_table();
    if ( ! $table ) return new WP_REST_Response( [], 200 );

    $where = '1=1';
    if ( $status = $req->get_param( 'status' ) ) {
        $where .= $wpdb->prepare( ' AND status = %s', $status );
    }

    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $rows = $wpdb->get_results( "SELECT * FROM $table WHERE $where ORDER BY id DESC LIMIT 200" ) ?: [];
    return new WP_REST_Response( array_map( 'whh_format_booking', $rows ), 200 );
}

function whh_get_booking( WP_REST_Request $req ): WP_REST_Response {
    global $wpdb;
    $table = whh_booking_table();
    if ( ! $table ) return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );

    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", (int) $req['id'] ) );
    if ( ! $row ) return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
    return new WP_REST_Response( whh_format_booking( $row ), 200 );
}

// ─── Customers: unique customers derived from booking records ─────────────────

function whh_get_customers( WP_REST_Request $req ): WP_REST_Response {
    global $wpdb;
    $table = whh_booking_table();
    if ( ! $table ) return new WP_REST_Response( [], 200 );

    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $rows = $wpdb->get_results(
        "SELECT billing_email, billing_first_name, billing_last_name, billing_phone, post_id, create_date
         FROM $table
         GROUP BY billing_email
         ORDER BY create_date DESC
         LIMIT 200"
    ) ?: [];

    $customers = array_map( function ( $row ) {
        $name = trim( ( $row->billing_first_name ?? '' ) . ' ' . ( $row->billing_last_name ?? '' ) );
        return [
            'id'           => md5( $row->billing_email ?? uniqid() ),
            'name'         => $name ?: 'Unknown',
            'email'        => $row->billing_email ?? '',
            'phone'        => $row->billing_phone ?: null,
            'trip_id'      => (string) ( $row->post_id ?? '' ),
            'trip_title'   => get_the_title( (int) ( $row->post_id ?? 0 ) ) ?: null,
            'enquiry_date' => $row->create_date ?? '',
        ];
    }, $rows );

    return new WP_REST_Response( $customers, 200 );
}

function whh_get_customer( WP_REST_Request $req ): WP_REST_Response {
    global $wpdb;
    $table = whh_booking_table();
    if ( ! $table ) return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );

    $target_id = sanitize_text_field( $req['id'] );

    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
    $rows = $wpdb->get_results( "SELECT billing_email, billing_first_name, billing_last_name, billing_phone, post_id, create_date FROM $table GROUP BY billing_email" ) ?: [];

    foreach ( $rows as $row ) {
        if ( md5( $row->billing_email ?? '' ) === $target_id ) {
            $name = trim( ( $row->billing_first_name ?? '' ) . ' ' . ( $row->billing_last_name ?? '' ) );
            return new WP_REST_Response( [
                'id'           => $target_id,
                'name'         => $name ?: 'Unknown',
                'email'        => $row->billing_email ?? '',
                'phone'        => $row->billing_phone ?: null,
                'trip_id'      => (string) ( $row->post_id ?? '' ),
                'trip_title'   => get_the_title( (int) ( $row->post_id ?? 0 ) ) ?: null,
                'enquiry_date' => $row->create_date ?? '',
            ], 200 );
        }
    }

    return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
}

// ─── Packages ─────────────────────────────────────────────────────────────────
// Stored in wp_options as JSON, linked to tours by post ID.

function whh_get_packages( WP_REST_Request $req ): WP_REST_Response {
    return new WP_REST_Response( array_values( whh_lib_all( 'packages' ) ), 200 );
}

function whh_get_package( WP_REST_Request $req ): WP_REST_Response {
    return whh_lib_resp_get( 'packages', $req );
}

function whh_create_package( WP_REST_Request $req ): WP_REST_Response {
    $data       = $req->get_json_params();
    $trip_id    = sanitize_text_field( $data['trip_id'] ?? '' );
    $trip_title = $trip_id ? ( get_the_title( (int) $trip_id ) ?: '' ) : '';

    $items = whh_lib_all( 'packages' );
    $item  = [
        'id'         => uniqid( 'pkg-' ),
        'name'       => sanitize_text_field( $data['name'] ?? '' ),
        'price'      => (float) ( $data['price'] ?? 0 ),
        'trip_id'    => $trip_id,
        'trip_title' => $trip_title,
        'inclusions' => sanitize_textarea_field( $data['inclusions'] ?? '' ),
        'max_people' => (int) ( $data['max_people'] ?? 1 ),
        'created_at' => gmdate( 'c' ),
    ];
    $items[] = $item;
    whh_lib_save( 'packages', $items );
    return new WP_REST_Response( $item, 201 );
}

function whh_update_package( WP_REST_Request $req ): WP_REST_Response {
    $data    = $req->get_json_params();
    $trip_id = sanitize_text_field( $data['trip_id'] ?? '' );

    $items  = whh_lib_all( 'packages' );
    $result = null;
    foreach ( $items as &$item ) {
        if ( ( $item['id'] ?? '' ) === $req['id'] ) {
            $item = array_merge( $item, [
                'name'       => sanitize_text_field( $data['name'] ?? $item['name'] ),
                'price'      => (float) ( $data['price'] ?? $item['price'] ),
                'trip_id'    => $trip_id ?: $item['trip_id'],
                'trip_title' => $trip_id ? ( get_the_title( (int) $trip_id ) ?: $item['trip_title'] ) : $item['trip_title'],
                'inclusions' => sanitize_textarea_field( $data['inclusions'] ?? $item['inclusions'] ),
                'max_people' => (int) ( $data['max_people'] ?? $item['max_people'] ),
            ], [ 'id' => $req['id'] ] );
            $result = $item;
            break;
        }
    }
    if ( ! $result ) return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
    whh_lib_save( 'packages', $items );
    return new WP_REST_Response( $result, 200 );
}

function whh_delete_package( WP_REST_Request $req ): WP_REST_Response {
    $items = array_filter( whh_lib_all( 'packages' ), fn( $i ) => ( $i['id'] ?? '' ) !== $req['id'] );
    whh_lib_save( 'packages', array_values( $items ) );
    return new WP_REST_Response( [ 'ok' => true ], 200 );
}

// ─── Library entities (Cities / Hotels / Airlines / Excursions) ───────────────
// Stored as JSON arrays in wp_options. No custom tables needed.

function whh_lib_key( string $entity ): string { return 'whh_lib_' . $entity; }
function whh_lib_all( string $entity ): array   { return get_option( whh_lib_key( $entity ), [] ) ?: []; }
function whh_lib_save( string $entity, array $items ): void { update_option( whh_lib_key( $entity ), array_values( $items ), false ); }

function whh_lib_get_item( string $entity, string $id ): ?array {
    foreach ( whh_lib_all( $entity ) as $item ) {
        if ( ( $item['id'] ?? '' ) === $id ) return $item;
    }
    return null;
}

function whh_lib_resp_get( string $entity, WP_REST_Request $r ): WP_REST_Response {
    $item = whh_lib_get_item( $entity, $r['id'] );
    return $item ? new WP_REST_Response( $item, 200 ) : new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
}

function whh_lib_resp_create( string $entity, WP_REST_Request $r ): WP_REST_Response {
    $items  = whh_lib_all( $entity );
    $item   = array_merge( $r->get_json_params(), [ 'id' => uniqid( $entity . '-' ) ] );
    $items[] = $item;
    whh_lib_save( $entity, $items );
    return new WP_REST_Response( $item, 201 );
}

function whh_lib_resp_update( string $entity, WP_REST_Request $r ): WP_REST_Response {
    $items  = whh_lib_all( $entity );
    $result = null;
    foreach ( $items as &$item ) {
        if ( ( $item['id'] ?? '' ) === $r['id'] ) {
            $item   = array_merge( $item, $r->get_json_params(), [ 'id' => $r['id'] ] );
            $result = $item;
            break;
        }
    }
    if ( ! $result ) return new WP_REST_Response( [ 'error' => 'Not found' ], 404 );
    whh_lib_save( $entity, $items );
    return new WP_REST_Response( $result, 200 );
}

function whh_lib_resp_delete( string $entity, WP_REST_Request $r ): WP_REST_Response {
    $items = array_filter( whh_lib_all( $entity ), fn( $i ) => ( $i['id'] ?? '' ) !== $r['id'] );
    whh_lib_save( $entity, $items );
    return new WP_REST_Response( [ 'ok' => true ], 200 );
}

// ─── Entity route callbacks ───────────────────────────────────────────────────

// Cities
function whh_get_cities( $r = null ):          WP_REST_Response { return new WP_REST_Response( array_values( whh_lib_all( 'cities' ) ), 200 ); }
function whh_get_cities_item( $r ):            WP_REST_Response { return whh_lib_resp_get( 'cities', $r ); }
function whh_create_cities( $r ):              WP_REST_Response { return whh_lib_resp_create( 'cities', $r ); }
function whh_update_cities_item( $r ):         WP_REST_Response { return whh_lib_resp_update( 'cities', $r ); }
function whh_delete_cities_item( $r ):         WP_REST_Response { return whh_lib_resp_delete( 'cities', $r ); }

// Hotels
function whh_get_hotels( $r = null ):          WP_REST_Response { return new WP_REST_Response( array_values( whh_lib_all( 'hotels' ) ), 200 ); }
function whh_get_hotels_item( $r ):            WP_REST_Response { return whh_lib_resp_get( 'hotels', $r ); }
function whh_create_hotels( $r ):              WP_REST_Response { return whh_lib_resp_create( 'hotels', $r ); }
function whh_update_hotels_item( $r ):         WP_REST_Response { return whh_lib_resp_update( 'hotels', $r ); }
function whh_delete_hotels_item( $r ):         WP_REST_Response { return whh_lib_resp_delete( 'hotels', $r ); }

// Airlines
function whh_get_airlines( $r = null ):        WP_REST_Response { return new WP_REST_Response( array_values( whh_lib_all( 'airlines' ) ), 200 ); }
function whh_get_airlines_item( $r ):          WP_REST_Response { return whh_lib_resp_get( 'airlines', $r ); }
function whh_create_airlines( $r ):            WP_REST_Response { return whh_lib_resp_create( 'airlines', $r ); }
function whh_update_airlines_item( $r ):       WP_REST_Response { return whh_lib_resp_update( 'airlines', $r ); }
function whh_delete_airlines_item( $r ):       WP_REST_Response { return whh_lib_resp_delete( 'airlines', $r ); }

// Excursions
function whh_get_excursions( $r = null ):      WP_REST_Response { return new WP_REST_Response( array_values( whh_lib_all( 'excursions' ) ), 200 ); }
function whh_get_excursions_item( $r ):        WP_REST_Response { return whh_lib_resp_get( 'excursions', $r ); }
function whh_create_excursions( $r ):          WP_REST_Response { return whh_lib_resp_create( 'excursions', $r ); }
function whh_update_excursions_item( $r ):     WP_REST_Response { return whh_lib_resp_update( 'excursions', $r ); }
function whh_delete_excursions_item( $r ):     WP_REST_Response { return whh_lib_resp_delete( 'excursions', $r ); }

// ─── Meta Inspector ───────────────────────────────────────────────────────────
// Temporary diagnostic: returns all tourmaster-* meta for first 5 tours.
// Remove this endpoint once migration is complete.

function whh_meta_inspect(): WP_REST_Response {
    $posts = get_posts( [
        'post_type'      => 'tour',
        'posts_per_page' => 5,
        'post_status'    => [ 'publish', 'draft' ],
        'orderby'        => 'date',
        'order'          => 'DESC',
    ] );

    $result = [];
    foreach ( $posts as $p ) {
        $all_meta = get_post_meta( $p->ID );
        // Filter to only tourmaster-* and whh-* keys
        $filtered = [];
        foreach ( $all_meta as $key => $values ) {
            if ( str_starts_with( $key, 'tourmaster-' ) || str_starts_with( $key, 'whh-' ) ) {
                $val = $values[0] ?? '';
                // Try to unserialize
                $unserialized = @maybe_unserialize( $val );
                $filtered[ $key ] = $unserialized !== $val ? $unserialized : $val;
            }
        }
        $result[] = [
            'id'    => $p->ID,
            'title' => $p->post_title,
            'meta'  => $filtered,
        ];
    }

    return new WP_REST_Response( $result, 200 );
}

// ─── DISPLAY LAYER ────────────────────────────────────────────────────────────
// Shortcodes + single tour template override.
// No FTP needed — everything is injected via hooks.

add_action( 'wp_head',      'whh_print_styles' );
add_shortcode( 'whh_trips', 'whh_shortcode_trips' );
add_filter( 'the_content',  'whh_filter_tour_content' );

// ─── Styles ───────────────────────────────────────────────────────────────────

function whh_print_styles(): void {
    if ( ! is_singular( 'tour' ) && ! is_page() ) return;
    ?>
    <style id="whh-styles">
    /* ── Grid ── */
    .whh-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        margin: 32px 0;
    }
    @media (max-width: 1024px) { .whh-grid { grid-template-columns: repeat(2,1fr); } }
    @media (max-width: 600px)  { .whh-grid { grid-template-columns: 1fr; } }

    /* ── Card ── */
    .whh-card {
        background: #fff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 14px rgba(0,0,0,.08);
        transition: transform .22s ease, box-shadow .22s ease;
        text-decoration: none !important;
        color: inherit;
        display: flex;
        flex-direction: column;
    }
    .whh-card:hover { transform: translateY(-6px); box-shadow: 0 14px 36px rgba(0,0,0,.14); }

    .whh-card-img-wrap {
        position: relative;
        overflow: hidden;
        aspect-ratio: 4/3;
    }
    .whh-card-img {
        width: 100%; height: 100%;
        object-fit: cover;
        transition: transform .4s ease;
        display: block;
    }
    .whh-card:hover .whh-card-img { transform: scale(1.07); }
    .whh-card.completed .whh-card-img { filter: grayscale(80%); }

    /* Image placeholder when no photo set */
    .whh-card-img-placeholder {
        width: 100%; height: 100%;
        background: linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 100%);
        display: flex; align-items: center; justify-content: center;
        font-size: 40px; color: #bbb;
    }

    /* Completed badge — top-left of image */
    .whh-badge-completed {
        position: absolute; top: 12px; left: 12px;
        background: rgba(231,76,60,.9); color: #fff;
        padding: 4px 10px;
        font-size: 10px; font-weight: 800;
        letter-spacing: 1.2px; text-transform: uppercase;
        border-radius: 4px;
    }

    /* Nights badge — bottom-right of image */
    .whh-nights-badge {
        position: absolute; bottom: 12px; right: 12px;
        background: rgba(10,10,10,.70);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        color: #fff;
        padding: 5px 12px;
        font-size: 11px; font-weight: 800;
        letter-spacing: 1px; text-transform: uppercase;
        border-radius: 5px;
    }

    /* Card body */
    .whh-card-body {
        padding: 16px 18px 20px;
        display: flex; flex-direction: column; flex: 1;
    }
    .whh-card-number {
        font-size: 10px; font-weight: 800;
        color: #c9a227; letter-spacing: 1.2px;
        text-transform: uppercase; margin: 0 0 5px;
    }
    .whh-card-title {
        font-size: 15px; font-weight: 700;
        color: #1a1a1a; margin: 0 0 8px; line-height: 1.45;
    }
    .whh-card-date {
        font-size: 12px; color: #888;
        margin: 0 0 14px;
        display: flex; align-items: center; gap: 5px;
    }
    .whh-card-cta {
        margin-top: auto;
        font-size: 12px; font-weight: 700;
        color: #c9a227; letter-spacing: .4px;
        text-transform: uppercase;
    }
    .whh-card-cta::after { content: " →"; }

    /* ── Detail heading ── */
    .whh-detail-heading { margin-bottom: 24px; }
    .whh-detail-number {
        display: inline-block;
        font-size: 12px; font-weight: 800;
        color: #c9a227; letter-spacing: 1.4px;
        text-transform: uppercase; margin-bottom: 6px;
    }
    .whh-detail-title {
        font-size: 28px; font-weight: 800;
        color: #1a1a1a; margin: 0; line-height: 1.3;
    }

    /* ── Detail ── */
    .whh-detail { font-family: inherit; }
    .whh-detail-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 48px; margin-top: 28px;
    }
    @media (max-width: 900px) { .whh-detail-layout { grid-template-columns: 1fr; } }

    .whh-section { margin-bottom: 32px; }
    .whh-section h2 {
        font-size: 17px; font-weight: 800;
        color: #1a1a1a; margin-bottom: 14px;
        padding-bottom: 8px; border-bottom: 2px solid #f0f0f0;
        display: flex; align-items: center; gap: 8px;
    }
    .whh-row {
        display: flex; justify-content: space-between;
        padding: 10px 0; border-bottom: 1px solid #f4f4f4;
        font-size: 14px;
    }
    .whh-row strong { color: #1a1a1a; }
    .whh-row span   { color: #666; }
    .whh-lib-item {
        background: #f8f8f8; border-radius: 4px;
        padding: 11px 16px; margin-bottom: 8px;
        font-size: 14px; color: #333; line-height: 1.5;
    }
    .whh-lib-sub { color: #888; font-size: 12px; display: block; margin-top: 3px; }

    /* Sidebar */
    .whh-sidebar-box {
        background: #fff; border: 1px solid #e8e8e8;
        border-radius: 6px; padding: 24px; margin-bottom: 20px;
    }
    .whh-sidebar-date {
        font-size: 18px; font-weight: 700;
        color: #1a1a1a; text-align: center; margin-bottom: 18px;
    }
    .whh-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .whh-price-box {
        border: 1px solid #e8e8e8; border-radius: 6px;
        padding: 16px; text-align: center;
    }
    .whh-price-box .lbl   { font-size: 12px; color: #888; margin-bottom: 4px; }
    .whh-price-box .cur   { font-size: 13px; font-weight: 700; color: #2563eb; }
    .whh-price-box .amt   { font-size: 26px; font-weight: 900; color: #2563eb; line-height: 1.1; }

    .whh-contact-btn {
        display: block; width: 100%; padding: 14px;
        text-align: center; background: #c9a227; color: #fff !important;
        font-weight: 700; font-size: 13px; letter-spacing: 1px;
        text-transform: uppercase; border-radius: 4px;
        text-decoration: none; transition: background .2s;
    }
    .whh-contact-btn:hover { background: #a8861f; }

    .whh-why-box { background: #f8f8f8; border-radius: 6px; padding: 20px; }
    .whh-why-box h4 { font-size: 14px; font-weight: 700; margin: 0 0 12px; }
    .whh-why-box ul { list-style: none; padding: 0; margin: 0; }
    .whh-why-box li {
        font-size: 13px; color: #555;
        padding: 7px 0; border-bottom: 1px solid #e8e8e8;
    }
    .whh-why-box li::before { content: "$ "; color: #c9a227; font-weight: 800; }
    </style>
    <?php
}

// ─── Title cleaner ────────────────────────────────────────────────────────────

/**
 * Strips the Tour Master auto-generated prefix from old trip titles.
 *
 * Tour Master titles look like:  "WH-7132 – 59 – STRASBOURG LUXEMBOURG AMSTERDAM"
 * We want:                        "Strasbourg Luxembourg Amsterdam"
 *
 * Pattern stripped: WH-{digits} {dash} {digits} {dash}
 * Also strips trailing " SOLD" / " COMPLETED" suffixes.
 */
function whh_clean_title( string $raw ): string {
    // Strip Tour Master prefix: "WH-7132 – 59 –" (any dash/special char between numbers)
    // [^\w\s]+ matches en-dash, em-dash, hyphen, or any non-word non-space char
    $cleaned = preg_replace( '/^WH-\d+\s*[^\w\s]+\s*\d+\s*[^\w\s]+\s*/u', '', $raw );
    // Remove trailing status words (case-insensitive)
    $cleaned = preg_replace( '/\s+(SOLD\s*OUT|SOLD|COMPLETED|SOLDOUT)$/iu', '', $cleaned );
    // Title-case (handles multibyte/Arabic chars safely)
    return mb_convert_case( trim( $cleaned ), MB_CASE_TITLE, 'UTF-8' );
}

// ─── [whh_trips] Shortcode ────────────────────────────────────────────────────

function whh_shortcode_trips( array $atts ): string {
    $atts = shortcode_atts( [ 'limit' => 40 ], $atts );

    $posts = get_posts( [
        'post_type'      => 'tour',
        'posts_per_page' => (int) $atts['limit'],
        'post_status'    => 'publish',
        'orderby'        => 'date',
        'order'          => 'DESC',
    ] );

    if ( empty( $posts ) ) {
        return '<p style="text-align:center;color:#888;padding:48px 0;">No trips available at the moment.</p>';
    }

    ob_start();
    echo '<div class="whh-grid">';
    foreach ( $posts as $whh_post ) {
        $t     = whh_format_tour( $whh_post );
        // Mark as completed if: manually set, SOLD in title, or travel date has passed
        $done  = ( $t['availability'] === 'completed' )
              || ( ! empty( $t['travel_date'] ) && strtotime( $t['travel_date'] ) < time() );
        $cls   = 'whh-card' . ( $done ? ' completed' : '' );
        $url   = esc_url( get_permalink( (int) $t['id'] ) );
        $img   = esc_url( $t['featured_image'] );
        $title = esc_html( whh_clean_title( $t['title'] ) );

        // Badges overlaid on the image
        $done_badge   = $done ? '<span class="whh-badge-completed">Completed</span>' : '';
        $nights_badge = ( $t['duration_nights'] > 0 )
            ? '<span class="whh-nights-badge">' . (int) $t['duration_nights'] . ' Nights</span>'
            : '';

        // Image or emoji placeholder
        $img_html = $img
            ? "<img src='{$img}' alt='" . esc_attr( $t['title'] ) . "' class='whh-card-img' loading='lazy'>"
            : '<div class="whh-card-img-placeholder">🌍</div>';

        // Travel date range (no price)
        $date_str = '';
        if ( ! empty( $t['travel_date'] ) ) {
            $s = date_i18n( 'j M', strtotime( $t['travel_date'] ) );
            $e = ! empty( $t['end_date'] )
                ? ' – ' . date_i18n( 'j M Y', strtotime( $t['end_date'] ) )
                : '';
            $date_str = esc_html( $s . $e );
        }

        echo "
        <a href='{$url}' class='{$cls}'>
            <div class='whh-card-img-wrap'>
                {$img_html}
                {$done_badge}
                {$nights_badge}
            </div>
            <div class='whh-card-body'>
                <p class='whh-card-number'>" . esc_html( $t['trip_number'] ) . "</p>
                <h3 class='whh-card-title'>{$title}</h3>"
                . ( $date_str ? "<p class='whh-card-date'>🗓 {$date_str}</p>" : '' ) .
                "<div class='whh-card-cta'>View Details</div>
            </div>
        </a>";
    }
    echo '</div>';
    return ob_get_clean();
}

// ─── Single Tour Detail ───────────────────────────────────────────────────────

function whh_filter_tour_content( string $content ): string {
    if ( ! is_singular( 'tour' ) || ! in_the_loop() || ! is_main_query() ) return $content;
    global $post;
    return whh_render_detail( whh_format_tour( $post ) );
}

function whh_render_detail( array $t ): string {
    // Resolve library items from stored IDs
    $hotels     = array_values( array_filter( array_map( fn($id) => whh_lib_get_item('hotels',     $id), $t['hotel_ids']     ) ) );
    $airlines   = array_values( array_filter( array_map( fn($id) => whh_lib_get_item('airlines',   $id), $t['airline_ids']   ) ) );
    $cities     = array_values( array_filter( array_map( fn($id) => whh_lib_get_item('cities',     $id), $t['city_ids']      ) ) );
    $excursions = array_values( array_filter( array_map( fn($id) => whh_lib_get_item('excursions', $id), $t['excursion_ids'] ) ) );

    // Packages linked to this trip
    $packages = array_values( array_filter(
        whh_lib_all('packages'),
        fn($p) => (string)($p['trip_id'] ?? '') === $t['id']
    ));

    // Sidebar date
    $date_label = '';
    if ( ! empty( $t['travel_date'] ) ) {
        $s = date_i18n( 'F j, Y', strtotime( $t['travel_date'] ) );
        $e = ! empty( $t['end_date'] ) ? ' – ' . date_i18n( 'F j, Y', strtotime( $t['end_date'] ) ) : '';
        $date_label = $s . $e;
    }

    $adult = $t['price_adult'] ? number_format( (float)$t['price_adult'] ) : '—';
    $child = $t['price_child'] ? number_format( (float)$t['price_child'] ) : '—';
    $dur   = $t['duration_days'] ? $t['duration_days'] . 'D / ' . $t['duration_nights'] . 'N' : '';

    // Try to find a contact page, fallback to mailto
    $contact_page = get_page_by_path('contact');
    $contact_url  = $contact_page ? esc_url( get_permalink( $contact_page->ID ) ) : 'mailto:info@whholidays.com';

    ob_start(); ?>
    <div class="whh-detail">

        <!-- ── Trip heading (number + clean title) ── -->
        <div class="whh-detail-heading">
            <span class="whh-detail-number"><?php echo esc_html( $t['trip_number'] ); ?></span>
            <h1 class="whh-detail-title"><?php echo esc_html( whh_clean_title( $t['title'] ) ); ?></h1>
        </div>

        <div class="whh-detail-layout">

            <!-- ── Main ── -->
            <div>

                <?php if ( $t['description'] ): ?>
                <div class="whh-section">
                    <p style="color:#555;line-height:1.8;"><?php echo esc_html( $t['description'] ); ?></p>
                </div>
                <?php endif; ?>

                <?php if ( $dur || $t['destination'] ): ?>
                <div class="whh-section">
                    <h2>📋 Trip Info</h2>
                    <?php if ( $t['destination'] ): ?>
                    <div class="whh-row"><strong>Destination</strong><span><?php echo esc_html( $t['destination'] ); ?></span></div>
                    <?php endif; ?>
                    <?php if ( $dur ): ?>
                    <div class="whh-row"><strong>Duration</strong><span><?php echo esc_html( $dur ); ?></span></div>
                    <?php endif; ?>
                    <?php if ( $t['travel_date'] ): ?>
                    <div class="whh-row"><strong>Travel Date</strong><span><?php echo esc_html( $date_label ); ?></span></div>
                    <?php endif; ?>
                </div>
                <?php endif; ?>

                <?php if ( ! empty( $cities ) ): ?>
                <div class="whh-section">
                    <h2>🌍 Destinations</h2>
                    <?php foreach ( $cities as $i => $c ): ?>
                    <div class="whh-row">
                        <strong>Destination <?php echo $i + 1; ?></strong>
                        <span><?php echo esc_html( $c['name'] . ', ' . $c['country'] ); ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <?php if ( ! empty( $hotels ) ): ?>
                <div class="whh-section">
                    <h2>🏨 Hotels</h2>
                    <?php foreach ( $hotels as $i => $h ): ?>
                    <div class="whh-lib-item">
                        <strong>Hotel <?php echo $i + 1; ?> &nbsp; <?php echo esc_html( $h['name'] ); ?></strong>
                        <?php if ( ! empty( $h['stars'] ) ): ?><span class="whh-lib-sub"><?php echo str_repeat('★', (int)$h['stars']); ?> Stars</span><?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <?php if ( ! empty( $airlines ) ): ?>
                <div class="whh-section">
                    <h2>✈️ Airlines</h2>
                    <?php foreach ( $airlines as $a ): ?>
                    <div class="whh-lib-item">
                        <strong><?php echo esc_html( $a['name'] ); ?></strong>
                        <?php if ( ! empty( $a['baggage_allowance'] ) ): ?><span class="whh-lib-sub">Baggage allowance: <?php echo esc_html( $a['baggage_allowance'] ); ?></span><?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <?php if ( ! empty( $excursions ) ): ?>
                <div class="whh-section">
                    <h2>🎯 Excursions</h2>
                    <?php foreach ( $excursions as $ex ): ?>
                    <div class="whh-lib-item">
                        <strong><?php echo esc_html( $ex['name'] ); ?></strong>
                        <?php if ( ! empty( $ex['description'] ) ): ?><span class="whh-lib-sub"><?php echo esc_html( $ex['description'] ); ?></span><?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <?php if ( ! empty( $packages ) ): ?>
                <div class="whh-section">
                    <h2>📦 Available Packages</h2>
                    <?php foreach ( $packages as $pk ): ?>
                    <div class="whh-lib-item">
                        <strong><?php echo esc_html( $pk['name'] ); ?></strong> &mdash; EGP <?php echo number_format( (float)$pk['price'] ); ?>
                        <?php if ( ! empty( $pk['inclusions'] ) ): ?><span class="whh-lib-sub"><?php echo esc_html( $pk['inclusions'] ); ?></span><?php endif; ?>
                        <?php if ( ! empty( $pk['max_people'] ) ): ?><span class="whh-lib-sub">Max <?php echo (int)$pk['max_people']; ?> people</span><?php endif; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

            </div>

            <!-- ── Sidebar ── -->
            <div>
                <div class="whh-sidebar-box">
                    <?php if ( $date_label ): ?>
                    <div class="whh-sidebar-date"><?php echo esc_html( $date_label ); ?></div>
                    <?php endif; ?>

                    <div class="whh-price-grid">
                        <div class="whh-price-box">
                            <div class="lbl">Adult Price</div>
                            <div class="cur">EGP</div>
                            <div class="amt"><?php echo $adult; ?></div>
                        </div>
                        <div class="whh-price-box">
                            <div class="lbl">Child Price</div>
                            <div class="cur">EGP</div>
                            <div class="amt"><?php echo $child; ?></div>
                        </div>
                    </div>

                    <a href="<?php echo $contact_url; ?>" class="whh-contact-btn">
                        Contact Us to Book
                    </a>
                </div>

                <div class="whh-why-box">
                    <h4>Why Book With Us?</h4>
                    <ul>
                        <li>No-hassle best price guarantee</li>
                        <li>Customer care available 24/7</li>
                        <li>Hand-picked trips &amp; hotels</li>
                        <li>Personalised service, free of charge</li>
                    </ul>
                </div>
            </div>

        </div>
    </div>
    <?php
    return ob_get_clean();
}
