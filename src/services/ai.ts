// Cliente do servidor local de IA (server/ia-servidor.ts).
//
// Regra de segurança: o frontend (esta app no navegador) NUNCA recebe nem guarda
// chaves API. A chave fica no ficheiro .env e é usada apenas pelo servidor local:
//
//   Navegador (esta app) ──POST /api/ia/gerar { prompt }──▶ Servidor local (127.0.0.1:8787)
//                                                              • lê ANTHROPIC_API_KEY do .env
//                                                              • SDK oficial @anthropic-ai/sdk
//                                                              ▼
//                                                     API Anthropic (claude-opus-5-5)
//
// Iniciar o servidor: npm.cmd run ia

export const IA_SERVIDOR_URL = 'http://localhost:8787'
export const COMANDO_SERVIDOR = 'npm.cmd run ia'
const MAX_RESPOSTA = 500_000

export type EstadoIA = { ligado: false } | { ligado: true; configurado: boolean; modelo: string }

export type RespostaIA = { ok: true; texto: string; modelo: string; aviso?: string } | { ok: false; erro: string }

export const MENSAGEM_NAO_LIGADO = `O servidor local de IA não está ligado. Inicia-o num terminal com: ${COMANDO_SERVIDOR}`

function obj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** Verifica se o servidor local está ligado e configurado. Nunca lança erros. */
export async function verificarServidor(timeoutMs = 2000): Promise<EstadoIA> {
  try {
    const r = await fetch(`${IA_SERVIDOR_URL}/api/ia/estado`, { signal: AbortSignal.timeout(timeoutMs) })
    if (!r.ok) return { ligado: false }
    const j: unknown = await r.json()
    if (!obj(j) || j.ok !== true || typeof j.configurado !== 'boolean' || typeof j.modelo !== 'string') return { ligado: false }
    return { ligado: true, configurado: j.configurado, modelo: j.modelo.slice(0, 100) }
  } catch {
    return { ligado: false }
  }
}

/** Envia o prompt ao servidor local. Nunca lança erros (exceto cancelamento via `sinal`). */
export async function gerarTexto(prompt: string, sinal?: AbortSignal): Promise<RespostaIA> {
  let r: Response
  try {
    r = await fetch(`${IA_SERVIDOR_URL}/api/ia/gerar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: sinal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    return { ok: false, erro: MENSAGEM_NAO_LIGADO }
  }
  let j: unknown
  try {
    j = await r.json()
  } catch {
    return { ok: false, erro: `Resposta inválida do servidor local (${r.status}).` }
  }
  if (!obj(j)) return { ok: false, erro: `Resposta inválida do servidor local (${r.status}).` }
  if (!r.ok || typeof j.texto !== 'string') {
    return { ok: false, erro: typeof j.erro === 'string' ? j.erro.slice(0, 500) : `Erro do servidor local (${r.status}).` }
  }
  return {
    ok: true,
    texto: j.texto.slice(0, MAX_RESPOSTA),
    modelo: typeof j.modelo === 'string' ? j.modelo.slice(0, 100) : '',
    ...(typeof j.aviso === 'string' ? { aviso: j.aviso.slice(0, 300) } : {}),
  }
}
