import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractExpenses } from '@/lib/salary'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bondClient } = await supabase.from('clients').select('id').eq('slug', 'bond').single()
  const clientId = bondClient?.id

  const { data: config } = await supabase.from('spreadsheet_config').select('*').eq('client_id', clientId).single()
  if (!config) return NextResponse.json({ error: 'スプレッドシートが未設定です' }, { status: 400 })

  const [year, mon] = month.split('-')
  const startDate = `${year}/${mon}/01`
  const nextMon = parseInt(mon) === 12 ? `${parseInt(year)+1}/01/01` : `${year}/${String(parseInt(mon)+1).padStart(2,'0')}/01`

  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''
  const jwtToken = await getGoogleJWT(serviceEmail, privateKey)

  const sheetRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}/values/${encodeURIComponent(config.sheet_name)}!C:N`,
    { headers: { Authorization: `Bearer ${jwtToken}` } }
  )
  if (!sheetRes.ok) return NextResponse.json({ error: 'スプレッドシートの取得に失敗しました' }, { status: 500 })

  const sheetData = await sheetRes.json()
  const rows: string[][] = sheetData.values ?? []

  const filtered = rows.slice(1).filter((row) => {
    const dateStr = row[1] ?? ''
    return dateStr >= startDate && dateStr < nextMon
  })

  const monthStart = `${year}-${mon}-01T00:00:00`
  const nextMonth = parseInt(mon) === 12
    ? `${parseInt(year)+1}-01-01T00:00:00`
    : `${year}-${String(parseInt(mon)+1).padStart(2,'0')}-01T00:00:00`

  const [{ data: guides }, { data: bookings }, { data: overrides }] = await Promise.all([
    supabase.from('guides').select('*').eq('client_id', clientId),
    supabase.from('bookings').select('*, tour:tours(*), guide:guides(*)').eq('client_id', clientId).gte('scheduled_at', monthStart).lt('scheduled_at', nextMonth),
    supabase.from('salary_overrides').select('*').eq('client_id', clientId),
  ])

  type Detail = {
    date: string
    tourName: string
    baseWage: number
    reviewBonus: number
    expenses: number
    reviewBonusEnabled: boolean
    overrideId: string | null
    guideId: string
    customExpenses: number | null
  }

  type GuideRecord = { name: string; hourlyRate: number; details: Detail[] }
  const guideMap: Record<string, GuideRecord> = {}

  // SNSチーム分配（自社予約案件の粗利20%）
  // 予約サイトに「自社」ラベルが付いた案件が対象。報告書が提出され
  // ガイド報酬・経費が確定した（=このループに現れた）案件のみ計上する。
  const SNS_RATE = 0.2
  type SnsDetail = { date: string; tourName: string; revenue: number; cost: number; grossProfit: number; share: number }
  const snsDetails: SnsDetail[] = []

  for (const row of filtered) {
    const guideName = row[0] ?? ''
    const date = row[1] ?? ''
    const expenseText = row[11] ?? ''
    if (!guideName) continue

    const guide = guides?.find((g) => g.name === guideName)
    if (!guide) continue

    const datePrefix = date.replace(/\//g, '-')
    const booking = bookings?.find(
      (b) => b.guide?.name === guideName && b.scheduled_at.startsWith(datePrefix)
    )

    const tour = booking?.tour
    const standardHours = tour?.standard_hours ?? booking?.custom_hours ?? 0
    const baseWageBase = standardHours * guide.hourly_rate

    const override = overrides?.find((o) => o.guide_id === guide.id && o.work_date === date)
    const reviewBonusEnabled = override?.review_bonus ?? false
    const reviewBonus = reviewBonusEnabled ? Math.round(baseWageBase * 0.5) : 0

    const parsedExpenses = extractExpenses(expenseText)
    const expenses = override?.custom_expenses != null ? override.custom_expenses : parsedExpenses

    if (!guideMap[guideName]) {
      guideMap[guideName] = { name: guideName, hourlyRate: guide.hourly_rate, details: [] }
    }

    const tourName = tour?.name ?? (booking?.custom_hours ? `その他（${booking.custom_hours}時間）` : '不明')

    guideMap[guideName].details.push({
      date,
      tourName,
      baseWage: baseWageBase,
      reviewBonus,
      expenses,
      reviewBonusEnabled,
      overrideId: override?.id ?? null,
      guideId: guide.id,
      customExpenses: override?.custom_expenses ?? null,
    })

    // 自社予約案件ならSNSチーム分配を計上（粗利がプラスの場合のみ）
    const isInHouse = (booking?.booking_site ?? '').includes('自社')
    if (isInHouse && booking) {
      const revenue = booking.revenue ?? 0
      const cost = baseWageBase + reviewBonus + expenses
      const grossProfit = revenue - cost
      const share = Math.round(Math.max(0, grossProfit) * SNS_RATE)
      snsDetails.push({ date, tourName, revenue, cost, grossProfit, share })
    }
  }

  const result = Object.values(guideMap).map((g) => ({
    name: g.name,
    hourlyRate: g.hourlyRate,
    count: g.details.length,
    baseWageTotal: g.details.reduce((s, d) => s + d.baseWage + d.reviewBonus, 0),
    expensesTotal: g.details.reduce((s, d) => s + d.expenses, 0),
    total: g.details.reduce((s, d) => s + d.baseWage + d.reviewBonus + d.expenses, 0),
    details: g.details,
  }))

  const snsTeam = {
    total: snsDetails.reduce((s, d) => s + d.share, 0),
    details: snsDetails,
  }

  return NextResponse.json({ guides: result, snsTeam })
}

// レビュー報酬・経費の上書き保存
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { guide_id, work_date, review_bonus, custom_expenses } = await req.json()

  const { data: bondClient } = await supabase.from('clients').select('id').eq('slug', 'bond').single()
  const clientId = bondClient?.id

  await supabase.from('salary_overrides').upsert(
    { client_id: clientId, guide_id, work_date, review_bonus, custom_expenses },
    { onConflict: 'guide_id,work_date' }
  )

  return NextResponse.json({ ok: true })
}

async function getGoogleJWT(email: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signing = `${encode(header)}.${encode(payload)}`
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signing))
  const jwt = `${signing}.${Buffer.from(sig).toString('base64url')}`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '')
  const binary = atob(b64)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buffer
}
