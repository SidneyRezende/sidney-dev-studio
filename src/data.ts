import type { IconName } from './components/Icon'
import { dataCurta } from './utils/datas'

export type AreaId = 'dev' | 'youtube' | 'auto' | 'ia'
export type View = 'dashboard' | AreaId
export type Estado = 'Em curso' | 'Concluído' | 'Planeado'
export type EstadoVideo = 'Ideia' | 'Roteiro' | 'Gravação' | 'Edição' | 'Publicado'

export interface Video {
  id: number
  titulo: string
  descricao: string
  etiquetas: string[]
  /** Data prevista de publicação, AAAA-MM-DD (opcional). */
  dataPrevista?: string
  estado: EstadoVideo
  roteiro: string
  /** Data ISO da última atualização. */
  atualizado: string
}

export interface Ideia {
  id: number
  texto: string
  /** Data ISO de criação. */
  criada: string
}

export type LinguagemScript = 'Python' | 'PowerShell'

/** Registo de um script no disco. A app nunca o executa nem altera. */
export interface Script {
  id: number
  nome: string
  linguagem: LinguagemScript
  caminho: string
  descricao: string
  /** Argumentos opcionais acrescentados ao comando copiado. */
  argumentos: string
  atualizado: string
}

export interface Area {
  id: AreaId
  nome: string
  descricao: string
  icon: IconName
  cor: string
  ferramentas: string[]
}

export interface Projeto {
  id: number
  nome: string
  area: AreaId
  estado: Estado
  progresso: number
  /** Data ISO da última atualização. */
  atualizado: string
  /** Caminho da pasta no disco (apenas texto; a app nunca mexe na pasta). */
  pasta?: string
  tecnologias?: string[]
}

/** Tudo o que a app guarda no localStorage. */
/** Configuração de um serviço de IA. NUNCA contém chaves API. */
export interface Fornecedor {
  id: number
  nome: string
  modelo: string
  endpoint: string
  notas: string
  atualizado: string
}

export type CategoriaPrompt = 'YouTube' | 'Desenvolvimento' | 'Automação' | 'Geral'

/** Prompt reutilizável. Variáveis escritas como {nome}. */
export interface Prompt {
  id: number
  titulo: string
  categoria: CategoriaPrompt
  texto: string
  atualizado: string
}

export interface AppData {
  versao: 1
  projetos: Projeto[]
  videos: Video[]
  ideias: Ideia[]
  scripts: Script[]
  fornecedores: Fornecedor[]
  prompts: Prompt[]
}

export const AREAS: Area[] = [
  {
    id: 'dev',
    nome: 'Desenvolvimento',
    descricao: 'Aplicações web com React, TypeScript e Vite.',
    icon: 'code',
    cor: '#4f8cff',
    ferramentas: ['Git', 'Node.js', 'React', 'TypeScript', 'Vite', 'VS Code'],
  },
  {
    id: 'youtube',
    nome: 'YouTube',
    descricao: 'Produção e edição leve de vídeo e áudio.',
    icon: 'play',
    cor: '#ff4d5e',
    ferramentas: ['FFmpeg', 'FFprobe', 'yt-dlp'],
  },
  {
    id: 'auto',
    nome: 'Automação',
    descricao: 'Scripts Python e PowerShell para tarefas repetitivas.',
    icon: 'zap',
    cor: '#f5a524',
    ferramentas: ['Python', 'PowerShell', 'pip'],
  },
  {
    id: 'ia',
    nome: 'Inteligência Artificial',
    descricao: 'Integração com serviços de IA online via API.',
    icon: 'sparkles',
    cor: '#a86bff',
    ferramentas: ['APIs na cloud', 'Python', 'Node.js'],
  },
]

function diasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

/** Projetos de exemplo usados na primeira execução e em "Repor exemplos". */
export function criarExemplos(): Projeto[] {
  return [
    {
      id: 1,
      nome: 'meu-app — Sidney Dev Studio',
      area: 'dev',
      estado: 'Em curso',
      progresso: 35,
      atualizado: diasAtras(0),
      // Caminho relativo à pasta do utilizador (onde os terminais abrem por omissão).
      pasta: 'Projetos\\Desenvolvimento\\meu-app',
      tecnologias: ['React', 'TypeScript', 'Vite'],
    },
    { id: 2, nome: 'Portfólio pessoal', area: 'dev', estado: 'Planeado', progresso: 0, atualizado: diasAtras(6) },
    { id: 3, nome: 'Intro do canal (5 s)', area: 'youtube', estado: 'Em curso', progresso: 60, atualizado: diasAtras(1) },
    { id: 4, nome: 'Modelo de miniaturas', area: 'youtube', estado: 'Planeado', progresso: 10, atualizado: diasAtras(3) },
    { id: 5, nome: 'Organizar downloads por data', area: 'auto', estado: 'Concluído', progresso: 100, atualizado: diasAtras(2) },
    { id: 6, nome: 'Converter vídeos em lote', area: 'auto', estado: 'Em curso', progresso: 45, atualizado: diasAtras(0) },
    { id: 7, nome: 'Gerador de títulos e descrições', area: 'ia', estado: 'Planeado', progresso: 5, atualizado: diasAtras(7) },
    { id: 8, nome: 'Transcrição automática', area: 'ia', estado: 'Em curso', progresso: 25, atualizado: diasAtras(1) },
  ]
}

function diaDaqui(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return dataCurta(d)
}

export function criarVideosExemplo(): Video[] {
  return [
    {
      id: 1,
      titulo: 'Como preparar um PC fraco para programar',
      descricao: 'Configuração leve com Git, Node.js, Python e VS Code num computador com 4 GB de RAM.',
      etiquetas: ['programação', 'windows', 'dicas'],
      dataPrevista: diaDaqui(7),
      estado: 'Roteiro',
      roteiro: 'Gancho: dá para programar num PC de 4 GB?\n\n1. Diagnóstico do sistema\n2. Instalações leves\n3. Dicas de memória\n\nFecho: subscreve para a parte 2.',
      atualizado: diasAtras(1),
    },
    {
      id: 2,
      titulo: 'Editar vídeos com FFmpeg em 5 minutos',
      descricao: '',
      etiquetas: ['ffmpeg', 'edição'],
      estado: 'Ideia',
      roteiro: '',
      atualizado: diasAtras(3),
    },
    {
      id: 3,
      titulo: 'Tour pelo Sidney Dev Studio',
      descricao: 'Apresentação do meu painel de produção feito com React e TypeScript.',
      etiquetas: ['react', 'typescript'],
      dataPrevista: diaDaqui(3),
      estado: 'Edição',
      roteiro: 'Mostrar o dashboard, as áreas e o banco de ideias.',
      atualizado: diasAtras(0),
    },
  ]
}

export function criarIdeiasExemplo(): Ideia[] {
  return [
    { id: 1, texto: 'Série: automatizar tarefas repetitivas com Python', criada: diasAtras(2) },
    { id: 2, texto: 'Comparar editores de vídeo leves para PCs fracos', criada: diasAtras(5) },
  ]
}

export function criarScriptsExemplo(): Script[] {
  return [
    {
      id: 1,
      nome: 'organizar_downloads.py',
      linguagem: 'Python',
      caminho: 'Projetos\\Automacao\\organizar_downloads.py',
      descricao: 'Exemplo: organiza a pasta Downloads em subpastas por data. (O ficheiro ainda não existe.)',
      argumentos: '--simular',
      atualizado: diasAtras(2),
    },
    {
      id: 2,
      nome: 'converter_videos.ps1',
      linguagem: 'PowerShell',
      caminho: 'Projetos\\Automacao\\converter_videos.ps1',
      descricao: 'Exemplo: converte vídeos em lote com FFmpeg. (O ficheiro ainda não existe.)',
      argumentos: '',
      atualizado: diasAtras(0),
    },
  ]
}

export function criarFornecedoresExemplo(): Fornecedor[] {
  return [
    {
      id: 1,
      nome: 'Anthropic (Claude)',
      modelo: 'claude-opus-5-5',
      endpoint: 'https://api.anthropic.com/v1/messages',
      notas: 'Exemplo. A chave fica no ficheiro .env de um servidor local — nunca nesta app.',
      atualizado: diasAtras(0),
    },
  ]
}

export function criarPromptsExemplo(): Prompt[] {
  return [
    {
      id: 1,
      titulo: 'Títulos para YouTube',
      categoria: 'YouTube',
      texto:
        'Sugere 10 títulos para um vídeo do YouTube sobre {tema}.\nRegras: máximo 100 caracteres, português de Portugal, sem clickbait enganador.\nTítulo de trabalho: {titulo}',
      atualizado: diasAtras(1),
    },
    {
      id: 2,
      titulo: 'Descrição otimizada',
      categoria: 'YouTube',
      texto:
        'Escreve a descrição do vídeo «{titulo}».\nInclui: resumo de 2 frases, capítulos com marcas de tempo baseados no roteiro e 5 hashtags. Máximo 5000 caracteres.\n\nRoteiro:\n{roteiro}',
      atualizado: diasAtras(1),
    },
    {
      id: 3,
      titulo: 'Roteiro a partir de uma ideia',
      categoria: 'YouTube',
      texto:
        'Cria o roteiro de um vídeo de {duracao} minutos sobre «{titulo}».\nEstrutura: gancho (15 s), 3 a 5 secções, chamada para ação.\nPúblico: {publico}.',
      atualizado: diasAtras(2),
    },
    {
      id: 4,
      titulo: 'Explicar um erro de código',
      categoria: 'Desenvolvimento',
      texto: 'Explica este erro de {linguagem} e propõe a correção mínima, sem reescrever o resto do código:\n\n{erro}',
      atualizado: diasAtras(3),
    },
  ]
}

export function criarDadosIniciais(): AppData {
  return {
    versao: 1,
    projetos: criarExemplos(),
    videos: criarVideosExemplo(),
    ideias: criarIdeiasExemplo(),
    scripts: criarScriptsExemplo(),
    fornecedores: criarFornecedoresExemplo(),
    prompts: criarPromptsExemplo(),
  }
}

// Versões confirmadas na configuração deste computador.
export const FERRAMENTAS = [
  { nome: 'Node.js', versao: '26.13.1 LTS' },
  { nome: 'Python', versao: '3.12.10' },
  { nome: 'Git', versao: '2.56.0' },
  { nome: 'FFmpeg', versao: '9.0.2' },
  { nome: 'yt-dlp', versao: '2026.10.26' },
  { nome: 'VS Code', versao: '1.146.0' },
]

export function resumo(lista: Projeto[]) {
  const total = lista.length
  const concluidos = lista.filter((p) => p.estado === 'Concluído').length
  const emCurso = lista.filter((p) => p.estado === 'Em curso').length
  const planeados = lista.filter((p) => p.estado === 'Planeado').length
  const media = total ? Math.round(lista.reduce((s, p) => s + p.progresso, 0) / total) : 0
  return { total, concluidos, emCurso, planeados, media }
}

export function areaPorId(id: AreaId): Area {
  return AREAS.find((a) => a.id === id) ?? AREAS[0]
}
