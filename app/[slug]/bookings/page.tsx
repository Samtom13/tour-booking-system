import { createClient } from '@/lib/supabase/server'
import { ClientBookingForm } from '@/components/client-booking-form'
import { Badge } from '@/components/ui/badge'
import { formatJST, jstMonthRange, jstMonthLabel } from '@/lib/datetime'

export default async function ClientBookingsPage({
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

  const clientId = client?.id

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', clientId)
    .order('scheduled_at', { ascending: false })

  // OTA別サマリー（当月・JST基準）
  const { start: monthStart, end: monthEnd } = jstMonthRange()

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

  const currentMonth = jstMonthLabel()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">{currentMonth} OTA別売上</h2>
        {Object.keys(otaSummary).length === 0 ? (
          <p className="text-sm text-gray-400">今月の予約はありません</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(otaSummary).map(([site, data]) => (
              <div key={site} className="bg-white rounded-lg p-4 shadow-sm border">
                <p className="text-xs text-gray-500 mb-1">{site}</p>
                <p className="text-lg font-bold">¥{data.revenue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{data.count}件</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">全予約</h2>
          <ClientBookingForm clientId={clientId} />
        </div>
        <div className="space-y-2">
          {bookings?.map((b) => (
            <div key={b.id} className="bg-white rounded-lg p-4 shadow-sm border flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{b.guest_name}</span>
                  <span className="text-sm text-gray-500">{b.guest_count}名</span>
                  {b.booking_site && <Badge variant="outline" className="text-xs">{b.booking_site}</Badge>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatJST(b.scheduled_at, 'M/d (E) HH:mm')}
                </p>
              </div>
              {b.revenue != null && (
                <span className="text-sm font-semibold">¥{b.revenue.toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
