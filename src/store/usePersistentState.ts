import { useCallback, useEffect, useState } from 'react'
import { armazenamentoDisponivel, escreverJSON, guardarCopiaAnterior, guardarCopiaInvalida, lerJSON } from './storage'

export type EstadoArmazenamento = 'guardado' | 'indisponivel' | 'erro'

/**
 * Estado React sincronizado com o localStorage.
 * - Lê e valida na primeira renderização; se os dados forem inválidos,
 *   guarda uma cópia e começa com `criarInicial()` (que fica logo gravado).
 * - Se forem válidos mas de um formato anterior, guarda o original em
 *   `<chave>:copia-anterior` e grava a versão migrada.
 * - Grava no momento de cada alteração (sem renderizações extra).
 * - Sincroniza entre separadores abertos da app.
 * `validar` deve ser uma função estável (definida fora do componente).
 */
export function usePersistentState<T>(
  chave: string,
  criarInicial: () => T,
  validar: (raw: unknown) => T | null,
) {
  const [disponivel] = useState(armazenamentoDisponivel)

  const [estadoInterno, setEstadoInterno] = useState<{ valor: T; erro: boolean }>(() => {
    const leitura = lerJSON(chave)
    if (leitura.ok) {
      const v = validar(leitura.valor)
      if (v) {
        // Dados válidos mas num formato anterior (ex.: sem listas novas):
        // guarda o original e grava já o formato atual.
        const original = JSON.stringify(leitura.valor)
        if (JSON.stringify(v) !== original) {
          guardarCopiaAnterior(chave, original)
          return { valor: v, erro: !escreverJSON(chave, v) }
        }
        return { valor: v, erro: false }
      }
      guardarCopiaInvalida(chave, JSON.stringify(leitura.valor))
    } else if (leitura.motivo === 'invalido') {
      guardarCopiaInvalida(chave, leitura.bruto)
    }
    const inicial = criarInicial()
    return { valor: inicial, erro: disponivel && !escreverJSON(chave, inicial) }
  })

  const setValor = useCallback(
    (novo: T) => {
      const erro = disponivel && !escreverJSON(chave, novo)
      setEstadoInterno({ valor: novo, erro })
    },
    [chave, disponivel],
  )

  useEffect(() => {
    const aoMudar = (e: StorageEvent) => {
      if (e.key !== chave || e.newValue === null) return
      try {
        const v = validar(JSON.parse(e.newValue))
        if (v) setEstadoInterno({ valor: v, erro: false })
      } catch {
        // Ignora alterações inválidas vindas de outro separador.
      }
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [chave, validar])

  const estado: EstadoArmazenamento = !disponivel ? 'indisponivel' : estadoInterno.erro ? 'erro' : 'guardado'
  return { valor: estadoInterno.valor, setValor, estado } as const
}
