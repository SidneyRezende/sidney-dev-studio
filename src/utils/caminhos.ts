// Tratamento de caminhos Windows como texto. Módulo puro: nunca acede ao disco.
// Não contém caminhos pessoais: a pasta base é deduzida dos caminhos que o
// utilizador já registou na app (ou fica relativa, para ele confirmar).

/**
 * Deduz a pasta "…\Projetos" a partir de caminhos já registados (projetos e scripts).
 * Devolve a mais frequente, ou null se nenhum caminho a contiver.
 * Ex.: ["C:\Users\ana\Projetos\Desenvolvimento\app"] → "C:\Users\ana\Projetos"
 */
export function deduzirPastaProjetos(caminhos: (string | undefined)[]): string | null {
  const contagem = new Map<string, { original: string; total: number }>()
  for (const c of caminhos) {
    if (!c) continue
    // "Projetos" tem de ser uma pasta inteira (não "MeusProjetos").
    const m = /^((?:.*?\\)?Projetos)(?=\\|$)/i.exec(c.trim().replace(/\//g, '\\'))
    if (!m) continue
    const chave = m[1].toLowerCase()
    const atual = contagem.get(chave)
    contagem.set(chave, { original: atual?.original ?? m[1], total: (atual?.total ?? 0) + 1 })
  }
  let melhor: { original: string; total: number } | null = null
  for (const v of contagem.values()) if (!melhor || v.total > melhor.total) melhor = v
  return melhor?.original ?? null
}

/**
 * O navegador só revela o nome da pasta escolhida (não o caminho completo),
 * por isso sugerimos um caminho que o utilizador confirma ou corrige.
 * Sem pasta base conhecida, a sugestão é relativa (só o nome da pasta).
 */
export function sugerirBase(nomePasta: string, pastaProjetos: string | null): string {
  if (!pastaProjetos) return nomePasta
  return nomePasta.toLowerCase() === 'desenvolvimento'
    ? `${pastaProjetos}\\${nomePasta}`
    : `${pastaProjetos}\\Desenvolvimento\\${nomePasta}`
}

/** Sugestão de caminho para uma pasta de scripts escolhida (o utilizador confirma ou corrige). */
export function sugerirBaseScripts(nomePasta: string, pastaProjetos: string | null): string {
  return pastaProjetos ? `${pastaProjetos}\\${nomePasta}` : nomePasta
}

/** Para comparar caminhos: barras normalizadas, sem barra final, minúsculas. */
export function normalizarCaminho(caminho: string): string {
  return caminho.trim().replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()
}

/** Junta base + subpasta. Com subpasta vazia devolve só a base. */
export function juntarCaminho(base: string, subpasta: string): string {
  const b = base.trim().replace(/[\\/]+$/, '')
  return subpasta ? `${b}\\${subpasta}` : b
}

/** Comando para abrir a pasta no VS Code (para colar no terminal). */
export function comandoVSCode(pasta: string): string {
  return `code "${pasta.trim()}"`
}

export function mesmoCaminho(a: string | undefined, b: string): boolean {
  return a !== undefined && normalizarCaminho(a) === normalizarCaminho(b)
}
