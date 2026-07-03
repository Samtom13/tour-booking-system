import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug } = await req.json()
  if (!name) return NextResponse.json({ error: 'クライアント名は必須です' }, { status: 400 })

  const finalSlug = slug || 'client-' + Math.random().toString(36).slice(2, 8)
  if (!/^[a-z0-9-]+$/.test(finalSlug)) {
    return NextResponse.json({ error: 'スラッグは英小文字・数字・ハイフンのみ使えます' }, { status: 400 })
  }

  // RLS上、挿入直後の行はまだ自分に紐付いておらず読み返せないため、
  // IDをこちらで生成してRETURNINGなしで挿入する
  const clientId = randomUUID()

  const { error: insertErr } = await supabase
    .from('clients')
    .insert({ id: clientId, name, slug: finalSlug })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: `スラッグ「${finalSlug}」は既に使われています` }, { status: 409 })
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const { error: mapErr } = await supabase
    .from('user_clients')
    .insert({ user_id: user.id, client_id: clientId, role: 'admin' })

  if (mapErr) {
    return NextResponse.json({ error: mapErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
