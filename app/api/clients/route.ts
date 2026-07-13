import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug, commission_rate } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'クライアント名は必須です' }, { status: 400 })
  }

  const finalSlug = (typeof slug === 'string' && slug) || 'client-' + Math.random().toString(36).slice(2, 8)
  if (!/^[a-z0-9-]+$/.test(finalSlug)) {
    return NextResponse.json({ error: 'スラッグは英小文字・数字・ハイフンのみ使えます' }, { status: 400 })
  }

  const rate = Number(commission_rate)
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return NextResponse.json({ error: '手数料率は0〜100の数値で入力してください' }, { status: 400 })
  }

  // クライアント作成と作成者の紐付けはSECURITY DEFINER関数で一括実行
  // （user_clientsへの直接INSERTは権限昇格防止のため禁止されている）
  const { error } = await supabase.rpc('create_client_with_owner', {
    p_name: name.trim(),
    p_slug: finalSlug,
    p_commission_rate: rate,
  })

  if (error) {
    if (error.message.includes('duplicate key')) {
      return NextResponse.json({ error: `スラッグ「${finalSlug}」は既に使われています` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
