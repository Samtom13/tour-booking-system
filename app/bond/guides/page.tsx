import { createClient } from '@/lib/supabase/server'
import { GuideManager } from '@/components/guide-form'

export default async function GuidesPage() {
  const supabase = await createClient()

  const { data: bondClient } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', 'bond')
    .single()

  const { data: guides } = await supabase
    .from('guides')
    .select('*')
    .eq('client_id', bondClient?.id)
    .order('name')

  return <GuideManager clientId={bondClient?.id} guides={guides ?? []} />
}
