'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LogOut, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type NavItem = { label: string; href: string }

export function Nav({
  clientName,
  items,
}: {
  clientName: string
  items: NavItem[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="font-semibold text-sm">{clientName}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                pathname === item.href
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
