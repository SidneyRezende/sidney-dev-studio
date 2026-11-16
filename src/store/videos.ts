// Operações sobre vídeos e ideias. Módulo puro (sem React, sem DOM).
import type { EstadoVideo, Ideia, Video } from '../data'
import { ESTADOS_VIDEO, LIMITES, diaValido, validarIdeia, validarVideo } from './schema.ts'

export interface CamposVideo {
  titulo: string
  descricao: string
  /** Texto separado por vírgulas. */
  etiquetas: string
  /** '' ou AAAA-MM-DD */
  dataPrevista: string
  estado: EstadoVideo
  roteiro: string
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

// ---------- Listas genéricas ----------

export function proximoIdDe(lista: { id: number }[]): number {
  return lista.reduce((max, x) => Math.max(max, x.id), 0) + 1
}

export function guardarPorId<T extends { id: number }>(lista: T[], item: T): T[] {
  const i = lista.findIndex((x) => x.id === item.id)
  if (i === -1) return [...lista, item]
  const copia = [...lista]
  copia[i] = item
  return copia
}

export function removerPorId<T extends { id: number }>(lista: T[], id: number): T[] {
  return lista.filter((x) => x.id !== id)
}

// ---------- Texto ----------

/** "a, B , a,," → ["a", "B"] (sem vazios nem repetidos, ignorando maiúsculas). */
export function lerListaCSV(texto: string): string[] {
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

export function contarPalavras(texto: string): number {
  const t = texto.trim()
  return t ? t.split(/\s+/).length : 0
}

/** Minutos de narração estimados (~150 palavras por minuto). */
export function minutosNarracao(palavras: number): number {
  return palavras === 0 ? 0 : Math.max(1, Math.round(palavras / 150))
}

/** Minúsculas e sem acentos, para pesquisas. */
export function normalizarTexto(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// ---------- Vídeos ----------

export function construirVideo(c: CamposVideo, id: number, agora = new Date()): Resultado<Video> {
  const titulo = c.titulo.trim()
  if (!titulo) return { ok: false, erro: 'O título é obrigatório.' }
  if (titulo.length > LIMITES.tituloVideo) return { ok: false, erro: `O título pode ter no máximo ${LIMITES.tituloVideo} caracteres.` }

  const descricao = c.descricao.trim()
  if (descricao.length > LIMITES.descricaoVideo) {
    return { ok: false, erro: `A descrição pode ter no máximo ${LIMITES.descricaoVideo} caracteres.` }
  }

  const etiquetas = lerListaCSV(c.etiquetas)
  if (etiquetas.some((t) => t.length > LIMITES.etiquetaVideo)) {
    return { ok: false, erro: `Cada etiqueta pode ter no máximo ${LIMITES.etiquetaVideo} caracteres.` }
  }
  if (etiquetas.join(',').length > LIMITES.etiquetasTotal) {
    return { ok: false, erro: `As etiquetas podem ter no máximo ${LIMITES.etiquetasTotal} caracteres no total.` }
  }

  const dataPrevista = c.dataPrevista.trim()
  if (dataPrevista && !diaValido(dataPrevista)) return { ok: false, erro: 'A data prevista não é válida.' }

  const roteiro = c.roteiro.replace(/\s+$/, '')
  if (roteiro.length > LIMITES.roteiro) return { ok: false, erro: `O roteiro pode ter no máximo ${LIMITES.roteiro} caracteres.` }

  const video = validarVideo({
    id,
    titulo,
    descricao,
    etiquetas,
    estado: c.estado,
    roteiro,
    atualizado: agora.toISOString(),
    ...(dataPrevista ? { dataPrevista } : {}),
  })
  return video ? { ok: true, valor: video } : { ok: false, erro: 'Há campos inválidos. Verifica os dados.' }
}

/** Avança (+1) ou recua (-1) no estado de produção. */
export function moverVideo(v: Video, direcao: 1 | -1, agora = new Date()): Video {
  const i = ESTADOS_VIDEO.indexOf(v.estado)
  const j = Math.min(ESTADOS_VIDEO.length - 1, Math.max(0, i + direcao))
  return j === i ? v : { ...v, estado: ESTADOS_VIDEO[j], atualizado: agora.toISOString() }
}

/** Agrupa por estado; dentro de cada grupo: com data primeiro (mais próxima), depois mais recentes. */
export function agruparPorEstado(videos: Video[]): Record<EstadoVideo, Video[]> {
  const grupos = Object.fromEntries(ESTADOS_VIDEO.map((e) => [e, [] as Video[]])) as Record<EstadoVideo, Video[]>
  for (const v of videos) grupos[v.estado].push(v)
  for (const e of ESTADOS_VIDEO) {
    grupos[e].sort((a, b) => {
      if (a.dataPrevista && b.dataPrevista && a.dataPrevista !== b.dataPrevista) return a.dataPrevista < b.dataPrevista ? -1 : 1
      if (a.dataPrevista && !b.dataPrevista) return -1
      if (!a.dataPrevista && b.dataPrevista) return 1
      return Date.parse(b.atualizado) - Date.parse(a.atualizado)
    })
  }
  return grupos
}

/** Pesquisa no título e nas etiquetas (sem distinguir maiúsculas nem acentos). */
export function filtrarVideos(videos: Video[], pesquisa: string): Video[] {
  const q = normalizarTexto(pesquisa.trim())
  if (!q) return videos
  return videos.filter((v) => normalizarTexto(v.titulo).includes(q) || v.etiquetas.some((t) => normalizarTexto(t).includes(q)))
}

// ---------- Ideias ----------

export function construirIdeia(texto: string, id: number, agora = new Date()): Resultado<Ideia> {
  const t = texto.trim()
  if (!t) return { ok: false, erro: 'Escreve a ideia antes de guardar.' }
  if (t.length > LIMITES.ideia) return { ok: false, erro: `A ideia pode ter no máximo ${LIMITES.ideia} caracteres.` }
  const ideia = validarIdeia({ id, texto: t, criada: agora.toISOString() })
  return ideia ? { ok: true, valor: ideia } : { ok: false, erro: 'Ideia inválida.' }
}

/** Campos iniciais de um vídeo criado a partir de uma ideia. */
export function ideiaParaCampos(ideia: Ideia): CamposVideo {
  const curto = ideia.texto.length <= LIMITES.tituloVideo
  return {
    titulo: curto ? ideia.texto : `${ideia.texto.slice(0, LIMITES.tituloVideo - 1).trimEnd()}…`,
    descricao: '',
    etiquetas: '',
    dataPrevista: '',
    estado: 'Ideia',
    roteiro: curto ? '' : ideia.texto,
  }
}
