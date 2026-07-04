import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

// UTC保存値のJST壁時計値を、実行環境のローカルDateとして返す（表示専用）
// サーバー（Vercel=UTC）でもブラウザ（JST）でも同じJST表示になる
export function toJST(dateStr: string): Date {
  const jst = new Date(new Date(dateStr).getTime() + JST_OFFSET_MS)
  return new Date(
    jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(),
    jst.getUTCHours(), jst.getUTCMinutes(), jst.getUTCSeconds()
  )
}

// JSTでフォーマットした文字列を返す。実行環境のタイムゾーンに依存しない
export function formatJST(dateStr: string, pattern: string): string {
  return format(toJST(dateStr), pattern, { locale: ja })
}

// JSTでの当月の開始・終了時刻（UTC ISO文字列）を返す
export function jstMonthRange(base: Date = new Date()): { start: string; end: string } {
  const jstNow = new Date(base.getTime() + JST_OFFSET_MS)
  const y = jstNow.getUTCFullYear()
  const m = jstNow.getUTCMonth()
  const start = new Date(Date.UTC(y, m, 1) - JST_OFFSET_MS).toISOString()
  const end = new Date(Date.UTC(y, m + 1, 1) - JST_OFFSET_MS - 1).toISOString()
  return { start, end }
}

// JSTでの現在年月ラベル（例: 2026年7月）
export function jstMonthLabel(base: Date = new Date()): string {
  const jstNow = new Date(base.getTime() + JST_OFFSET_MS)
  return `${jstNow.getUTCFullYear()}年${jstNow.getUTCMonth() + 1}月`
}
