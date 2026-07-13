import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientCalendarClient } from '@/components/client-calendar-client'

export default async function ClientCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, commission_rate')
    .eq('slug', slug)
    .single()

  if (!client) notFound()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', client.id)
    .order('scheduled_at')

  return (
    <ClientCalendarClient
      clientId={client.id}
      commissionRate={client.commission_rate ?? 0}
      bookings={bookings ?? []}
    />
  )
}
