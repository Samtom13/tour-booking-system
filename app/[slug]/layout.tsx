import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Bond has its own layout
  if (slug === 'bond') redirect('/bond')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!client) notFound()

  const NAV_ITEMS = [
    { label: 'カレンダー', href: `/${slug}` },
    { label: '予約管理', href: `/${slug}/bookings` },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Nav clientName={client.name} clientSlug={slug} items={NAV_ITEMS} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
