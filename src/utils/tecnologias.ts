// Deteção de tecnologias a partir dos nomes de ficheiros e do package.json.
// Módulo puro (sem React, sem DOM).

const POR_DEPENDENCIA: [string, string][] = [
  ['react', 'React'],
  ['next', 'Next.js'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['vite', 'Vite'],
  ['typescript', 'TypeScript'],
  ['electron', 'Electron'],
  ['express', 'Express'],
  ['tailwindcss', 'Tailwind CSS'],
  ['three', 'Three.js'],
  ['remotion', 'Remotion'],
  ['vitest', 'Vitest'],
  ['jest', 'Jest'],
  ['eslint', 'ESLint'],
  ['oxlint', 'Oxlint'],
]

function dependencias(pkg: unknown): Record<string, unknown> {
  if (typeof pkg !== 'object' || pkg === null) return {}
  const p = pkg as Record<string, unknown>
  const juntar = (v: unknown) => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
  return { ...juntar(p.dependencies), ...juntar(p.devDependencies) }
}

/**
 * @param ficheiros nomes das entradas no nível de topo da pasta do projeto
 * @param pkg conteúdo já interpretado do package.json (ou null)
 */
export function detetarTecnologias(ficheiros: string[], pkg: unknown): string[] {
  const lista: string[] = []
  const add = (t: string) => {
    if (!lista.includes(t)) lista.push(t)
  }
  const nomes = ficheiros.map((f) => f.toLowerCase())

  if (nomes.includes('package.json')) add('Node.js')
  const deps = dependencias(pkg)
  for (const [dep, nome] of POR_DEPENDENCIA) {
    if (Object.hasOwn(deps, dep)) add(nome)
  }

  if (nomes.includes('tsconfig.json')) add('TypeScript')
  if (nomes.some((n) => /^vite\.config\.(ts|js|mjs|cjs|mts)$/.test(n))) add('Vite')
  if (nomes.some((n) => n === 'requirements.txt' || n === 'pyproject.toml' || n.endsWith('.py'))) add('Python')
  if (nomes.some((n) => n.endsWith('.ps1'))) add('PowerShell')
  if (nomes.includes('.git')) add('Git')

  return lista.slice(0, 20)
}

/** Conta quantos projetos usam cada tecnologia, do mais usado para o menos usado. */
export function contarTecnologias(listas: (string[] | undefined)[]): { nome: string; total: number }[] {
  const contagem = new Map<string, number>()
  for (const lista of listas) {
    for (const t of lista ?? []) contagem.set(t, (contagem.get(t) ?? 0) + 1)
  }
  return [...contagem]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt'))
}
