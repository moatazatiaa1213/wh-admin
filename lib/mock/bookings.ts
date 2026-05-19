import { Booking } from '@/lib/types'

export const mockBookings: Booking[] = [
  { id: 'bk-001', customer_name: 'Sara Ahmed', customer_email: 'sara@example.com', trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', booking_date: '2026-05-10T09:00:00Z', status: 'confirmed', amount: 1200, notes: 'Vegetarian meals required.' },
  { id: 'bk-002', customer_name: 'Tariq Khan', customer_email: 'tariq@example.com', trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', booking_date: '2026-05-12T11:00:00Z', status: 'pending', amount: 890 },
  { id: 'bk-003', customer_name: 'Nadia Iqbal', customer_email: 'nadia@example.com', trip_id: 'trip-3', trip_title: 'Skardu Expedition', booking_date: '2026-05-08T14:00:00Z', status: 'cancelled', amount: 2100, notes: 'Cancelled due to medical emergency.' },
  { id: 'bk-004', customer_name: 'Ali Raza', customer_email: 'ali@example.com', trip_id: 'trip-4', trip_title: 'Fairy Meadows Trek', booking_date: '2026-05-14T10:00:00Z', status: 'confirmed', amount: 750 },
  { id: 'bk-005', customer_name: 'Fatima Malik', customer_email: 'fatima@example.com', trip_id: 'trip-6', trip_title: 'Neelum Valley Retreat', booking_date: '2026-05-15T09:30:00Z', status: 'confirmed', amount: 1050 },
  { id: 'bk-006', customer_name: 'Usman Baig', customer_email: 'usman@example.com', trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', booking_date: '2026-05-16T11:00:00Z', status: 'pending', amount: 1200 },
  { id: 'bk-007', customer_name: 'Hina Shah', customer_email: 'hina@example.com', trip_id: 'trip-8', trip_title: 'Lahore Heritage Walk', booking_date: '2026-05-17T10:00:00Z', status: 'confirmed', amount: 450 },
  { id: 'bk-008', customer_name: 'Bilal Chaudhry', customer_email: 'bilal@example.com', trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', booking_date: '2026-05-18T14:00:00Z', status: 'pending', amount: 890 },
]
