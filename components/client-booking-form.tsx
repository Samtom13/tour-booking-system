'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export function ClientBookingForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    scheduled_at: '',
    guest_name: '',
    guest_count: '1',
    booking_site: '',
    revenue: '',
  })

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('bookings').insert({
      client_id: clientId,
      scheduled_at: form.scheduled_at,
      guest_name: form.guest_name,
      guest_count: parseInt(form.guest_count),
      booking_site: form.booking_site || null,
      revenue: form.revenue ? parseInt(form.revenue) : null,
    })
    setLoading(false)
    setOpen(false)
    setForm({ scheduled_at: '', guest_name: '', guest_count: '1', booking_site: '', revenue: '' })
    router.refresh()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />予約を追加</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>予約登録</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>予約日時</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => set('scheduled_at', e.target.value)} required />
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
              <Input value={form.booking_site} onChange={(e) => set('booking_site', e.target.value)} placeholder="Viator..." />
            </div>
            <div className="space-y-1">
              <Label>売上金額（円）</Label>
              <Input type="number" value={form.revenue} onChange={(e) => set('revenue', e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登録中...' : '登録する'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
