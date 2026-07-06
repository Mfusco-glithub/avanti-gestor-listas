import { createServerClient } from '@supabase/ssr'
import type { Database } from './types/database'

async function test() {
  const sb = createServerClient<Database>('http://x', 'y', {
    cookies: { getAll: () => [], setAll: () => {} }
  })
  const { data } = await sb.from('gl_actualizaciones').select('*').single()
  console.log(data?.nombre) // Should NOT be never
}
