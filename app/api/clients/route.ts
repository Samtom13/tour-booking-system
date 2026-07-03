import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug } = await req.json()
  if (!name || !slug) return NextResponse.json({ error: '名前とスラッグは必須です' }, { status: 400 })

  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({ name, slug })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: '同じスラッグのクライアントが既に存在します' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('user_clients').insert({ user_id: user.id, client_id: newClient.id, role: 'admin' })

  return NextResponse.json({ ok: true })
}
