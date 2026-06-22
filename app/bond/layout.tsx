import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'

const NAV_ITEMS = [
  { label: 'カレンダー', href: '/bond' },
  { label: '給与計算', href: '/bond/salary' },
  { label: 'ガイド管理', href: '/bond/guides' },
  { label: 'ツアー管理', href: '/bond/tours' },
]

export default async function BondLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <Nav clientName="Bond" clientSlug="bond" items={NAV_ITEMS} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
