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
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name) { setError('クライアント名を入力してください'); return }
    if (!slug) { setError('スラッグを入力してください'); return }
    if (!/^[a-z0-9-]+$/.test(slug)) { setError('スラッグは英小文字・数字・ハイフンのみ使えます'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: slug.toLowerCase() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '追加に失敗しました')
      setLoading(false)
      return
    }

    setName('')
    setSlug('')
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
            placeholder="平安玉凰陶苑"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>スラッグ（URL用・英小文字・数字・ハイフンのみ）</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="heian-gyokuo"
            required
          />
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
