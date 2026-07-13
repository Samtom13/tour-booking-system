import type { Booking } from '@/lib/types'

export type SiteSummary = { site: string; count: number; revenue: number }

export type MonthlyRevenue = {
  total: number
  bondShare: number
  clientShare: number
  count: number
  bySite: SiteSummary[]
}

// OTAサイトの表示色（カレンダー・サマリー共通）
export function siteColor(site: string | null): string {
  const s = (site ?? '').toLowerCase()
  if (s.includes('klook')) return '#3B82F6'
  if (s.includes('viator')) return '#22C55E'
  if (s.includes('getyourguide') || s.includes('gyg')) return '#F97316'
  return '#6B7280'
}

// 予約配列から売上サマリー（Bond取り分・クライアント取り分含む）を算出
export function summarizeRevenue(bookings: Booking[], commissionRate: number): MonthlyRevenue {
  const total = bookings.reduce((s, b) => s + (b.revenue ?? 0), 0)
  const bondShare = Math.round(total * commissionRate / 100)
  const clientShare = total - bondShare

  const siteMap: Record<string, SiteSummary> = {}
  for (const b of bookings) {
    const site = b.booking_site ?? 'その他'
    if (!siteMap[site]) siteMap[site] = { site, count: 0, revenue: 0 }
    siteMap[site].count++
    siteMap[site].revenue += b.revenue ?? 0
  }

  return {
    total,
    bondShare,
    clientShare,
    count: bookings.length,
    bySite: Object.values(siteMap),
  }
}
