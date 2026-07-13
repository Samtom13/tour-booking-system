'use client'

import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClientBookingForm } from '@/components/client-booking-form'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatJST } from '@/lib/datetime'
import { siteColor, summarizeRevenue } from '@/lib/revenue'
import type { Booking } from '@/lib/types'

type Props = {
  clientId: string
  commissionRate: number
  bookings: Booking[]
}

export function ClientCalendarClient({ clientId, commissionRate, bookings }: Props) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selected, setSelected] = useState<Booking | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const events = bookings.map((b) => ({
    id: b.id,
    title: `${b.guest_name} ${b.guest_count}名${b.booking_site ? ` / ${b.booking_site}` : ''}`,
    start: b.scheduled_at,
    backgroundColor: siteColor(b.booking_site),
    borderColor: siteColor(b.booking_site),
    extendedProps: { booking: b },
  }))

  const monthBookings = bookings.filter((b) => {
    const d = new Date(b.scheduled_at)
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth)
  })

  const summary = summarizeRevenue(monthBookings, commissionRate)

  function handleEventClick(info: EventClickArg) {
    setSelected(info.event.extendedProps.booking as Booking)
    setDetailOpen(true)
  }

  function handleDatesSet(arg: { view: { currentStart: Date } }) {
    setCurrentMonth(new Date(arg.view.currentStart.getFullYear(), arg.view.currentStart.getMonth(), 1))
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm('この予約を削除しますか？')) return
    const supabase = createClient()
    await supabase.from('bookings').delete().eq('id', selected.id)
    setDetailOpen(false)
    setSelected(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* カレンダー */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Klook</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Viator</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />GYG</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />その他</span>
          </div>
          <ClientBookingForm clientId={clientId} />
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ja"
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          headerToolbar={{ left: 'prev', center: 'title', right: 'next today' }}
          height="auto"
          eventDisplay="block"
          eventClassNames="cursor-pointer text-xs"
          dayMaxEvents={false}
        />
      </div>

      {/* 月次サマリー */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          {format(currentMonth, 'yyyy年M月', { locale: ja })} 売上サマリー
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">売上合計</p>
            <p className="text-lg font-bold">¥{summary.total.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">Bond取り分（{commissionRate}%）</p>
            <p className="text-lg font-bold text-blue-600">¥{summary.bondShare.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">クライアント支払い分</p>
            <p className="text-lg font-bold text-green-600">¥{summary.clientShare.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">予約件数</p>
            <p className="text-lg font-bold">{summary.count}件</p>
          </div>
        </div>

        {/* サイト別売上 */}
        {summary.bySite.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {summary.bySite.map((s) => (
              <div key={s.site} className="bg-white rounded-lg p-3 shadow-sm border flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: siteColor(s.site) }} />
                <div>
                  <p className="text-xs text-gray-500">{s.site}</p>
                  <p className="font-bold text-sm">¥{s.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{s.count}件</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 予約詳細ダイアログ */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約詳細</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">日時</span>
                <span>{formatJST(selected.scheduled_at, 'M/d (E) HH:mm')}</span>
                <span className="text-gray-500">ゲスト名</span>
                <span>{selected.guest_name}</span>
                <span className="text-gray-500">人数</span>
                <span>{selected.guest_count}名</span>
                {selected.booking_site && (
                  <>
                    <span className="text-gray-500">予約サイト</span>
                    <Badge variant="outline">{selected.booking_site}</Badge>
                  </>
                )}
                {selected.revenue != null && (
                  <>
                    <span className="text-gray-500">売上</span>
                    <span>¥{selected.revenue.toLocaleString()}</span>
                  </>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-1" />削除
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
