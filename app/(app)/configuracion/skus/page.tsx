'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Package, Plus, Pencil, X, Save,
  CheckCircle, AlertCircle, Loader2,
  ChevronDown, ChevronLeft, ChevronRight,
  Search,
} from 'lucide-react'
import { IVA_LABELS } from '@/lib/utils'

interface Sku {
  id: string
  cod_interno: string | null
  ean: string | null
  descripcion: string
  marca: string | null
  categoria: string | null
  familia: string | null
  sub_familia: string | null
  gramaje: string | null
  unidades_caja: number | null
  iva_rate: number
  activo: boolean
  grupo_comparable: number | null
}

const FAMILIA_COLORS: Record<string, string> = {
  'Masas': 'bg-blue-100 text-blue-700',
  'Pastas Frescas ATM': 'bg-green-100 text-green-700',
  'Pastas Frescas': 'bg-teal-100 text-teal-700',
  'Pastas Congeladas': 'bg-purple-100 text-purple-700',
  'Empanadas Congeladas': 'bg-orange-100 text-orange-700',
  'Pizzas Congeladas': 'bg-red-100 text-red-700',
  'Salsas': 'bg-yellow-100 text-yellow-700',
}

const FAMILIAS_PREDEFINIDAS = [
  'Masas', 'Pastas Frescas ATM', 'Pastas Frescas',
  'Pastas Congeladas', 'Empanadas Congeladas', 'Pizzas Congeladas', 'Salsas',
]

const IVA_OPTIONS: { value: number; label: string; color: string }[] = [
  { value: 0.10, label: 'Minima (10%)', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 0.22, label: 'Basica (22%)', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 0, label: 'Exento (0%)', color: 'bg-gray-200 text-gray-700 border-gray-300' },
]

const PAGE_SIZE = 30

const EMPTY_SKU: Partial<Sku> = {
  cod_interno: '',
  ean: '',
  descripcion: '',
  marca: 'Avanti',
  familia: null,
  sub_familia: '',
  gramaje: '',
  unidades_caja: undefined,
  iva_rate: 0.22,
  activo: true,
  grupo_comparable: undefined,
}

export default function SkusPage() {
  const [skus, setSkus] = useState<Sku[]>([])
  const [total, setTotal] = useState(0)
  const [familias, setFamilias] = useState<string[]>([])
  const [subfamilias, setSubfamilias] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [familiaFilter, setFamiliaFilter] = useState('')
  const [subfamiliaFilter, setSubfamiliaFilter] = useState('')
  const [sinEan, setSinEan] = useState(false)
  const [sinGrupo, setSinGrupo] = useState(false)
  const [soloInactivos, setSoloInactivos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingSku, setEditingSku] = useState<Partial<Sku> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const cargar = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pg) })
      if (search) params.set('search', search)
      if (familiaFilter) params.set('familia', familiaFilter)
      if (subfamiliaFilter) params.set('subfamilia', subfamiliaFilter)
      if (sinEan) params.set('sin_ean', '1')
      if (sinGrupo) params.set('sin_grupo', '1')
      if (soloInactivos) params.set('inactivos', '1')
      const r = await fetch('/api/configuracion/skus?' + params.toString())
      const d = await r.json()
      setSkus(d.skus ?? [])
      setTotal(d.total ?? 0)
      setFamilias(d.familias ?? [])
      setSubfamilias(d.subfamilias ?? [])
      setPage(pg)
    } finally {
      setLoading(false)
    }
  }, [search, familiaFilter, subfamiliaFilter, sinEan, sinGrupo, soloInactivos])

  useEffect(() => { cargar(0) }, [search, familiaFilter, subfamiliaFilter, sinEan, sinGrupo, soloInactivos]) // eslint-disable-line

  function abrirEditar(sku: Sku) {
    setEditingSku({ ...sku })
    setIsNew(false)
    setPanelOpen(true)
  }

  function abrirNuevo() {
    setEditingSku({ ...EMPTY_SKU })
    setIsNew(true)
    setPanelOpen(true)
  }

  function cerrarPanel() {
    setPanelOpen(false)
    setEditingSku(null)
  }

  function setField(field: keyof Sku, value: unknown) {
    setEditingSku(prev => prev ? { ...prev, [field]: value } : prev)
  }

  function handleEanChange(val: string) {
    const newEan = val || null
    if (isNew && val && val.length >= 6) {
      const cod = val.replace(/\D/g, '').slice(-6)
      setEditingSku(prev => prev ? { ...prev, ean: newEan, cod_interno: cod } : prev)
    } else {
      setField('ean', newEan)
    }
  }

  async function guardar() {
    if (!editingSku) return
    if (!editingSku.descripcion?.trim()) {
      showToast('error', 'La descripcion es obligatoria')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/configuracion/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isNew
            ? { action: 'create', sku: editingSku }
            : { action: 'update', id: editingSku.id, campos: editingSku }
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', isNew ? 'SKU creado correctamente' : 'SKU actualizado')
      cerrarPanel()
      cargar(page)
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)
  const familiasSelect = [...new Set([...FAMILIAS_PREDEFINIDAS, ...familias])].sort()

  function ivaClass(rate: number) {
    if (rate === 0.10) return 'bg-green-50 text-green-700'
    if (rate === 0.22) return 'bg-orange-50 text-orange-700'
    return 'bg-gray-100 text-gray-600'
  }

  function rowClass(sku: Sku) {
    const base = 'hover:bg-gray-50 transition'
    return sku.activo ? base : base + ' opacity-40'
  }

  function toggleClass(active: boolean) {
    return 'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ' + (active ? 'bg-red-600' : 'bg-gray-300')
  }

  function thumbClass(active: boolean) {
    return 'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ' + (active ? 'translate-x-4' : 'translate-x-0')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-red-600" />
            Catalogo de SKUs
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? '...' : total} productos · {familias.length} familias
          </p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
          <Plus className="w-4 h-4" />
          Nuevo SKU
        </button>
      </div>

      {toast && (
        <div className={['flex items-center gap-3 px-4 py-3 rounded-lg text-sm border', toast.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'].join(' ')}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Descripcion, EAN o codigo..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
        </div>
        <div className="relative">
          <select value={familiaFilter} onChange={e => { setFamiliaFilter(e.target.value); setSubfamiliaFilter('') }}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-48">
            <option value="">Todas las familias</option>
            {familias.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {familiaFilter && subfamilias.length > 0 && (
          <div className="relative">
            <select value={subfamiliaFilter} onChange={e => setSubfamiliaFilter(e.target.value)}
              className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-40">
              <option value="">Todas las subfamilias</option>
              {subfamilias.map(sf => <option key={sf} value={sf}>{sf}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
        <button onClick={() => setSinEan(!sinEan)}
          className={['px-3 py-2 rounded-lg text-sm font-medium border transition', sinEan ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'].join(' ')}>
          Sin EAN
        </button>
        <button onClick={() => setSinGrupo(!sinGrupo)}
          className={['px-3 py-2 rounded-lg text-sm font-medium border transition', sinGrupo ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'].join(' ')}>
          Sin Grupo
        </button>
        <button onClick={() => setSoloInactivos(!soloInactivos)}
          className={['px-3 py-2 rounded-lg text-sm font-medium border transition', soloInactivos ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'].join(' ')}>
          Solo inactivos
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">EAN</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Cod.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripcion</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Familia</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Sub familia</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Gramaje</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Grupo</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Activo</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {skus.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                        No se encontraron SKUs con los filtros aplicados
                      </td>
                    </tr>
                  ) : skus.map(sku => {
                    const fc = FAMILIA_COLORS[sku.familia ?? ''] ?? 'bg-gray-100 text-gray-600'
                    return (
                      <tr key={sku.id} className={rowClass(sku)}>
                        <td className="px-4 py-2.5">
                          {sku.ean
                            ? <span className="font-mono text-xs text-gray-500">{sku.ean}</span>
                            : <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded font-medium">Sin EAN</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{sku.cod_interno ?? '---'}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          <span className="block">{sku.descripcion}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {sku.familia
                            ? <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + fc}>{sku.familia}</span>
                            : <span className="text-xs text-gray-300">---</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{sku.sub_familia ?? '---'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{sku.gramaje ?? '---'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {sku.grupo_comparable !== null
                            ? <span className="text-sm font-semibold text-gray-700">{sku.grupo_comparable}</span>
                            : <span className="text-xs text-gray-300">---</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (sku.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through')}>
                            {sku.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => abrirEditar(sku)} className="p-1.5 text-gray-300 hover:text-red-500 rounded transition" title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {total > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>{from}-{to} de {total}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => cargar(page - 1)} disabled={page === 0}
                    className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs">{page + 1} / {totalPages}</span>
                  <button onClick={() => cargar(page + 1)} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {panelOpen && editingSku && (
        <div>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={cerrarPanel} />
          <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
              <div>
                <h2 className="font-semibold text-gray-900">{isNew ? 'Nuevo SKU' : 'Editar SKU'}</h2>
                {!isNew && editingSku.cod_interno && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{editingSku.cod_interno}</p>
                )}
              </div>
              <button onClick={cerrarPanel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">EAN</label>
                <input type="text" value={editingSku.ean ?? ''} onChange={e => handleEanChange(e.target.value)}
                  placeholder="ej. 7730927022115"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cod. Interno</label>
                <input type="text" value={editingSku.cod_interno ?? ''} onChange={e => setField('cod_interno', e.target.value || null)}
                  placeholder="ej. 022115"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Descripcion <span className="text-red-500 font-normal">*</span>
                </label>
                <input type="text" value={editingSku.descripcion ?? ''} onChange={e => setField('descripcion', e.target.value)}
                  placeholder="ej. AV PACK TALLARINES 500g x2"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Marca</label>
                <input type="text" value={editingSku.marca ?? ''} onChange={e => setField('marca', e.target.value || null)}
                  placeholder="ej. Avanti"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Familia</label>
                <div className="relative">
                  <select value={editingSku.familia ?? ''} onChange={e => setField('familia', e.target.value || null)}
                    className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="">--- Sin clasificar ---</option>
                    {familiasSelect.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sub Familia</label>
                <input type="text" value={editingSku.sub_familia ?? ''} onChange={e => setField('sub_familia', e.target.value || null)}
                  placeholder="ej. Tallarines, Ravioles..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gramaje</label>
                  <input type="text" value={editingSku.gramaje ?? ''} onChange={e => setField('gramaje', e.target.value || null)}
                    placeholder="ej. 500g"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Uds/Caja</label>
                  <input type="number" min={1} value={editingSku.unidades_caja ?? ''}
                    onChange={e => setField('unidades_caja', e.target.value ? parseInt(e.target.value, 10) : null)}
                    placeholder="ej. 12"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Tasa de IVA</label>
                <div className="grid grid-cols-3 gap-2">
                  {IVA_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setField('iva_rate', opt.value)}
                      className={['py-2 px-1 rounded-lg border text-xs font-medium transition', editingSku.iva_rate === opt.value ? opt.color : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'].join(' ')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Grupo comparable</label>
                <input type="number" min={1} max={99} value={editingSku.grupo_comparable ?? ''}
                  onChange={e => setField('grupo_comparable', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="---"
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500" />
                <p className="text-xs text-gray-400 mt-1">Numero que agrupa productos equivalentes entre marcas</p>
              </div>

              <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Activo</p>
                  <p className="text-xs text-gray-400 mt-0.5">Aparece en listas y posicionamiento</p>
                </div>
                <button type="button" onClick={() => setField('activo', !editingSku.activo)} className={toggleClass(!!editingSku.activo)}>
                  <span className={thumbClass(!!editingSku.activo)} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
              <button onClick={guardar} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isNew ? 'Crear SKU' : 'Guardar cambios'}
              </button>
              <button onClick={cerrarPanel} disabled={saving}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
