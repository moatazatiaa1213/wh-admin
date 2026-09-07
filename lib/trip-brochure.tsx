/**
 * lib/trip-brochure.tsx
 * @react-pdf/renderer document for WHHolidays trip brochures.
 */

import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer'
import type { Trip, City, Hotel, Airline, Excursion } from '@/lib/types'

// ─── Colours ─────────────────────────────────────────────────────────────────

const C = {
  green:      '#2e7d32',
  greenDark:  '#1b5e20',
  greenLight: '#e8f5e9',
  greenBorder:'#a5d6a7',
  blue:       '#1565c0',
  blueLight:  '#e3f2fd',
  text:       '#212121',
  muted:      '#616161',
  white:      '#ffffff',
  offWhite:   '#fafafa',
  border:     '#e0e0e0',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
  },

  // ── Header
  header: {
    backgroundColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
  },
  logo: { width: 42, height: 42, borderRadius: 6 },
  headerTextWrap: { flex: 1 },
  brandName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: C.white,
    letterSpacing: 0.5,
  },
  brandSub: { fontSize: 8.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBadgeText: { color: C.white, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // ── Hero image
  heroImage: { width: '100%', height: 185 },
  heroPlaceholder: { width: '100%', height: 80, backgroundColor: C.greenLight },

  // ── Content wrapper
  body: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 60 },

  // ── Title block
  tripTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 21,
    color: C.text,
    marginBottom: 3,
    lineHeight: 1.25,
  },
  destination: { fontSize: 11, color: C.blue, marginBottom: 16 },

  // ── Info chips row
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: {
    flex: 1,
    backgroundColor: C.greenLight,
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipLabel: { fontSize: 7.5, color: C.muted, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  chipValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.green },
  chipValueSmall: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.green },

  // ── Section heading
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 5,
    marginBottom: 10,
    marginTop: 4,
  },

  // ── Pricing grid
  pricingGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priceBox: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  priceBoxHighlight: {
    flex: 1,
    backgroundColor: C.greenLight,
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  priceLabel: { fontSize: 7.5, color: C.muted, marginBottom: 4 },
  priceValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.green },
  priceValueSmall: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.text },

  // ── Description
  description: {
    fontSize: 10,
    color: C.text,
    lineHeight: 1.65,
    marginBottom: 18,
  },

  // ── Detail rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  detailLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: C.muted,
    width: 68,
  },
  detailValue: { fontSize: 10, color: C.text, flex: 1, lineHeight: 1.4 },

  // ── Divider
  divider: { borderTopWidth: 1, borderTopColor: C.border, marginVertical: 14 },

  // ── Footer (absolute, sits at page bottom)
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.greenDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  footerText: { color: 'rgba(255,255,255,0.80)', fontSize: 8.5 },
  footerBold: {
    color: C.white,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v ? `$${Number(v).toLocaleString()}` : '—'
}

// ─── Document component ───────────────────────────────────────────────────────

export interface BrochureData {
  trip:       Trip
  cities:     City[]
  hotels:     Hotel[]
  airlines:   Airline[]
  excursions: Excursion[]
  logoBase64?: string   // data URI  e.g.  data:image/png;base64,...
}

export function TripBrochure({
  trip, cities, hotels, airlines, excursions, logoBase64,
}: BrochureData) {
  const hasImage   = !!trip.featured_image
  const hasCities  = cities.length > 0
  const hasHotels  = hotels.length > 0
  const hasAir     = airlines.length > 0
  const hasExcur   = excursions.length > 0
  const hasDetails = hasCities || hasHotels || hasAir || hasExcur

  return (
    <Document title={trip.title} author="WHHolidays" subject="Trip Brochure">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoBase64 && <Image src={logoBase64} style={s.logo} />}
          <View style={s.headerTextWrap}>
            <Text style={s.brandName}>WHHolidays</Text>
            <Text style={s.brandSub}>Your Gateway to the World</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>TRIP BROCHURE</Text>
          </View>
        </View>

        {/* ── Hero image ── */}
        {hasImage
          /* eslint-disable-next-line jsx-a11y/alt-text */
          ? <Image src={trip.featured_image!} style={s.heroImage} />
          : <View style={s.heroPlaceholder} />
        }

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Title + destination */}
          <Text style={s.tripTitle}>{trip.title}</Text>
          <Text style={s.destination}>{trip.destination}</Text>

          {/* Date / duration chips */}
          <View style={s.chipsRow}>
            <View style={s.chip}>
              <Text style={s.chipLabel}>TRAVEL DATE</Text>
              <Text style={s.chipValue}>{trip.travel_date || '—'}</Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipLabel}>RETURN DATE</Text>
              <Text style={s.chipValue}>{trip.end_date || '—'}</Text>
            </View>
            <View style={s.chip}>
              <Text style={s.chipLabel}>DURATION</Text>
              <Text style={s.chipValueSmall}>
                {trip.duration_days} Days / {trip.duration_nights} Nights
              </Text>
            </View>
          </View>

          {/* ── Pricing ── */}
          <Text style={s.sectionHeading}>Pricing</Text>
          <View style={s.pricingGrid}>
            <View style={s.priceBoxHighlight}>
              <Text style={s.priceLabel}>Adult Price</Text>
              <Text style={s.priceValue}>{fmt(trip.price_adult)}</Text>
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceLabel}>Child Price</Text>
              <Text style={s.priceValueSmall}>{fmt(trip.price_child)}</Text>
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceLabel}>Deposit</Text>
              <Text style={s.priceValueSmall}>{fmt(trip.deposit)}</Text>
            </View>
            <View style={s.priceBox}>
              <Text style={s.priceLabel}>Single Rate</Text>
              <Text style={s.priceValueSmall}>{fmt(trip.single_rate)}</Text>
            </View>
          </View>

          {/* ── Description ── */}
          {trip.description && (
            <>
              <Text style={s.sectionHeading}>About This Trip</Text>
              <Text style={s.description}>
                {trip.description.length > 600
                  ? trip.description.slice(0, 600) + '…'
                  : trip.description}
              </Text>
            </>
          )}

          {/* ── Details ── */}
          {hasDetails && (
            <>
              <Text style={s.sectionHeading}>Trip Details</Text>
              {hasCities && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Cities</Text>
                  <Text style={s.detailValue}>{cities.map(c => c.name).join(' · ')}</Text>
                </View>
              )}
              {hasHotels && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Hotels</Text>
                  <Text style={s.detailValue}>{hotels.map(h => `${h.name} (${'★'.repeat(h.stars)})`).join(' · ')}</Text>
                </View>
              )}
              {hasAir && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Airlines</Text>
                  <Text style={s.detailValue}>{airlines.map(a => a.name).join(' · ')}</Text>
                </View>
              )}
              {hasExcur && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Excursions</Text>
                  <Text style={s.detailValue}>{excursions.map(e => e.name).join(' · ')}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerBold}>www.whholidays.com</Text>
          <Text style={s.footerText}>WHHolidays — Your Gateway to the World</Text>
          <Text style={s.footerText}>
            Generated {new Date().toLocaleDateString('en-GB')}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
