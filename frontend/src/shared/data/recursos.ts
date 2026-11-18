import { useCallback, useEffect, useRef, useState } from 'react'
// Cache em memória por recurso: ao voltar a uma página os dados aparecem na hora
// e são recarregados em segundo plano. É limpo no logout.
export const cache = new Map<string, unknown>()
const pedidos = new Map<string, Promise<unknown>>()
const cancelamentos = new Map<string, AbortController>()
const consumidores = new Map<string, number>()
function cancelar(chave: string) {
  cancelamentos.get(chave)?.abort()
  cancelamentos.delete(chave)
  pedidos.delete(chave)
}

export const limparCache = () => { cache.clear(); for (const chave of pedidos.keys()) cancelar(chave) }


// Recarregadores dos componentes montados, por chave.
const recarregadores = new Map<string, Set<() => void>>()

/** Descarta os dados das chaves com esses prefixos; o que está na tela é buscado de novo. */
export const invalidar = (...prefixos: string[]) => {
  const casa = (chave: string) => prefixos.some((p) => chave.startsWith(p))
  for (const chave of [...cache.keys()]) if (casa(chave)) cache.delete(chave)
  for (const chave of [...pedidos.keys()]) if (casa(chave)) cancelar(chave)
  for (const [chave, lista] of recarregadores) if (casa(chave)) lista.forEach((recarregar) => recarregar())
}

// Componentes montados que mostram cada chave: uma mudança feita num deles
// (ex.: o tema salvo em Configurações) aparece na hora nos outros (ex.: o Layout).
const ouvintes = new Map<string, Set<(valor: unknown) => void>>()

function publicar(chave: string, valor: unknown) {
  cache.set(chave, valor)
  ouvintes.get(chave)?.forEach((ouvir) => ouvir(valor))
}

/** Componentes que pedem o mesmo recurso compartilham a requisição em andamento. */
export function carregarRecurso<T>(chave: string, carregar: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const existente = pedidos.get(chave)
  if (existente) return existente as Promise<T>
  const controller = new AbortController()
  cancelamentos.set(chave, controller)
  const pedido = Promise.resolve().then(() => carregar(controller.signal)).then((dados) => {
    // Logout e invalidação retiram o pedido do registro; uma resposta antiga não repovoa o cache.
    if (pedidos.get(chave) === pedido) publicar(chave, dados)
    return dados
  }).finally(() => { if (pedidos.get(chave) === pedido) { pedidos.delete(chave); cancelamentos.delete(chave) } })
  pedidos.set(chave, pedido)
  return pedido
}

/** Dado da API com cache por chave (ver acima); os módulos de cada recurso montam seus hooks com ele. */
export function useRecurso<T>(chave: string, carregar: (signal: AbortSignal) => Promise<T>) {
  const [dados, setDadosInterno] = useState<T | undefined>(() => cache.get(chave) as T | undefined)
  const [erro, setErro] = useState<Error | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [versao, setVersao] = useState(0)
  const carregarRef = useRef(carregar)
  carregarRef.current = carregar
  const chaveAnterior = useRef(chave)

  useEffect(() => {
    const ouvir = (valor: unknown) => setDadosInterno(valor as T)
    const recarregarEste = () => setVersao((v) => v + 1)
    const lista = ouvintes.get(chave) ?? new Set()
    const recargas = recarregadores.get(chave) ?? new Set()
    lista.add(ouvir)
    recargas.add(recarregarEste)
    ouvintes.set(chave, lista)
    recarregadores.set(chave, recargas)
    return () => {
      lista.delete(ouvir)
      recargas.delete(recarregarEste)
    }
  }, [chave])

  useEffect(() => {
    let ativo = true
    consumidores.set(chave, (consumidores.get(chave) ?? 0) + 1)
    setCarregando(true)
    setErro(null)
    // Mesma chave recarregando (ex.: depois de invalidar): mantém os dados na tela até chegar o novo.
    if (cache.has(chave) || chaveAnterior.current !== chave) setDadosInterno(cache.get(chave) as T | undefined)
    chaveAnterior.current = chave
    carregarRecurso(chave, carregarRef.current)
      .then(() => { if (ativo && cache.has(chave)) setDadosInterno(cache.get(chave) as T) })
      .catch((e: Error) => { if (ativo && e.name !== 'AbortError') setErro(e) })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
      const restantes = (consumidores.get(chave) ?? 1) - 1
      if (restantes <= 0) { consumidores.delete(chave); cancelar(chave) }
      else consumidores.set(chave, restantes)
    }
  }, [chave, versao])

  // O cache é a fonte da verdade e é atualizado na hora, para que mudanças
  // seguidas (antes do próximo render) partam sempre do valor mais novo.
  const setDados = useCallback(
    (atualizar: (atual: T | undefined) => T) => publicar(chave, atualizar(cache.get(chave) as T | undefined)),
    [chave],
  )

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  return { dados, erro, carregando, recarregar, setDados }
}

export const recarregarTudo = limparCache
