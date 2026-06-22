import { createClient } from '@/lib/supabase/server'
import { TourManager } from '@/components/tour-form'

export default async function ToursPage() {
  const supabase = await createClient()

  const { data: bondClient } = await supabase
    .from('clients')
    .select('id')
    .eq('slug', 'bond')
    .single()

  const { data: tours } = await supabase
    .from('tours')
    .select('*')
    .eq('client_id', bondClient?.id)
    .order('name')

  return <TourManager clientId={bondClient?.id} tours={tours ?? []} />
}
