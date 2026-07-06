'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  LogOut,
  Package,
  Building2,
  Tag,
  Layers,
  List,
  FlaskConical,
  CheckSquare,
} from 'lucide-react'

interface SidebarProps {
  usuario: { nombre: string | null; rol: string } | null
  userEmail: string
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/listas',
    label: 'Listas por Cadena',
    icon: List,
  },
  {
    href: '/simulador',
    label: 'Simulador Retail',
    icon: FlaskConical,
  },
  {
    href: '/simulador-comercio',
    label: 'Simulador Comercio',
    icon: FlaskConical,
  },
  {
    href: '/verificacion',
    label: 'Verificación',
    icon: CheckSquare,
  },
  {
    href: '/posicionamiento',
    label: 'Posicionamiento',
    icon: TrendingUp,
  },
  {
    href: '/actualizaciones',
    label: 'Actualizaciones',
    icon: FileSpreadsheet,
  },
  {
    label: 'Configuración',
    icon: Settings,
    children: [
      { href: '/configuracion/cadenas', label: 'Cadenas', icon: Building2 },
      { href: '/configuracion/skus', label: 'SKUs / Catálogo', icon: Package },
      { href: '/configuracion/marcas', label: 'Marcas', icon: Tag },
      { href: '/configuracion/grupos', label: 'Grupos Comparables', icon: Layers },
    ],
  },
]

export default function Sidebar({ usuario, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center font-bold text-lg">
          A
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Avanti Uruguay</p>
          <p className="text-slate-400 text-xs">Gestor de Precios</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if ('children' in item && item.children) {
            return (
              <div key={item.label}>
                <div className="flex items-center gap-2 px-3 py-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mt-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                <div className="ml-2 space-y-1">
                  {item.children.map((child) => (
                    <NavLink key={child.href} href={child.href} label={child.label} icon={child.icon} pathname={pathname} />
                  ))}
                </div>
              </div>
            )
          }

          if ('href' in item) {
            return (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} pathname={pathname} />
            )
          }
          return null
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 group">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {usuario?.nombre ?? userEmail.split('@')[0]}
            </p>
            <p className="text-xs text-slate-400 capitalize">{usuario?.rol ?? 'usuario'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-white rounded transition opacity-0 group-hover:opacity-100"
            title="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  pathname: string
}) {
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
        isActive
          ? 'bg-red-600 text-white'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
    </Link>
  )
}
