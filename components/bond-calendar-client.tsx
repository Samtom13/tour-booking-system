'use client'

import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { formatJST } from '@/lib/datetime'
import { ja } from 'date-fns/locale'

import { Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BondBookingForm } from '@/components/bond-booking-form'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Booking, Tour, Guide } from '@/lib/types'

type Props = {
  clientId: string
  bookings: Booking[]
  tours: Tour[]
  guides: Guide[]
}

function getEventColor(bookingSite: string | null): string {
  const site = (bookingSite ?? '').toLowerCase()
  if (site.includes('klook')) return '#3B82F6'
  if (site.includes('viator')) return '#22C55E'
  if (site.includes('getyourguide') || site.includes('gyg')) return '#F97316'
  return '#6B7280'
}

export function BondCalendarClient({ clientId, bookings, tours, guides }: Props) {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selected, setSelected] = useState<Booking | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [salaryData, setSalaryData] = useState<{ baseWageTotal: number; expensesTotal: number; snsTotal: number } | null>(null)
  const [salaryLoading, setSalaryLoading] = useState(false)

  const events = bookings.map((b) => ({
    id: b.id,
    title: `${b.tour?.name ?? 'ツアー'} / ${b.guest_name} ${b.guest_count}名${b.guide?.name ? ` / ${b.guide.name}` : ''}`,
    start: b.scheduled_at,
    backgroundColor: getEventColor(b.booking_site),
    borderColor: getEventColor(b.booking_site),
    extendedProps: { booking: b },
  }))

  // 表示中の月の予約
  const monthBookings = bookings.filter((b) => {
    const d = new Date(b.scheduled_at)
    return d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth)
  })

  // OTA別集計
  const otaSummary = monthBookings.reduce<Record<string, { count: number; revenue: number }>>((acc, b) => {
    const site = b.booking_site ?? 'その他'
    if (!acc[site]) acc[site] = { count: 0, revenue: 0 }
    acc[site].count++
    acc[site].revenue += b.revenue ?? 0
    return acc
  }, {})

  const totalRevenue = monthBookings.reduce((s, b) => s + (b.revenue ?? 0), 0)

  // 給与データ取得（月変更時）
  async function fetchSalary(month: Date) {
    setSalaryLoading(true)
    try {
      const monthKey = format(month, 'yyyy-MM')
      const res = await fetch(`/api/salary?month=${monthKey}`)
      const data = await res.json()
      if (data.guides) {
        const baseWageTotal = data.guides.reduce((s: number, g: { baseWageTotal: number }) => s + g.baseWageTotal, 0)
        const expensesTotal = data.guides.reduce((s: number, g: { expensesTotal: number }) => s + g.expensesTotal, 0)
        const snsTotal = data.snsTeam?.total ?? 0
        setSalaryData({ baseWageTotal, expensesTotal, snsTotal })
      }
    } catch {
      setSalaryData(null)
    }
    setSalaryLoading(false)
  }

  function handleEventClick(info: EventClickArg) {
    setSelected(info.event.extendedProps.booking as Booking)
    setDetailOpen(true)
  }

  function handleDatesSet(arg: { view: { currentStart: Date } }) {
    const newMonth = new Date(arg.view.currentStart.getFullYear(), arg.view.currentStart.getMonth(), 1)
    setCurrentMonth(newMonth)
    fetchSalary(newMonth)
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

  const totalLaborCost = salaryData ? salaryData.baseWageTotal + salaryData.expensesTotal : null
  const snsTotal = salaryData?.snsTotal ?? 0
  // 粗利 = 売上 − 人件費（ガイド報酬＋経費）− SNSチーム報酬
  const grossProfit = totalLaborCost != null ? totalRevenue - totalLaborCost - snsTotal : null

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
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />予約を追加
          </Button>
        </div>
        <FullCalendar
          ref={calendarRef}
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
          {format(currentMonth, 'yyyy年M月', { locale: ja })} サマリー
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">売上合計</p>
            <p className="text-lg font-bold">¥{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">人件費合計</p>
            {salaryLoading ? (
              <p className="text-sm text-gray-300">計算中...</p>
            ) : totalLaborCost != null ? (
              <p className="text-lg font-bold">¥{totalLaborCost.toLocaleString()}</p>
            ) : (
              <p className="text-sm text-gray-300">—</p>
            )}
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">SNSチーム</p>
            {salaryLoading ? (
              <p className="text-sm text-gray-300">計算中...</p>
            ) : salaryData != null ? (
              <p className="text-lg font-bold text-purple-600">¥{snsTotal.toLocaleString()}</p>
            ) : (
              <p className="text-sm text-gray-300">—</p>
            )}
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">粗利</p>
            {grossProfit != null ? (
              <p className={`text-lg font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                ¥{grossProfit.toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-gray-300">—</p>
            )}
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">予約件数</p>
            <p className="text-lg font-bold">{monthBookings.length}件</p>
          </div>
        </div>

        {/* OTA別 */}
        {Object.keys(otaSummary).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(otaSummary).map(([site, data]) => (
              <div key={site} className="bg-white rounded-lg p-3 shadow-sm border flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getEventColor(site) }}
                />
                <div>
                  <p className="text-xs text-gray-500">{site}</p>
                  <p className="font-bold text-sm">¥{data.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{data.count}件</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 予約追加ダイアログ */}
      <BondBookingForm
        clientId={clientId}
        tours={tours}
        guides={guides}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {/* 予約編集ダイアログ */}
      <BondBookingForm
        clientId={clientId}
        tours={tours}
        guides={guides}
        editBooking={selected}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

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
                {selected.tour && (
                  <>
                    <span className="text-gray-500">ツアー</span>
                    <span>{selected.tour.name}</span>
                  </>
                )}
                {selected.guide && (
                  <>
                    <span className="text-gray-500">担当ガイド</span>
                    <span>{selected.guide.name}</span>
                  </>
                )}
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); setEditOpen(true) }}>
                  <Pencil className="w-4 h-4 mr-1" />編集
                </Button>
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
