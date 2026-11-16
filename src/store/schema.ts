// Formato e validação dos dados guardados.
// Módulo puro (sem React, sem DOM) para poder ser testado isoladamente.
import type {
  AppData,
  AreaId,
  CategoriaPrompt,
  Estado,
  EstadoVideo,
  Fornecedor,
  Ideia,
  LinguagemScript,
  Projeto,
  Prompt,
  Script,
  Video,
} from '../data'

export const STORAGE_KEY = 'sds:v1'
export const BACKUP_APP_ID = 'sidney-dev-studio'
export const BACKUP_MAX_BYTES = 1_000_000

/** Limites de texto (título, descrição e etiquetas seguem os limites do YouTube). */
export const LIMITES = {
  tituloVideo: 100,
  descricaoVideo: 5000,
  etiquetaVideo: 100,
  etiquetasTotal: 500,
  roteiro: 50_000,
  ideia: 500,
  nomeScript: 120,
  caminho: 260,
  descricaoScript: 1000,
  argumentos: 500,
  nomeFornecedor: 80,
  modelo: 100,
  endpoint: 300,
  notas: 500,
  tituloPrompt: 120,
  textoPrompt: 10_000,
} as const

export const CATEGORIAS_PROMPT = ['YouTube', 'Desenvolvimento', 'Automação', 'Geral'] as const satisfies readonly CategoriaPrompt[]
const CATEGORIAS_TXT: readonly string[] = CATEGORIAS_PROMPT

// ---------- Proteção contra chaves API ----------

/** Padrões de chaves/tokens conhecidos (Anthropic, OpenAI, Google, GitHub, Slack, AWS, JWT). */
const PADROES_CHAVE: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{8,}/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  /\bBearer\s+[A-Za-z0-9._-]{16,}/i,
]

/** true se o texto parecer conter uma chave API ou token. */
export function pareceChave(texto: string): boolean {
  return PADROES_CHAVE.some((p) => p.test(texto))
}

/** Para campos curtos (nome, modelo): também recusa sequências longas sem espaços típicas de chaves. */
function pareceChaveEstrita(texto: string): boolean {
  return pareceChave(texto) || /[A-Za-z0-9_-]{40,}/.test(texto)
}

const PARAMS_SECRETOS = /^(key|api[-_]?key|apikey|token|access[-_]?token|secret|password|auth)$/i

/**
 * Endpoint aceite: https:// (ou http:// só para localhost/127.0.0.1),
 * sem utilizador/palavra-passe no URL e sem parâmetros de chave/token.
 */
export function endpointValido(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return false
  if (u.username || u.password) return false
  for (const nome of u.searchParams.keys()) if (PARAMS_SECRETOS.test(nome)) return false
  return !pareceChave(url)
}

export const LINGUAGENS = ['Python', 'PowerShell'] as const satisfies readonly LinguagemScript[]
const LINGUAGENS_TXT: readonly string[] = LINGUAGENS

export const ESTADOS_VIDEO = ['Ideia', 'Roteiro', 'Gravação', 'Edição', 'Publicado'] as const satisfies readonly EstadoVideo[]

const AREA_IDS: readonly string[] = ['dev', 'youtube', 'auto', 'ia'] satisfies AreaId[]
const ESTADOS: readonly string[] = ['Em curso', 'Concluído', 'Planeado'] satisfies Estado[]
const ESTADOS_VIDEO_TXT: readonly string[] = ESTADOS_VIDEO
const MAX_ITENS = 5000

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function textoCurto(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= max ? t : null
}

function idValido(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1
}

function dataIsoValida(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
}

/** Valida 'AAAA-MM-DD' (dia real do calendário). */
export function diaValido(v: unknown): v is string {
  if (typeof v !== 'string') return false
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return false
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(a, mes - 1, d)
  return data.getFullYear() === a && data.getMonth() === mes - 1 && data.getDate() === d
}

export function validarProjeto(v: unknown): Projeto | null {
  if (!isObj(v)) return null
  const { id, nome, area, estado, progresso, atualizado, pasta, tecnologias } = v

  if (!idValido(id)) return null
  const nomeOk = textoCurto(nome, 120)
  if (!nomeOk) return null
  if (typeof area !== 'string' || !AREA_IDS.includes(area)) return null
  if (typeof estado !== 'string' || !ESTADOS.includes(estado)) return null
  if (typeof progresso !== 'number' || !Number.isFinite(progresso)) return null
  if (!dataIsoValida(atualizado)) return null

  const projeto: Projeto = {
    id,
    nome: nomeOk,
    area: area as AreaId,
    estado: estado as Estado,
    progresso: Math.min(100, Math.max(0, Math.round(progresso))),
    atualizado,
  }

  if (pasta !== undefined) {
    const p = textoCurto(pasta, 260)
    if (!p) return null
    projeto.pasta = p
  }

  if (tecnologias !== undefined) {
    if (!Array.isArray(tecnologias) || tecnologias.length > 20) return null
    const lista = tecnologias.map((t) => textoCurto(t, 40))
    if (lista.some((t) => t === null)) return null
    projeto.tecnologias = lista as string[]
  }

  return projeto
}

export function validarVideo(v: unknown): Video | null {
  if (!isObj(v)) return null
  const { id, titulo, descricao, etiquetas, dataPrevista, estado, roteiro, atualizado } = v

  if (!idValido(id)) return null
  const tituloOk = textoCurto(titulo, LIMITES.tituloVideo)
  if (!tituloOk) return null
  if (typeof descricao !== 'string' || descricao.length > LIMITES.descricaoVideo) return null
  if (typeof roteiro !== 'string' || roteiro.length > LIMITES.roteiro) return null
  if (typeof estado !== 'string' || !ESTADOS_VIDEO_TXT.includes(estado)) return null
  if (!dataIsoValida(atualizado)) return null
  if (dataPrevista !== undefined && !diaValido(dataPrevista)) return null

  if (!Array.isArray(etiquetas)) return null
  const tags = etiquetas.map((t) => textoCurto(t, LIMITES.etiquetaVideo))
  if (tags.some((t) => t === null)) return null
  if ((tags as string[]).join(',').length > LIMITES.etiquetasTotal) return null

  const video: Video = {
    id,
    titulo: tituloOk,
    descricao,
    etiquetas: tags as string[],
    estado: estado as EstadoVideo,
    roteiro,
    atualizado,
  }
  if (dataPrevista !== undefined) video.dataPrevista = dataPrevista
  return video
}

export function validarIdeia(v: unknown): Ideia | null {
  if (!isObj(v)) return null
  const { id, texto, criada } = v
  if (!idValido(id)) return null
  const textoOk = textoCurto(texto, LIMITES.ideia)
  if (!textoOk || !dataIsoValida(criada)) return null
  return { id, texto: textoOk, criada }
}

export function validarScript(v: unknown): Script | null {
  if (!isObj(v)) return null
  const { id, nome, linguagem, caminho, descricao, argumentos, atualizado } = v
  if (!idValido(id)) return null
  const nomeOk = textoCurto(nome, LIMITES.nomeScript)
  const caminhoOk = textoCurto(caminho, LIMITES.caminho)
  if (!nomeOk || !caminhoOk) return null
  if (typeof linguagem !== 'string' || !LINGUAGENS_TXT.includes(linguagem)) return null
  if (typeof descricao !== 'string' || descricao.length > LIMITES.descricaoScript) return null
  if (typeof argumentos !== 'string' || argumentos.length > LIMITES.argumentos || /[\r\n]/.test(argumentos)) return null
  if (!dataIsoValida(atualizado)) return null
  return { id, nome: nomeOk, linguagem: linguagem as LinguagemScript, caminho: caminhoOk, descricao, argumentos, atualizado }
}

export function validarFornecedor(v: unknown): Fornecedor | null {
  if (!isObj(v)) return null
  const { id, nome, modelo, endpoint, notas, atualizado } = v
  if (!idValido(id)) return null
  const nomeOk = textoCurto(nome, LIMITES.nomeFornecedor)
  const modeloOk = textoCurto(modelo, LIMITES.modelo)
  const endpointOk = textoCurto(endpoint, LIMITES.endpoint)
  if (!nomeOk || !modeloOk || !endpointOk) return null
  if (typeof notas !== 'string' || notas.length > LIMITES.notas) return null
  if (!dataIsoValida(atualizado)) return null
  // Nenhum campo pode conter algo parecido com uma chave.
  if (pareceChaveEstrita(nomeOk) || pareceChaveEstrita(modeloOk) || pareceChave(notas)) return null
  if (!endpointValido(endpointOk)) return null
  return { id, nome: nomeOk, modelo: modeloOk, endpoint: endpointOk, notas, atualizado }
}

export function validarPrompt(v: unknown): Prompt | null {
  if (!isObj(v)) return null
  const { id, titulo, categoria, texto, atualizado } = v
  if (!idValido(id)) return null
  const tituloOk = textoCurto(titulo, LIMITES.tituloPrompt)
  if (!tituloOk) return null
  if (typeof categoria !== 'string' || !CATEGORIAS_TXT.includes(categoria)) return null
  if (typeof texto !== 'string' || !texto.trim() || texto.length > LIMITES.textoPrompt) return null
  if (!dataIsoValida(atualizado)) return null
  if (pareceChave(tituloOk) || pareceChave(texto)) return null
  return { id, titulo: tituloOk, categoria: categoria as CategoriaPrompt, texto, atualizado }
}

/** Valida uma lista; devolve null se algum item for inválido ou houver ids repetidos. */
function validarLista<T extends { id: number }>(raw: unknown, validar: (v: unknown) => T | null): T[] | null {
  if (raw === undefined) return [] // migração: listas novas em dados antigos
  if (!Array.isArray(raw) || raw.length > MAX_ITENS) return null
  const lista: T[] = []
  const ids = new Set<number>()
  for (const item of raw) {
    const ok = validar(item)
    if (!ok || ids.has(ok.id)) return null
    ids.add(ok.id)
    lista.push(ok)
  }
  return lista
}

/** Valida dados vindos do localStorage ou de um backup. Devolve null se forem inválidos. */
export function validarDados(raw: unknown): AppData | null {
  if (!isObj(raw) || raw.versao !== 1 || !Array.isArray(raw.projetos)) return null
  const projetos = validarLista(raw.projetos, validarProjeto)
  const videos = validarLista(raw.videos, validarVideo)
  const ideias = validarLista(raw.ideias, validarIdeia)
  const scripts = validarLista(raw.scripts, validarScript)
  const fornecedores = validarLista(raw.fornecedores, validarFornecedor)
  const prompts = validarLista(raw.prompts, validarPrompt)
  if (!projetos || !videos || !ideias || !scripts || !fornecedores || !prompts) return null
  return { versao: 1, projetos, videos, ideias, scripts, fornecedores, prompts }
}

/** Gera o texto JSON de um ficheiro de backup. */
export function criarBackup(dados: AppData, agora = new Date()): string {
  return JSON.stringify(
    { app: BACKUP_APP_ID, exportadoEm: agora.toISOString(), ...dados },
    null,
    2,
  )
}

/** Lê o texto de um ficheiro de backup. Devolve null se não for um backup válido desta app. */
export function lerBackup(texto: string): AppData | null {
  let raw: unknown
  try {
    raw = JSON.parse(texto)
  } catch {
    return null
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP_ID) return null
  return validarDados(raw)
}
