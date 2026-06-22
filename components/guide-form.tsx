'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil } from 'lucide-react'
import type { Guide } from '@/lib/types'

type Props = { clientId: string; guides: Guide[] }

const EMPTY = { name: '', hourly_rate: '', bank_info: '' }

export function GuideManager({ clientId, guides }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY)

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(g: Guide) {
    setEditTarget(g)
    setForm({ name: g.name, hourly_rate: String(g.hourly_rate), bank_info: g.bank_info ?? '' })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    if (editTarget) {
      await supabase.from('guides').update({
        name: form.name,
        hourly_rate: parseInt(form.hourly_rate),
        bank_info: form.bank_info || null,
      }).eq('id', editTarget.id)
    } else {
      await supabase.from('guides').insert({
        client_id: clientId,
        name: form.name,
        hourly_rate: parseInt(form.hourly_rate),
        bank_info: form.bank_info || null,
      })
    }

    setLoading(false)
    setOpen(false)
    setForm(EMPTY)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('guides').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">ガイド一覧</h2>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />追加</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'ガイド編集' : 'ガイド登録'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>氏名</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>時給（円）</Label>
              <Input type="number" value={form.hourly_rate} onChange={(e) => setForm(p => ({ ...p, hourly_rate: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>振込先情報</Label>
              <Input value={form.bank_info} onChange={(e) => setForm(p => ({ ...p, bank_info: e.target.value }))} placeholder="〇〇銀行 ○○支店 普通1234567" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '保存中...' : '保存する'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {guides.map((g) => (
          <div key={g.id} className="bg-white rounded-lg p-4 shadow-sm border flex items-start justify-between">
            <div>
              <p className="font-medium">{g.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">時給：¥{g.hourly_rate.toLocaleString()}</p>
              {g.bank_info && <p className="text-sm text-gray-400 mt-0.5">{g.bank_info}</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(g)} className="text-gray-300 hover:text-blue-400 transition-colors p-1">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
