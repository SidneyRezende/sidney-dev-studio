const DIA_MS = 86_400_000

function inicioDoDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "Hoje", "Ontem", "Há 3 dias" ou "12 nov." para datas mais antigas. */
export function tempoRelativo(iso: string, agora = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(d)) / DIA_MS)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 7) return `Há ${dias} dias`
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

/** 'AAAA-MM-DD' → "22 nov." (hora local). */
export function formatarDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  const data = new Date(a, m - 1, d)
  return Number.isNaN(data.getTime()) ? dia : data.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

/** true se o dia 'AAAA-MM-DD' já passou (antes de hoje). */
export function diaPassado(dia: string, agora = new Date()): boolean {
  return dia < dataCurta(agora)
}

/** Data de hoje no formato AAAA-MM-DD (hora local), para nomes de ficheiros. */
export function dataCurta(agora = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${m}-${d}`
}
