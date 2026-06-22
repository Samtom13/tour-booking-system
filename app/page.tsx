import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Settings } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('is_bond', { ascending: false })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">予約管理システム</h1>
        <p className="text-sm text-gray-500 text-center mb-8">クライアントを選択してください</p>
        <div className="flex justify-end mb-2">
          <Link href="/admin/clients" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <Settings className="w-3 h-3" />クライアント管理
          </Link>
        </div>
        <div className="space-y-3">
          {clients?.map((client) => (
            <Link key={client.id} href={`/${client.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-gray-300">
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{client.name}</p>
                    {client.is_bond && (
                      <p className="text-xs text-gray-400">予約・給与・ガイド管理</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
