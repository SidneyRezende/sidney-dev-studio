// Fornecedores de IA e biblioteca de prompts. Módulo puro (sem React, sem DOM).
// Regra: nada aqui guarda ou aceita chaves API.
import type { CategoriaPrompt, Fornecedor, Prompt, Video } from '../data'
import { LIMITES, endpointValido, pareceChave, validarFornecedor, validarPrompt } from './schema.ts'

type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

export const ERRO_CHAVE = 'Isto parece uma chave API ou token. Por segurança, as chaves nunca são guardadas na app — ficam no .env de um servidor local.'

export interface CamposFornecedor {
  nome: string
  modelo: string
  endpoint: string
  notas: string
}

export function construirFornecedor(c: CamposFornecedor, id: number, agora = new Date()): Resultado<Fornecedor> {
  const nome = c.nome.trim()
  const modelo = c.modelo.trim()
  const endpoint = c.endpoint.trim()
  const notas = c.notas.trim()
  if (!nome) return { ok: false, erro: 'O nome é obrigatório.' }
  if (!modelo) return { ok: false, erro: 'O modelo é obrigatório.' }
  if (!endpoint) return { ok: false, erro: 'O endpoint é obrigatório.' }
  if (nome.length > LIMITES.nomeFornecedor) return { ok: false, erro: `O nome pode ter no máximo ${LIMITES.nomeFornecedor} caracteres.` }
  if (modelo.length > LIMITES.modelo) return { ok: false, erro: `O modelo pode ter no máximo ${LIMITES.modelo} caracteres.` }
  if (endpoint.length > LIMITES.endpoint) return { ok: false, erro: `O endpoint pode ter no máximo ${LIMITES.endpoint} caracteres.` }
  if (notas.length > LIMITES.notas) return { ok: false, erro: `As notas podem ter no máximo ${LIMITES.notas} caracteres.` }
  if ([nome, modelo, endpoint, notas].some(pareceChave)) return { ok: false, erro: ERRO_CHAVE }
  if (!endpointValido(endpoint)) {
    return {
      ok: false,
      erro: 'Endpoint inválido: usa https:// (ou http://localhost), sem utilizador/palavra-passe e sem chaves ou tokens no URL.',
    }
  }
  const f = validarFornecedor({ id, nome, modelo, endpoint, notas, atualizado: agora.toISOString() })
  return f ? { ok: true, valor: f } : { ok: false, erro: ERRO_CHAVE }
}

export interface CamposPrompt {
  titulo: string
  categoria: CategoriaPrompt
  texto: string
}

export function construirPrompt(c: CamposPrompt, id: number, agora = new Date()): Resultado<Prompt> {
  const titulo = c.titulo.trim()
  const texto = c.texto.replace(/\s+$/, '')
  if (!titulo) return { ok: false, erro: 'O título é obrigatório.' }
  if (!texto.trim()) return { ok: false, erro: 'O texto do prompt é obrigatório.' }
  if (titulo.length > LIMITES.tituloPrompt) return { ok: false, erro: `O título pode ter no máximo ${LIMITES.tituloPrompt} caracteres.` }
  if (texto.length > LIMITES.textoPrompt) return { ok: false, erro: `O prompt pode ter no máximo ${LIMITES.textoPrompt} caracteres.` }
  if (pareceChave(titulo) || pareceChave(texto)) return { ok: false, erro: ERRO_CHAVE }
  const p = validarPrompt({ id, titulo, categoria: c.categoria, texto, atualizado: agora.toISOString() })
  return p ? { ok: true, valor: p } : { ok: false, erro: 'Há campos inválidos. Verifica os dados.' }
}

const VARIAVEL = /\{([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*)\}/g

/** Nomes das variáveis {assim}, pela ordem em que aparecem, sem repetidos. */
export function extrairVariaveis(texto: string): string[] {
  const nomes: string[] = []
  for (const m of texto.matchAll(VARIAVEL)) if (!nomes.includes(m[1])) nomes.push(m[1])
  return nomes
}

/** Substitui {variavel} pelos valores preenchidos; as vazias ficam como estão. */
export function preencherPrompt(texto: string, valores: Record<string, string>): string {
  return texto.replace(VARIAVEL, (original, nome: string) => {
    const v = valores[nome]
    return v !== undefined && v.trim() !== '' ? v : original
  })
}

/** Variáveis que ainda não foram preenchidas. */
export function variaveisEmFalta(texto: string, valores: Record<string, string>): string[] {
  return extrairVariaveis(texto).filter((n) => !(valores[n] ?? '').trim())
}

/** Valores automáticos a partir de um vídeo do quadro do YouTube. */
export function valoresDoVideo(v: Video): Record<string, string> {
  return {
    titulo: v.titulo,
    tema: v.titulo,
    descricao: v.descricao,
    roteiro: v.roteiro,
    etiquetas: v.etiquetas.join(', '),
    estado: v.estado,
  }
}

export type FiltroCategoria = 'todas' | CategoriaPrompt

export function filtrarPrompts(lista: Prompt[], filtro: FiltroCategoria): Prompt[] {
  return lista.filter((p) => filtro === 'todas' || p.categoria === filtro).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt'))
}
