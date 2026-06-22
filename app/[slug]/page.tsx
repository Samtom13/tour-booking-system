import { createClient } from '@/lib/supabase/server'
import { BookingCalendar } from '@/components/booking-calendar'

export default async function ClientCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', slug)
    .single()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', client?.id)
    .order('scheduled_at')

  return <BookingCalendar bookings={bookings ?? []} />
}
