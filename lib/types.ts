export type Client = {
  id: string
  name: string
  slug: string
  is_bond: boolean
  created_at: string
}

export type Guide = {
  id: string
  client_id: string
  name: string
  hourly_rate: number
  bank_info: string | null
  created_at: string
}

export type Tour = {
  id: string
  client_id: string
  name: string
  standard_hours: number
  created_at: string
}

export type Booking = {
  id: string
  client_id: string
  tour_id: string | null
  guide_id: string | null
  scheduled_at: string
  guest_name: string
  guest_count: number
  booking_site: string | null
  revenue: number | null
  custom_hours: number | null
  created_at: string
  tour?: Tour
  guide?: Guide
}
