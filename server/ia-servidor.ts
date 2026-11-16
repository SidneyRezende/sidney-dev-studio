// Servidor local de IA do Sidney Dev Studio.
//
// Iniciar:   npm.cmd run ia        (lê as variáveis do ficheiro .env, se existir)
//
// Segurança:
// - Escuta apenas em 127.0.0.1 (inacessível a partir de outros computadores).
// - A chave ANTHROPIC_API_KEY é lida do ambiente pelo SDK oficial; nunca é
//   escrita em logs nem devolvida em respostas.
// - Só aceita pedidos de navegador vindos das origens da app (IA_ORIGENS) e com
//   Host localhost/127.0.0.1 (proteção contra sites maliciosos e DNS rebinding).
// - Limites: tamanho do pedido, 1 pedido de cada vez e N pedidos por minuto.
//
// Este ficheiro corre diretamente no Node 26 (TypeScript sem compilação).
import http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import Anthropic from '@anthropic-ai/sdk'

/** Inteiro do ambiente dentro de [min, max]; usa o valor por omissão se vazio ou inválido. */
function inteiroEnv(nome: string, omissao: number, min: number, max: number): number {
  const n = Number(process.env[nome]?.trim())
  return Number.isInteger(n) && n >= min && n <= max ? n : omissao
}

const ORIGENS_OMISSAO = ['http://localhost:5173', 'http://localhost:4173']
const PORTA = inteiroEnv('IA_SERVIDOR_PORTA', 8787, 1024, 65535)
const MODELO = process.env.IA_MODELO?.trim() || 'claude-opus-5-5'
const origensEnv = (process.env.IA_ORIGENS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
const ORIGENS = new Set(origensEnv.length ? origensEnv : ORIGENS_OMISSAO)
const HOSTS = new Set([`localhost:${PORTA}`, `127.0.0.1:${PORTA}`])
const MAX_CORPO_BYTES = 256 * 1024
const MAX_PROMPT = 60_000
const MAX_POR_MINUTO = inteiroEnv('IA_MAX_POR_MINUTO', 10, 1, 120)
const MAX_TOKENS = 16_000

// Fallback automático da Anthropic (se o modelo recusar, tenta outro modelo na mesma chamada).
// Por segurança fica DESLIGADO, exceto com IA_FALLBACK=ligado. Qualquer outro valor = desligado.
const valorFallback = (process.env.IA_FALLBACK ?? '').trim().toLowerCase()
const FALLBACK = valorFallback === 'ligado'
const FALLBACK_INVALIDO = valorFallback !== '' && valorFallback !== 'ligado' && valorFallback !== 'desligado'

const temChave = Boolean(process.env.ANTHROPIC_API_KEY?.trim())
// Sem argumentos: o SDK lê ANTHROPIC_API_KEY do ambiente (nunca está no código).
const cliente = temChave ? new Anthropic() : null

let ocupado = false
const pedidosRecentes: number[] = []

type Corpo = Record<string, unknown>

function responder(res: ServerResponse, status: number, corpo: Corpo, origem?: string): void {
  const cabecalhos: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    vary: 'Origin',
  }
  if (origem) cabecalhos['access-control-allow-origin'] = origem
  res.writeHead(status, cabecalhos)
  res.end(JSON.stringify(corpo))
}

class ErroPedido extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

async function lerCorpo(req: IncomingMessage): Promise<string> {
  const partes: Buffer[] = []
  let total = 0
  for await (const parte of req) {
    const b = parte as Buffer
    total += b.length
    if (total > MAX_CORPO_BYTES) throw new ErroPedido(413, 'Pedido demasiado grande.')
    partes.push(b)
  }
  return Buffer.concat(partes).toString('utf8')
}

function dentroDoLimite(): boolean {
  const agora = Date.now()
  while (pedidosRecentes.length && agora - pedidosRecentes[0] > 60_000) pedidosRecentes.shift()
  if (pedidosRecentes.length >= MAX_POR_MINUTO) return false
  pedidosRecentes.push(agora)
  return true
}

/** Converte erros do SDK em mensagens seguras (sem detalhes internos nem chaves). */
function erroDoFornecedor(e: unknown): { status: number; erro: string } {
  if (e instanceof Anthropic.AuthenticationError) return { status: 502, erro: 'A chave API foi recusada. Verifica ANTHROPIC_API_KEY no ficheiro .env.' }
  if (e instanceof Anthropic.PermissionDeniedError) return { status: 502, erro: 'A chave API não tem permissão para este modelo.' }
  if (e instanceof Anthropic.RateLimitError) return { status: 429, erro: 'Limite de pedidos do fornecedor atingido. Tenta daqui a pouco.' }
  if (e instanceof Anthropic.BadRequestError) return { status: 502, erro: 'O fornecedor recusou o pedido (pedido inválido).' }
  if (e instanceof Anthropic.APIConnectionError) return { status: 502, erro: 'Sem ligação ao fornecedor de IA. Verifica a internet.' }
  if (e instanceof Anthropic.APIError) return { status: 502, erro: `Erro do fornecedor de IA (${e.status ?? 'sem código'}).` }
  return { status: 500, erro: 'Erro interno do servidor local.' }
}

async function gerar(req: IncomingMessage, res: ServerResponse, origem?: string): Promise<void> {
  if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    return responder(res, 415, { erro: 'Usa Content-Type: application/json.' }, origem)
  }
  let corpo: unknown
  try {
    corpo = JSON.parse(await lerCorpo(req))
  } catch (e) {
    if (e instanceof ErroPedido) return responder(res, e.status, { erro: e.message }, origem)
    return responder(res, 400, { erro: 'JSON inválido.' }, origem)
  }
  const prompt = typeof corpo === 'object' && corpo !== null ? (corpo as Corpo).prompt : undefined
  if (typeof prompt !== 'string' || !prompt.trim()) return responder(res, 400, { erro: 'O prompt está vazio.' }, origem)
  if (prompt.length > MAX_PROMPT) return responder(res, 413, { erro: `O prompt tem mais de ${MAX_PROMPT} caracteres.` }, origem)

  if (!cliente) return responder(res, 503, { erro: 'Falta ANTHROPIC_API_KEY no ficheiro .env do projeto. Reinicia o servidor depois de a definir.' }, origem)
  if (ocupado) return responder(res, 429, { erro: 'Já há um pedido em curso. Espera que termine.' }, origem)
  if (!dentroDoLimite()) return responder(res, 429, { erro: `Limite local de ${MAX_POR_MINUTO} pedidos por minuto atingido.` }, origem)

  ocupado = true
  const inicio = Date.now()
  try {
    const resposta = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      // Só com IA_FALLBACK=ligado: se o modelo recusar por política, a Anthropic tenta um modelo alternativo.
      ...(FALLBACK ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    })
    if (resposta.stop_reason === 'refusal') {
      console.log(`[ia] recusado pelo modelo (${Date.now() - inicio} ms)`)
      const dica = FALLBACK ? '' : ' (ou ativa IA_FALLBACK=ligado no ficheiro .env)'
      return responder(res, 422, { erro: `O modelo recusou este pedido. Reformula o prompt${dica}.` }, origem)
    }
    let texto = ''
    for (const bloco of resposta.content) if (bloco.type === 'text') texto += bloco.text
    const aviso = resposta.stop_reason === 'max_tokens' ? 'A resposta foi cortada por atingir o limite de tamanho.' : undefined
    console.log(`[ia] ok · ${resposta.model} · ${resposta.usage.output_tokens} tokens de saída · ${Date.now() - inicio} ms`)
    return responder(res, 200, { texto, modelo: resposta.model, ...(aviso ? { aviso } : {}) }, origem)
  } catch (e) {
    const { status, erro } = erroDoFornecedor(e)
    // Regista só o tipo de erro — nunca o prompt nem a chave.
    console.error(`[ia] erro ${status}: ${e instanceof Error ? e.constructor.name : 'desconhecido'}`)
    return responder(res, status, { erro }, origem)
  } finally {
    ocupado = false
  }
}

const servidor = http.createServer((req, res) => {
  const origem = typeof req.headers.origin === 'string' ? req.headers.origin : undefined

  // Proteção contra DNS rebinding: o Host tem de ser este computador.
  if (!HOSTS.has(req.headers.host ?? '')) return responder(res, 403, { erro: 'Host não permitido.' })
  // Pedidos de navegador só a partir das origens da app.
  if (origem !== undefined && !ORIGENS.has(origem)) return responder(res, 403, { erro: 'Origem não permitida.' })

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': origem ?? '',
      'access-control-allow-methods': 'GET, POST',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
      vary: 'Origin',
    })
    return res.end()
  }

  const caminho = new URL(req.url ?? '/', 'http://localhost').pathname
  if (req.method === 'GET' && caminho === '/api/ia/estado') {
    return responder(res, 200, { ok: true, configurado: temChave, modelo: MODELO }, origem)
  }
  if (req.method === 'POST' && caminho === '/api/ia/gerar') {
    gerar(req, res, origem).catch(() => responder(res, 500, { erro: 'Erro interno do servidor local.' }, origem))
    return
  }
  return responder(res, 404, { erro: 'Não encontrado.' }, origem)
})

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`Servidor local de IA em http://127.0.0.1:${PORTA}`)
  console.log(`Modelo: ${MODELO} · Chave API: ${temChave ? 'definida' : 'EM FALTA (cria o ficheiro .env a partir do .env.example)'}`)
  console.log(`Origens permitidas: ${[...ORIGENS].join(', ')} · Limite: ${MAX_POR_MINUTO} pedidos/minuto`)
  console.log(`Fallback automático: ${FALLBACK ? 'ligado' : 'desligado'} (IA_FALLBACK)`)
  if (FALLBACK_INVALIDO) console.log(`Aviso: IA_FALLBACK="${valorFallback}" não é válido (usa ligado ou desligado) — a usar "desligado".`)
  console.log('Para parar: Ctrl+C')
})
