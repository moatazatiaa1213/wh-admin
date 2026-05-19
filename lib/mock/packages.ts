import { Package } from '@/lib/types'

export const mockPackages: Package[] = [
  { id: 'pkg-1', name: 'Hunza Standard', price: 1200, trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', inclusions: 'Hotel accommodation, breakfast & dinner, transport, guide', max_people: 10, created_at: '2026-01-15T10:00:00Z' },
  { id: 'pkg-2', name: 'Hunza Premium', price: 1800, trip_id: 'trip-1', trip_title: 'Hunza Valley Explorer', inclusions: 'Luxury hotel, all meals, private transport, professional guide, photography', max_people: 6, created_at: '2026-01-15T10:00:00Z' },
  { id: 'pkg-3', name: 'Swat Standard', price: 890, trip_id: 'trip-2', trip_title: 'Swat Valley Serenity', inclusions: 'Hotel, breakfast, transport, guide', max_people: 12, created_at: '2026-01-20T10:00:00Z' },
  { id: 'pkg-4', name: 'Skardu Adventure', price: 2100, trip_id: 'trip-3', trip_title: 'Skardu Expedition', inclusions: 'All accommodation, all meals, jeep transport, trekking equipment, guide', max_people: 8, created_at: '2026-02-01T10:00:00Z' },
  { id: 'pkg-5', name: 'Fairy Meadows Trek', price: 750, trip_id: 'trip-4', trip_title: 'Fairy Meadows Trek', inclusions: 'Camping equipment, meals, guide, jeep to trailhead', max_people: 10, created_at: '2026-02-10T10:00:00Z' },
]
