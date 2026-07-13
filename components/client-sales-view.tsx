'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { siteColor, type SiteSummary } from '@/lib/revenue'

type MonthSummary = {
  key: string
  label: string
  total: number
  bondShare: number
  clientShare: number
  count: number
  bySite: SiteSummary[]
}

type Props = {
  months: MonthSummary[]
  commissionRate: number
}

export function ClientSalesView({ months, commissionRate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-semibold">売上管理</h1>
        <span className="text-xs text-gray-400">Bond手数料率 {commissionRate}%</span>
      </div>

      {months.length === 0 ? (
        <p className="text-sm text-gray-400">まだ売上データがありません</p>
      ) : (
        <div className="space-y-2">
          {months.map((m) => {
            const isOpen = expanded === m.key
            return (
              <div key={m.key} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : m.key)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-xs text-gray-400">{m.count}件</span>
                  </div>
                  <span className="text-lg font-bold">¥{m.total.toLocaleString()}</span>
                </button>

                <div className="px-4 pb-3 grid grid-cols-3 gap-3 border-t pt-3">
                  <div>
                    <p className="text-xs text-gray-500">売上合計</p>
                    <p className="font-bold text-sm">¥{m.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Bond取り分（{commissionRate}%）</p>
                    <p className="font-bold text-sm text-blue-600">¥{m.bondShare.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">クライアント支払い分</p>
                    <p className="font-bold text-sm text-green-600">¥{m.clientShare.toLocaleString()}</p>
                  </div>
                </div>

                {isOpen && m.bySite.length > 0 && (
                  <div className="px-4 pb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">サイト別内訳</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {m.bySite.map((s) => (
                        <div key={s.site} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: siteColor(s.site) }} />
                          <div>
                            <p className="text-xs text-gray-500">{s.site}</p>
                            <p className="font-semibold text-xs">¥{s.revenue.toLocaleString()} <span className="text-gray-400 font-normal">/ {s.count}件</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
