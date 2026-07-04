'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { Tour, Guide, Booking } from '@/lib/types'
import { format } from 'date-fns'
import { toJST } from '@/lib/datetime'

type Props = {
  clientId: string
  tours: Tour[]
  guides: Guide[]
  editBooking?: Booking | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const OTHER_TOUR_ID = '__other__'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 6)
const MINUTES = [0, 15, 30, 45]

function toScheduledAt(date: string, hour: string, minute: string): string {
  const h = String(hour).padStart(2, '0')
  const m = String(minute).padStart(2, '0')
  return `${date}T${h}:${m}:00+09:00`
}

function initialForm(editBooking: Booking | null | undefined) {
  if (!editBooking) {
    return {
      tour_id: '', custom_hours: '', date: '', hour: '9', minute: '0',
      guest_name: '', guest_count: '1', booking_site: '', revenue: '', guide_id: '',
    }
  }
  const d = toJST(editBooking.scheduled_at)
  const isOther = editBooking.custom_hours != null
  return {
    tour_id: isOther ? OTHER_TOUR_ID : (editBooking.tour_id ?? ''),
    custom_hours: editBooking.custom_hours != null ? String(editBooking.custom_hours) : '',
    date: format(d, 'yyyy-MM-dd'),
    hour: String(d.getHours()),
    minute: String(Math.round(d.getMinutes() / 15) * 15 % 60),
    guest_name: editBooking.guest_name,
    guest_count: String(editBooking.guest_count),
    booking_site: editBooking.booking_site ?? '',
    revenue: editBooking.revenue != null ? String(editBooking.revenue) : '',
    guide_id: editBooking.guide_id ?? '',
  }
}

export function BondBookingForm({ clientId, tours, guides, editBooking, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function handleOpenChange(val: boolean) {
    if (isControlled) onOpenChange?.(val)
    else setInternalOpen(val)
  }

  return (
    <>
      {!isControlled && (
        <Button size="sm" onClick={() => handleOpenChange(true)}>
          <Plus className="w-4 h-4 mr-1" />予約を追加
        </Button>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editBooking ? '予約編集' : '予約登録'}</DialogTitle>
          </DialogHeader>
          {/* keyで再マウントし、開くたびに編集対象の値でフォームを初期化する */}
          {open && (
            <BookingFormFields
              key={editBooking?.id ?? 'new'}
              clientId={clientId}
              tours={tours}
              guides={guides}
              editBooking={editBooking}
              onDone={() => handleOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function BookingFormFields({
  clientId, tours, guides, editBooking, onDone,
}: {
  clientId: string
  tours: Tour[]
  guides: Guide[]
  editBooking?: Booking | null
  onDone: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => initialForm(editBooking))

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) return
    setLoading(true)
    const supabase = createClient()

    const isOther = form.tour_id === OTHER_TOUR_ID
    const payload = {
      tour_id: isOther ? null : (form.tour_id || null),
      custom_hours: isOther && form.custom_hours ? parseFloat(form.custom_hours) : null,
      guide_id: form.guide_id || null,
      scheduled_at: toScheduledAt(form.date, form.hour, form.minute),
      guest_name: form.guest_name,
      guest_count: parseInt(form.guest_count),
      booking_site: form.booking_site || null,
      revenue: form.revenue ? parseInt(form.revenue) : null,
    }

    if (editBooking) {
      await supabase.from('bookings').update(payload).eq('id', editBooking.id)
    } else {
      await supabase.from('bookings').insert({ ...payload, client_id: clientId })
    }

    setLoading(false)
    onDone()
    router.refresh()
  }

  const isOtherSelected = form.tour_id === OTHER_TOUR_ID
  const selectedTourName = isOtherSelected ? 'その他' : tours.find(t => t.id === form.tour_id)?.name
  const selectedGuideName = guides.find(g => g.id === form.guide_id)?.name

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="space-y-1">
        <Label>ツアー名</Label>
        <Select value={form.tour_id} onValueChange={(v: string | null) => set('tour_id', v ?? '')}>
          <SelectTrigger>
            <span className={selectedTourName ? '' : 'text-gray-400'}>
              {selectedTourName ?? '選択してください'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {tours.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            <SelectItem value={OTHER_TOUR_ID}>その他</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isOtherSelected && (
        <div className="space-y-1">
          <Label>稼働時間数</Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            value={form.custom_hours}
            onChange={(e) => set('custom_hours', e.target.value)}
            placeholder="例：3 または 4.5"
            required
          />
        </div>
      )}

      <div className="space-y-1">
        <Label>予約日時</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            required
            className="flex-1"
          />
          <Select value={form.hour} onValueChange={(v: string | null) => set('hour', v ?? '9')}>
            <SelectTrigger className="w-20">
              <span>{String(form.hour).padStart(2, '0')}時</span>
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}時</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={form.minute} onValueChange={(v: string | null) => set('minute', v ?? '0')}>
            <SelectTrigger className="w-20">
              <span>{String(form.minute).padStart(2, '0')}分</span>
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}分</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>ゲスト名</Label>
          <Input value={form.guest_name} onChange={(e) => set('guest_name', e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>人数</Label>
          <Input type="number" min="1" value={form.guest_count} onChange={(e) => set('guest_count', e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>予約サイト</Label>
          <Input value={form.booking_site} onChange={(e) => set('booking_site', e.target.value)} placeholder="Viator, Klook..." />
        </div>
        <div className="space-y-1">
          <Label>売上金額（円）</Label>
          <Input type="number" min="0" value={form.revenue} onChange={(e) => set('revenue', e.target.value)} placeholder="12000" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>担当ガイド</Label>
        <Select value={form.guide_id} onValueChange={(v: string | null) => set('guide_id', v ?? '')}>
          <SelectTrigger>
            <span className={selectedGuideName ? '' : 'text-gray-400'}>
              {selectedGuideName ?? '選択してください'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {guides.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '保存中...' : '保存する'}
      </Button>
    </form>
  )
}
