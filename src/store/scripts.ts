// Catálogo de scripts. Módulo puro (sem React, sem DOM).
// A app NUNCA executa scripts: só gera o comando para o utilizador copiar.
import type { LinguagemScript, Script } from '../data'
import { LIMITES, validarScript } from './schema.ts'
import { normalizarTexto } from './videos.ts'

export interface CamposScript {
  nome: string
  linguagem: LinguagemScript
  caminho: string
  descricao: string
  argumentos: string
}

type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string }

export const EXTENSOES: Record<LinguagemScript, string[]> = {
  Python: ['.py', '.pyw'],
  PowerShell: ['.ps1'],
}

export function linguagemPorExtensao(nome: string): LinguagemScript | null {
  const n = nome.trim().toLowerCase()
  if (EXTENSOES.Python.some((e) => n.endsWith(e))) return 'Python'
  if (EXTENSOES.PowerShell.some((e) => n.endsWith(e))) return 'PowerShell'
  return null
}

/** Nome do ficheiro no fim de um caminho Windows ou Unix. */
export function nomeFicheiro(caminho: string): string {
  return caminho.trim().split(/[\\/]/).pop() ?? ''
}

/** Comando para colar num terminal. Não altera políticas do sistema. */
export function comandoScript(s: { linguagem: LinguagemScript; caminho: string; argumentos?: string }): string {
  const base = s.linguagem === 'Python' ? `python "${s.caminho.trim()}"` : `powershell -NoProfile -File "${s.caminho.trim()}"`
  const args = (s.argumentos ?? '').trim()
  return args ? `${base} ${args}` : base
}

export function construirScript(c: CamposScript, id: number, agora = new Date()): Resultado<Script> {
  const nome = c.nome.trim()
  if (!nome) return { ok: false, erro: 'O nome é obrigatório.' }
  if (nome.length > LIMITES.nomeScript) return { ok: false, erro: `O nome pode ter no máximo ${LIMITES.nomeScript} caracteres.` }

  const caminho = c.caminho.trim()
  if (!caminho) return { ok: false, erro: 'O caminho do ficheiro é obrigatório.' }
  if (caminho.length > LIMITES.caminho) return { ok: false, erro: `O caminho pode ter no máximo ${LIMITES.caminho} caracteres.` }
  if (linguagemPorExtensao(caminho) !== c.linguagem) {
    return { ok: false, erro: `Um script ${c.linguagem} deve terminar em ${EXTENSOES[c.linguagem].join(' ou ')}.` }
  }

  const descricao = c.descricao.trim()
  if (descricao.length > LIMITES.descricaoScript) {
    return { ok: false, erro: `A descrição pode ter no máximo ${LIMITES.descricaoScript} caracteres.` }
  }

  const argumentos = c.argumentos.trim()
  if (/[\r\n]/.test(argumentos)) return { ok: false, erro: 'Os argumentos devem estar numa só linha.' }
  if (argumentos.length > LIMITES.argumentos) return { ok: false, erro: `Os argumentos podem ter no máximo ${LIMITES.argumentos} caracteres.` }

  const script = validarScript({ id, nome, linguagem: c.linguagem, caminho, descricao, argumentos, atualizado: agora.toISOString() })
  return script ? { ok: true, valor: script } : { ok: false, erro: 'Há campos inválidos. Verifica os dados.' }
}

export type FiltroLinguagem = 'todos' | LinguagemScript

/** Filtra por linguagem e pesquisa (nome, descrição, caminho); ordena por nome. */
export function filtrarScripts(lista: Script[], filtro: FiltroLinguagem, pesquisa: string): Script[] {
  const q = normalizarTexto(pesquisa.trim())
  return lista
    .filter((s) => filtro === 'todos' || s.linguagem === filtro)
    .filter((s) => !q || [s.nome, s.descricao, s.caminho].some((t) => normalizarTexto(t).includes(q)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}

/** Descodifica texto respeitando BOM UTF-16 (comum em scripts PowerShell). */
export function decodificarTexto(bytes: Uint8Array): string {
  let codificacao = 'utf-8'
  if (bytes[0] === 0xff && bytes[1] === 0xfe) codificacao = 'utf-16le'
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) codificacao = 'utf-16be'
  return new TextDecoder(codificacao).decode(bytes)
}

const limpar = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 200)

/**
 * Tenta obter uma descrição curta do início do script:
 * Python → docstring do módulo ou primeiro comentário;
 * PowerShell → .SYNOPSIS da ajuda <# #> ou primeiro comentário.
 */
export function extrairDescricao(texto: string, linguagem: LinguagemScript): string {
  const linhas = texto.split(/\r?\n/).slice(0, 60).map((l) => l.trim())

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    if (!l) continue

    if (linguagem === 'Python') {
      if (l.startsWith('#!') || /^#.*coding[:=]/.test(l)) continue
      const doc = /^[rRuU]?("""|''')(.*)$/.exec(l)
      if (doc) {
        const [, aspas, resto] = doc
        if (resto.includes(aspas)) return limpar(resto.split(aspas)[0])
        if (resto.trim()) return limpar(resto)
        for (let j = i + 1; j < linhas.length; j++) {
          const m = linhas[j]
          if (m.includes(aspas)) return limpar(m.split(aspas)[0])
          if (m) return limpar(m)
        }
        return ''
      }
    } else {
      if (/^#requires/i.test(l)) continue
      if (l.startsWith('<#')) {
        const bloco: string[] = []
        let atual = l.slice(2)
        for (let j = i; j < linhas.length; ) {
          if (atual.includes('#>')) {
            bloco.push(atual.split('#>')[0].trim())
            break
          }
          bloco.push(atual.trim())
          j++
          atual = linhas[j] ?? ''
        }
        const k = bloco.findIndex((x) => /^\.SYNOPSIS$/i.test(x))
        const escolhida = (k >= 0 ? bloco.slice(k + 1) : bloco).find((x) => x && !x.startsWith('.'))
        return escolhida ? limpar(escolhida) : ''
      }
    }

    if (l.startsWith('#')) {
      const comentario = l.replace(/^#+/, '').trim()
      if (comentario) return limpar(comentario)
      continue
    }
    return '' // primeira linha de código: sem descrição
  }
  return ''
}

/** Números de linha para o visualizador (um único bloco de texto: leve para a memória). */
export function numerarLinhas(texto: string): { total: number; numeros: string } {
  const total = texto === '' ? 1 : texto.split('\n').length
  return { total, numeros: Array.from({ length: total }, (_, i) => i + 1).join('\n') }
}
