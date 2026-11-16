// Acesso seguro ao localStorage: qualquer erro (modo privado, quota cheia,
// dados bloqueados) é apanhado e a app continua a funcionar em memória.

export type Leitura =
  | { ok: true; valor: unknown }
  | { ok: false; motivo: 'vazio' | 'indisponivel' }
  | { ok: false; motivo: 'invalido'; bruto: string }

function obterStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function armazenamentoDisponivel(): boolean {
  const s = obterStorage()
  if (!s) return false
  try {
    const teste = '__sds_teste__'
    s.setItem(teste, '1')
    s.removeItem(teste)
    return true
  } catch {
    return false
  }
}

export function lerJSON(chave: string): Leitura {
  const s = obterStorage()
  if (!s) return { ok: false, motivo: 'indisponivel' }
  let bruto: string | null
  try {
    bruto = s.getItem(chave)
  } catch {
    return { ok: false, motivo: 'indisponivel' }
  }
  if (bruto === null) return { ok: false, motivo: 'vazio' }
  try {
    return { ok: true, valor: JSON.parse(bruto) }
  } catch {
    return { ok: false, motivo: 'invalido', bruto }
  }
}

export function escreverJSON(chave: string, valor: unknown): boolean {
  const s = obterStorage()
  if (!s) return false
  try {
    s.setItem(chave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

/**
 * Guarda uma cópia de dados que não passaram na validação, para nunca
 * se perderem ao serem substituídos. Só escreve se ainda não houver cópia.
 */
export function guardarCopiaInvalida(chave: string, bruto: string): void {
  guardarCopia(`${chave}:copia-invalida`, bruto)
}

/**
 * Antes de gravar dados migrados para um formato novo, guarda o original.
 * Só escreve se ainda não houver cópia (a primeira é a mais antiga).
 */
export function guardarCopiaAnterior(chave: string, bruto: string): void {
  guardarCopia(`${chave}:copia-anterior`, bruto)
}

function guardarCopia(destino: string, bruto: string): void {
  const s = obterStorage()
  if (!s) return
  try {
    if (s.getItem(destino) === null) s.setItem(destino, bruto)
  } catch {
    // Sem espaço ou sem acesso: não há mais nada a fazer.
  }
}
