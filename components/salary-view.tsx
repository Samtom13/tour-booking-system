'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Detail = {
  date: string
  tourName: string
  baseWage: number
  reviewBonus: number
  expenses: number
  reviewBonusEnabled: boolean
  guideId: string
  customExpenses: number | null
}

type GuideResult = {
  name: string
  hourlyRate: number
  count: number
  baseWageTotal: number
  expensesTotal: number
  total: number
  details: Detail[]
}

export function SalaryView() {
  const [month, setMonth] = useState(new Date())
  const [data, setData] = useState<GuideResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<GuideResult | null>(null)
  const [editingRow, setEditingRow] = useState<string | null>(null) // "date" as key
  const [editExpenses, setEditExpenses] = useState('')
  const [saving, setSaving] = useState(false)

  const monthKey = format(month, 'yyyy-MM')

  const fetchData = useCallback(() => {
    setLoading(true)
    setError('')
    fetch(`/api/salary?month=${monthKey}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d.guides)
      })
      .catch(() => setError('データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [monthKey])

  useEffect(() => { fetchData() }, [fetchData])

  // 選択中のガイドを最新データで更新
  useEffect(() => {
    if (selected) {
      const updated = data.find(g => g.name === selected.name)
      if (updated) setSelected(updated)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleReviewBonus(detail: Detail) {
    setSaving(true)
    await fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guide_id: detail.guideId,
        work_date: detail.date,
        review_bonus: !detail.reviewBonusEnabled,
        custom_expenses: detail.customExpenses,
      }),
    })
    setSaving(false)
    fetchData()
  }

  async function saveExpenses(detail: Detail) {
    setSaving(true)
    await fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guide_id: detail.guideId,
        work_date: detail.date,
        review_bonus: detail.reviewBonusEnabled,
        custom_expenses: editExpenses === '' ? null : parseInt(editExpenses),
      }),
    })
    setSaving(false)
    setEditingRow(null)
    fetchData()
  }

  return (
    <div className="space-y-6">
      {/* 月選択 */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold text-lg min-w-[100px] text-center">
          {format(month, 'yyyy年M月', { locale: ja })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-400">読み込み中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-3">
          {data.length === 0 && <p className="text-sm text-gray-400">この月のデータはありません</p>}
          {data.map((g) => (
            <button
              key={g.name}
              onClick={() => setSelected(g)}
              className="w-full bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{g.name}</p>
                <p className="text-lg font-bold">¥{g.total.toLocaleString()}</p>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                <span>担当件数：{g.count}件</span>
                <span>基本報酬：¥{g.baseWageTotal.toLocaleString()}</span>
                <span>経費：¥{g.expensesTotal.toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setEditingRow(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.name}　給与内訳</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs">
                    <th className="text-left py-2 pr-2">日付</th>
                    <th className="text-left py-2 pr-2">ツアー</th>
                    <th className="text-right py-2 pr-2">基本報酬</th>
                    <th className="text-center py-2 pr-2">レビュー</th>
                    <th className="text-right py-2 pr-2">ボーナス</th>
                    <th className="text-right py-2 pr-2">経費</th>
                    <th className="text-right py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selected.details.map((d) => (
                    <tr key={d.date} className="border-b last:border-0">
                      <td className="py-2 pr-2 whitespace-nowrap">{d.date}</td>
                      <td className="py-2 pr-2">{d.tourName}</td>
                      <td className="py-2 pr-2 text-right">¥{d.baseWage.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={d.reviewBonusEnabled}
                          onChange={() => toggleReviewBonus(d)}
                          disabled={saving}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {d.reviewBonus > 0
                          ? <span className="text-green-600">¥{d.reviewBonus.toLocaleString()}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {editingRow === d.date ? (
                          <Input
                            type="number"
                            value={editExpenses}
                            onChange={(e) => setEditExpenses(e.target.value)}
                            className="w-24 h-7 text-right text-sm"
                          />
                        ) : (
                          <span>¥{d.expenses.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {editingRow === d.date ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => saveExpenses(d)} disabled={saving} className="text-green-500 hover:text-green-700 p-1">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingRow(null)} className="text-gray-400 hover:text-gray-600 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingRow(d.date); setEditExpenses(String(d.expenses)) }}
                            className="text-gray-300 hover:text-blue-400 p-1"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t-2 text-sm">
                    <td colSpan={2} className="pt-3">合計</td>
                    <td className="pt-3 text-right">¥{selected.details.reduce((s, d) => s + d.baseWage, 0).toLocaleString()}</td>
                    <td />
                    <td className="pt-3 text-right text-green-600">
                      {selected.details.some(d => d.reviewBonus > 0)
                        ? `¥${selected.details.reduce((s, d) => s + d.reviewBonus, 0).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="pt-3 text-right">¥{selected.expensesTotal.toLocaleString()}</td>
                    <td />
                  </tr>
                  <tr className="font-bold text-base">
                    <td colSpan={5} className="pt-1">支払総額</td>
                    <td colSpan={2} className="pt-1 text-right">¥{selected.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
