export function extractExpenses(text: string | null): number {
  if (!text) return 0
  let total = 0

  const lines = text.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // 「＝￥1,234」または「=¥1,234」がある行はその金額を使う（括弧内の内訳を無視）
    const equalMatch = line.match(/[=＝]\s*[￥¥]([\d,]+)/)
    if (equalMatch) {
      const num = parseInt(equalMatch[1].replace(/,/g, ''))
      if (!isNaN(num)) total += num
      continue
    }

    // 「￥1,234」「¥1,234」形式
    const yenSignMatches = line.match(/[￥¥]([\d,]+)/g) ?? []
    for (const m of yenSignMatches) {
      const num = parseInt(m.replace(/[￥¥,]/g, ''))
      if (!isNaN(num)) total += num
    }

    // 「1,234円」形式（￥なし）
    const yenSuffixMatches = line.match(/([\d,]+)\s*円/g) ?? []
    for (const m of yenSuffixMatches) {
      const num = parseInt(m.replace(/[,円\s]/g, ''))
      if (!isNaN(num)) total += num
    }
  }

  return total
}
