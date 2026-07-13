import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientSalesView } from '@/components/client-sales-view'
import { summarizeRevenue } from '@/lib/revenue'
import { toJST } from '@/lib/datetime'
import type { Booking } from '@/lib/types'

export default async function ClientSalesPage({
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

  const commissionRate = client.commission_rate ?? 0

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', client.id)
    .order('scheduled_at', { ascending: false })

  // JST基準で月ごとにグループ化
  const byMonth: Record<string, Booking[]> = {}
  for (const b of bookings ?? []) {
    const d = toJST(b.scheduled_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(b)
  }

  const months = Object.keys(byMonth)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => {
      const [y, m] = key.split('-')
      const summary = summarizeRevenue(byMonth[key], commissionRate)
      return {
        key,
        label: `${y}年${parseInt(m)}月`,
        total: summary.total,
        bondShare: summary.bondShare,
        clientShare: summary.clientShare,
        count: summary.count,
        bySite: summary.bySite,
      }
    })

  return <ClientSalesView months={months} commissionRate={commissionRate} />
}
