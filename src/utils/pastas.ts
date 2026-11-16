// Leitura de pastas com a File System Access API (Edge/Chrome).
// Regras: só corre quando o utilizador escolhe uma pasta na janela do navegador;
// pede apenas permissão de LEITURA; lê só os nomes das entradas de 1 nível
// e o package.json de cada projeto. Nunca escreve nem apaga nada.
import { detetarTecnologias } from './tecnologias'
import { decodificarTexto, extrairDescricao, linguagemPorExtensao } from '../store/scripts'
import type { LinguagemScript } from '../data'

interface EntradaFicheiro {
  kind: 'file'
  name: string
  getFile(): Promise<File>
}

export interface EntradaPasta {
  kind: 'directory'
  name: string
  values(): AsyncIterable<EntradaFicheiro | EntradaPasta>
  getFileHandle(nome: string): Promise<EntradaFicheiro>
}

interface JanelaComSeletor {
  showDirectoryPicker?: (opcoes?: { mode?: 'read'; id?: string }) => Promise<EntradaPasta>
}

export interface ProjetoDetetado {
  nome: string
  /** Nome da subpasta dentro da pasta escolhida ('' se for a própria pasta). */
  subpasta: string
  tecnologias: string[]
}

export interface ResultadoAnalise {
  raiz: string
  projetos: ProjetoDetetado[]
}

const MAX_PASTAS = 200
const MAX_ENTRADAS = 500
const MAX_PACKAGE_JSON = 512 * 1024
const MARCADORES_PROJETO = ['package.json', 'pyproject.toml', 'requirements.txt', 'tsconfig.json']

export function seletorDisponivel(): boolean {
  return typeof (window as JanelaComSeletor).showDirectoryPicker === 'function'
}

/** Abre a janela do navegador. Devolve null se o utilizador cancelar. */
export async function escolherPasta(id = 'sds-desenvolvimento'): Promise<EntradaPasta | null> {
  const janela = window as JanelaComSeletor
  if (!janela.showDirectoryPicker) return null
  try {
    return await janela.showDirectoryPicker({ mode: 'read', id })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

async function listarNomes(pasta: EntradaPasta): Promise<string[]> {
  const nomes: string[] = []
  for await (const entrada of pasta.values()) {
    nomes.push(entrada.name)
    if (nomes.length >= MAX_ENTRADAS) break
  }
  return nomes
}

async function lerPackageJson(pasta: EntradaPasta): Promise<unknown> {
  try {
    const ficheiro = await (await pasta.getFileHandle('package.json')).getFile()
    if (ficheiro.size > MAX_PACKAGE_JSON) return null
    return JSON.parse(await ficheiro.text())
  } catch {
    return null
  }
}

async function analisarProjeto(pasta: EntradaPasta, subpasta: string): Promise<ProjetoDetetado> {
  const nomes = await listarNomes(pasta)
  const pkg = nomes.includes('package.json') ? await lerPackageJson(pasta) : null
  return { nome: pasta.name, subpasta, tecnologias: detetarTecnologias(nomes, pkg) }
}

/**
 * Se a pasta escolhida já for um projeto, devolve-a; caso contrário trata
 * cada subpasta (exceto ocultas e node_modules) como um projeto.
 */
export async function analisarPasta(raiz: EntradaPasta): Promise<ResultadoAnalise> {
  const nomesRaiz = (await listarNomes(raiz)).map((n) => n.toLowerCase())
  if (nomesRaiz.some((n) => MARCADORES_PROJETO.includes(n))) {
    return { raiz: raiz.name, projetos: [await analisarProjeto(raiz, '')] }
  }

  const projetos: ProjetoDetetado[] = []
  for await (const entrada of raiz.values()) {
    if (entrada.kind !== 'directory') continue
    if (entrada.name.startsWith('.') || entrada.name === 'node_modules') continue
    projetos.push(await analisarProjeto(entrada, entrada.name))
    if (projetos.length >= MAX_PASTAS) break
  }
  projetos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  return { raiz: raiz.name, projetos }
}

// ---------- Scripts (Etapa 5) ----------

export interface ScriptDetetado {
  nome: string
  /** Caminho relativo à pasta escolhida, com "\" (ex.: "sub\script.py"). */
  relativo: string
  linguagem: LinguagemScript
  descricao: string
}

export interface ResultadoScripts {
  raiz: string
  scripts: ScriptDetetado[]
}

const MAX_SCRIPTS = 300
const BYTES_DESCRICAO = 4096
const PASTAS_IGNORADAS = new Set(['node_modules', '__pycache__', 'venv', 'env', 'site-packages'])

async function procurarScripts(pasta: EntradaPasta, prefixo: string, nivel: number, saida: ScriptDetetado[]): Promise<void> {
  for await (const e of pasta.values()) {
    if (saida.length >= MAX_SCRIPTS) return
    if (e.name.startsWith('.')) continue
    if (e.kind === 'directory') {
      // Desce no máximo 2 níveis e ignora pastas de dependências.
      if (nivel < 2 && !PASTAS_IGNORADAS.has(e.name.toLowerCase())) await procurarScripts(e, `${prefixo}${e.name}\\`, nivel + 1, saida)
      continue
    }
    const linguagem = linguagemPorExtensao(e.name)
    if (!linguagem) continue
    let descricao = ''
    try {
      // Lê só os primeiros 4 KB, para a descrição.
      const inicio = (await e.getFile()).slice(0, BYTES_DESCRICAO)
      descricao = extrairDescricao(decodificarTexto(new Uint8Array(await inicio.arrayBuffer())), linguagem)
    } catch {
      // Ficheiro ilegível: fica sem descrição.
    }
    saida.push({ nome: e.name, relativo: `${prefixo}${e.name}`, linguagem, descricao })
  }
}

/** Lista ficheiros .py/.pyw/.ps1 da pasta escolhida (até 2 subníveis). Só leitura. */
export async function listarScripts(raiz: EntradaPasta): Promise<ResultadoScripts> {
  const scripts: ScriptDetetado[] = []
  await procurarScripts(raiz, '', 0, scripts)
  scripts.sort((a, b) => a.relativo.localeCompare(b.relativo, 'pt'))
  return { raiz: raiz.name, scripts }
}
