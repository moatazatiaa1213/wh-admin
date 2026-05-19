<?php
/**
 * Plugin Name: WHHolidays Admin API
 * Description: Custom REST API endpoints for WHHolidays Admin Dashboard. Bridges Tour Master data to the Next.js admin panel.
 * Version:     1.0.0
 * Author:      WHHolidays
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'WHH_NS', 'whholidays/v1' );

// ─── Register all routes ──────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {

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
