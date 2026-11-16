// Operações sobre a lista de projetos. Módulo puro (sem React, sem DOM).
// Nota: estas funções só alteram os dados da app — nunca tocam no disco.
import type { AreaId, Estado, Projeto } from '../data'
import { validarProjeto } from './schema.ts'

export interface CamposProjeto {
  nome: string
  area: AreaId
  estado: Estado
  progresso: number
  pasta: string
  /** Texto separado por vírgulas, como escrito no formulário. */
  tecnologias: string
}

export type ResultadoProjeto = { ok: true; projeto: Projeto } | { ok: false; erro: string }

/** "React, vite , React" → ["React", "vite"] (sem vazios nem repetidos). */
export function lerTecnologias(texto: string): string[] {
  const vistos = new Set<string>()
  const lista: string[] = []
  for (const parte of texto.split(',')) {
    const t = parte.trim()
    const chave = t.toLowerCase()
    if (!t || vistos.has(chave)) continue
    vistos.add(chave)
    lista.push(t)
  }
  return lista
}

export function proximoId(lista: Projeto[]): number {
  return lista.reduce((max, p) => Math.max(max, p.id), 0) + 1
}

/** Valida os campos do formulário e devolve o projeto pronto a guardar. */
export function construirProjeto(campos: CamposProjeto, id: number, agora = new Date()): ResultadoProjeto {
  const nome = campos.nome.trim()
  if (!nome) return { ok: false, erro: 'O nome é obrigatório.' }
  if (nome.length > 120) return { ok: false, erro: 'O nome pode ter no máximo 120 caracteres.' }

  const pasta = campos.pasta.trim()
  if (pasta.length > 260) return { ok: false, erro: 'O caminho da pasta pode ter no máximo 260 caracteres.' }

  const tecnologias = lerTecnologias(campos.tecnologias)
  if (tecnologias.length > 20) return { ok: false, erro: 'Máximo de 20 tecnologias.' }
  if (tecnologias.some((t) => t.length > 40)) {
    return { ok: false, erro: 'Cada tecnologia pode ter no máximo 40 caracteres.' }
  }

  const projeto = validarProjeto({
    id,
    nome,
    area: campos.area,
    estado: campos.estado,
    progresso: campos.progresso,
    atualizado: agora.toISOString(),
    ...(pasta ? { pasta } : {}),
    ...(tecnologias.length ? { tecnologias } : {}),
  })
  return projeto ? { ok: true, projeto } : { ok: false, erro: 'Há campos inválidos. Verifica os dados.' }
}

/** Acrescenta o projeto ou substitui o que tiver o mesmo id. */
export function guardarProjeto(lista: Projeto[], projeto: Projeto): Projeto[] {
  const i = lista.findIndex((p) => p.id === projeto.id)
  if (i === -1) return [...lista, projeto]
  const copia = [...lista]
  copia[i] = projeto
  return copia
}

/** Remove o registo da app (não apaga nada no disco). */
export function removerProjeto(lista: Projeto[], id: number): Projeto[] {
  return lista.filter((p) => p.id !== id)
}

export type Filtro = 'recentes' | 'ativos' | 'concluidos' | 'todos'

/** Filtra e ordena do mais recente para o mais antigo. */
export function filtrarProjetos(lista: Projeto[], filtro: Filtro): Projeto[] {
  const ordenados = [...lista].sort((a, b) => Date.parse(b.atualizado) - Date.parse(a.atualizado))
  switch (filtro) {
    case 'recentes':
      return ordenados.slice(0, 5)
    case 'ativos':
      return ordenados.filter((p) => p.estado === 'Em curso')
    case 'concluidos':
      return ordenados.filter((p) => p.estado === 'Concluído')
    case 'todos':
      return ordenados
  }
}
