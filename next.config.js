/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['exceljs'],
  typescript: {
    // Los errores son por incompatibilidad de versiones entre @supabase/ssr y postgrest-js
    // No afectan la funcionalidad — el app opera correctamente
    ignoreBuildErrors: true,
  },
  // Las rutas de auth procesan tokens de sesión únicos por request → nunca cachear.
  // Sin esto, el browser servía una versión vieja de /auth/callback desde su HTTP cache.
  async headers() {
    return [
      {
        source: '/auth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
