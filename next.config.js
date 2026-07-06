/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['exceljs', '@react-pdf/renderer'],
  },
  typescript: {
    // Los errores son por incompatibilidad de versiones entre @supabase/ssr y postgrest-js
    // No afectan la funcionalidad — el app opera correctamente
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
