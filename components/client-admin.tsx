'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'
import type { Client } from '@/lib/types'

type Props = { userId: string; clients: Client[] }

export function ClientAdminView({ userId, clients }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toSlug(str: string) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const slug = toSlug(name)
    if (!slug) { setError('スラッグを生成できません（英数字を含む名前にしてください）'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: newClient, error: insertErr } = await supabase
      .from('clients')
      .insert({ name, slug })
      .select()
      .single()

    if (insertErr) {
      setError('同じスラッグのクライアントが既に存在します')
      setLoading(false)
      return
    }

    // Assign current user to new client
    await supabase.from('user_clients').insert({ user_id: userId, client_id: newClient.id, role: 'admin' })

    setName('')
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('clients').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-lg p-4 shadow-sm border space-y-3">
        <h2 className="font-medium">新規クライアントを追加</h2>
        <div className="space-y-1">
          <Label>クライアント名</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="クライアントA"
            required
          />
          {name && (
            <p className="text-xs text-gray-400">スラッグ：{toSlug(name)}</p>
          )}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" size="sm" disabled={loading}>
          <Plus className="w-4 h-4 mr-1" />
          {loading ? '追加中...' : '追加する'}
        </Button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {clients.map((c) => (
          <div key={c.id} className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-gray-400">/{c.slug}</p>
            </div>
            {!c.is_bond && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-gray-300 hover:text-red-400 transition-colors p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
