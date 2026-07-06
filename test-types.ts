import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'
const sb = createClient<Database>('http://x', 'y')
async function test() {
  const { data } = await sb.from('gl_actualizaciones').select('*').single()
  console.log(data?.nombre) // Should NOT be never
}
