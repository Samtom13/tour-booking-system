import { createClient } from '@/lib/supabase/server'
import { BondCalendarClient } from '@/components/bond-calendar-client'

export default async function BondCalendarPage() {
  const supabase = await createClient()

  const { data: bondClient } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', 'bond')
    .single()

  const clientId = bondClient?.id

  const [{ data: bookings }, { data: tours }, { data: guides }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, tour:tours(*), guide:guides(*)')
      .eq('client_id', clientId)
      .order('scheduled_at'),
    supabase.from('tours').select('*').eq('client_id', clientId).order('name'),
    supabase.from('guides').select('*').eq('client_id', clientId).order('name'),
  ])

  return (
    <BondCalendarClient
      clientId={clientId}
      bookings={bookings ?? []}
      tours={tours ?? []}
      guides={guides ?? []}
    />
  )
}
