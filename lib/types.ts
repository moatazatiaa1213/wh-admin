export interface Trip {
  id: string
  title: string
  description: string
  destination: string
  price: number
  duration: number        // days
  featured_image?: string
  status: 'draft' | 'published'
  created_at: string
}

export type TripInput = Omit<Trip, 'id' | 'created_at'>

export interface Booking {
  id: string
  customer_name: string
  customer_email: string
  trip_id: string
  trip_title: string
  booking_date: string
  status: 'confirmed' | 'pending' | 'cancelled'
  amount: number
  notes?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  trip_id?: string
  trip_title?: string
  enquiry_date: string
}

export interface Package {
  id: string
  name: string
  price: number
  trip_id: string
  trip_title: string
  inclusions: string
  max_people: number
  created_at: string
}

export type PackageInput = Omit<Package, 'id' | 'created_at' | 'trip_title'>
