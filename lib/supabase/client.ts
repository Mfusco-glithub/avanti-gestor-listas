import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

type AppDatabase = Omit<Database, '__InternalSupabase'>

export function createClient() {
  return createBrowserClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // auth/callback y reset-password leen los tokens del hash y hacen setSession()
      // manual. Con detectSessionInUrl:true el cliente procesa el hash en paralelo y
      // toma el lock de gotrue-js → el setSession manual se cuelga esperándolo.
      // Lo desactivamos: esas dos páginas son las únicas que consumen tokens de la URL
      // y ya lo hacen a mano. (Si algún día se agrega login OAuth por redirect, habrá
      // que manejar el hash manualmente o reactivar esto en un cliente aparte.)
      auth: { detectSessionInUrl: false },
    }
  )
}
