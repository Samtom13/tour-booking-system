'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatJST } from '@/lib/datetime'
import { Pencil, Trash2 } from 'lucide-react'
import { BondBookingForm } from '@/components/bond-booking-form'
import type { Booking, Tour, Guide } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
  clientId: string
  bookings: Booking[]
  tours: Tour[]
  guides: Guide[]
  otaSummary: Record<string, { count: number; revenue: number }>
  currentMonth: string
}

export function BondBookingsClient({ clientId, bookings, tours, guides, otaSummary, currentMonth }: Props) {
  const router = useRouter()
  const [editBooking, setEditBooking] = useState<Booking | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  function handleEdit(b: Booking) {
    setEditBooking(b)
    setEditOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('この予約を削除しますか？')) return
    const supabase = createClient()
    await supabase.from('bookings').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* OTA別サマリー */}
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

      {/* 予約一覧 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">全予約</h2>
          <BondBookingForm clientId={clientId} tours={tours} guides={guides} />
        </div>

        {/* 編集ダイアログ */}
        <BondBookingForm
          clientId={clientId}
          tours={tours}
          guides={guides}
          editBooking={editBooking}
          open={editOpen}
          onOpenChange={setEditOpen}
        />

        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white rounded-lg p-4 shadow-sm border flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{b.tour?.name ?? '—'}</span>
                  {b.booking_site && <Badge variant="outline" className="text-xs">{b.booking_site}</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatJST(b.scheduled_at, 'M/d (E) HH:mm')}
                  　{b.guest_name}　{b.guest_count}名
                  {b.guide?.name && `　担当：${b.guide.name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.revenue != null && (
                  <span className="text-sm font-semibold">¥{b.revenue.toLocaleString()}</span>
                )}
                <button onClick={() => handleEdit(b)} className="text-gray-300 hover:text-blue-400 transition-colors p-1">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(b.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
