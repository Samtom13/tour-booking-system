import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClientAdminView } from '@/components/client-admin'

export default async function AdminClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at')

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">クライアント管理</h1>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← トップへ</Link>
      </div>
      <ClientAdminView clients={clients ?? []} />
    </div>
  )
}
