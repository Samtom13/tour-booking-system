'use client'

import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatJST } from '@/lib/datetime'
import type { Booking } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Props = {
  bookings: Booking[]
  isBond?: boolean
}

export function BookingCalendar({ bookings, isBond = false }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState(false)

  const events = bookings.map((b) => ({
    id: b.id,
    title: isBond
      ? `${b.tour?.name ?? 'ツアー'} / ${b.guest_name} ${b.guest_count}名`
      : `${b.guest_name} ${b.guest_count}名`,
    start: b.scheduled_at,
    extendedProps: { booking: b },
  }))

  function handleEventClick(info: EventClickArg) {
    setSelected(info.event.extendedProps.booking as Booking)
  }

  async function handleDelete() {
    if (!selected) return
    if (!confirm('この予約を削除しますか？')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('bookings').delete().eq('id', selected.id)
    setSelected(null)
    setDeleting(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ja"
          events={events}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next today',
          }}
          height="auto"
          eventDisplay="block"
          eventClassNames="cursor-pointer text-xs"
        />
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
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
                {isBond && selected.tour && (
                  <>
                    <span className="text-gray-500">ツアー</span>
                    <span>{selected.tour.name}</span>
                  </>
                )}
                {isBond && selected.guide && (
                  <>
                    <span className="text-gray-500">担当ガイド</span>
                    <span>{selected.guide.name}</span>
                  </>
                )}
              </div>
              <div className="pt-2 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? '削除中...' : '予約を削除'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
