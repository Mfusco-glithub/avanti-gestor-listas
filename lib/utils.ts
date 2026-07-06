import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'UYU'): string {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}

export const IVA_LABELS: Record<number, string> = {
  0.10: 'Mínima (10%)',
  0.22: 'Básica (22%)',
  0: 'Exento (0%)',
}

export const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  calculo_aprobado: 'Cálculo Aprobado',
  listas_aprobadas: 'Listas Aprobadas',
  enviado: 'Enviado',
}

export const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  calculo_aprobado: 'bg-blue-100 text-blue-700',
  listas_aprobadas: 'bg-yellow-100 text-yellow-700',
  enviado: 'bg-green-100 text-green-700',
}

export const FORMATO_LABELS: Record<string, string> = {
  pdf_avanti: 'PDF Avanti',
  pdf_especialista: 'PDF La Especialista',
  xlsx_generico: 'Excel Genérico',
  xlsx_pedidosya: 'Excel PedidosYa',
  xlsx_gdu: 'Excel GDU',
  xlsx_kinko: 'Excel Kinko',
  xlsm_tienda_inglesa: 'Excel Tienda Inglesa',
}

export const SEMAFORO_COLORS = {
  verde: 'text-green-600 bg-green-50 border-green-200',
  amarillo: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  rojo: 'text-red-600 bg-red-50 border-red-200',
}
