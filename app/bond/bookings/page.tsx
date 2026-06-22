import { createClient } from '@/lib/supabase/server'
import { BondBookingsClient } from '@/components/bond-bookings-client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function BondBookingsPage() {
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
      .order('scheduled_at', { ascending: false }),
    supabase.from('tours').select('*').eq('client_id', clientId).order('name'),
    supabase.from('guides').select('*').eq('client_id', clientId).order('name'),
  ])

  // OTA別売上サマリー（当月）
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const monthBookings = bookings?.filter(
    (b) => b.scheduled_at >= monthStart && b.scheduled_at <= monthEnd
  ) ?? []

  const otaSummary = monthBookings.reduce<Record<string, { count: number; revenue: number }>>(
    (acc, b) => {
      const site = b.booking_site ?? 'その他'
      if (!acc[site]) acc[site] = { count: 0, revenue: 0 }
      acc[site].count++
      acc[site].revenue += b.revenue ?? 0
      return acc
    },
    {}
  )

  const currentMonth = format(now, 'yyyy年M月', { locale: ja })

  return (
    <BondBookingsClient
      clientId={clientId}
      bookings={bookings ?? []}
      tours={tours ?? []}
      guides={guides ?? []}
      otaSummary={otaSummary}
      currentMonth={currentMonth}
    />
  )
}
