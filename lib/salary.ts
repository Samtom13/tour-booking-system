// 全角の数字・記号を半角へ正規化する
// （報告書は手入力のため全角数字・全角カンマ・全角￥などが混在する）
function normalize(text: string): string {
  return text
    // 全角数字 ０-９ → 0-9
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 全角カンマ・句点 → 半角
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    // 全角￥ → ¥、全角＝ → =
    .replace(/￥/g, '¥')
    .replace(/＝/g, '=')
}

// 「1,234」「1.000」「1 234」など桁区切り（カンマ・ピリオド）を除去して整数化
function parseAmount(raw: string): number {
  const n = parseInt(raw.replace(/[.,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

export function extractExpenses(text: string | null): number {
  if (!text) return 0
  let total = 0

  const lines = normalize(text).split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // 「=¥1,234」がある行はその合計金額を使う（括弧内の内訳を二重計上しない）
    const equalMatch = line.match(/=\s*¥([\d.,]+)/)
    if (equalMatch) {
      total += parseAmount(equalMatch[1])
      continue
    }

    // 「¥1,234」形式
    const yenSignMatches = line.match(/¥([\d.,]+)/g)
    if (yenSignMatches) {
      for (const m of yenSignMatches) total += parseAmount(m.replace(/¥/g, ''))
      continue
    }

    // 「1,234円」「1.000円」形式（¥なし）
    const yenSuffixMatches = line.match(/([\d.,]+)\s*円/g)
    if (yenSuffixMatches) {
      for (const m of yenSuffixMatches) total += parseAmount(m.replace(/円/g, ''))
      continue
    }

    // ¥も円も付かない「項目名 金額」形式（例「バス荒神口～京都駅　230」）。
    // 行末の数字を金額として拾う。途中の「(3)」のような数字は無視される。
    const trailingMatch = line.match(/(\d[\d.,]*)\s*$/)
    if (trailingMatch) {
      total += parseAmount(trailingMatch[1])
    }
  }

  return total
}
