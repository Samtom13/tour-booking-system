'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'
import type { Tour } from '@/lib/types'

type Props = { clientId: string; tours: Tour[] }

const EMPTY = { name: '', standard_hours: '' }

export function TourManager({ clientId, tours }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Tour | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY)

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(t: Tour) {
    setEditTarget(t)
    setForm({ name: t.name, standard_hours: String(t.standard_hours) })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    if (editTarget) {
      await supabase.from('tours').update({
        name: form.name,
        standard_hours: parseFloat(form.standard_hours),
      }).eq('id', editTarget.id)
    } else {
      await supabase.from('tours').insert({
        client_id: clientId,
        name: form.name,
        standard_hours: parseFloat(form.standard_hours),
      })
    }

    setLoading(false)
    setOpen(false)
    setForm(EMPTY)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('tours').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">ツアー一覧</h2>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />追加</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'ツアー編集' : 'ツアー登録'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>ツアー名</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>標準稼働時間（例：6 または 4.5）</Label>
              <Input type="number" step="0.5" min="0.5" value={form.standard_hours} onChange={(e) => setForm(p => ({ ...p, standard_hours: e.target.value }))} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '保存中...' : '保存する'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {tours.map((t) => (
          <div key={t.id} className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">標準稼働時間：{t.standard_hours}時間</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(t)} className="text-gray-300 hover:text-blue-400 transition-colors p-1">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
