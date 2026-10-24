import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, dataLocal } from './api'
import type { Config, DiaSemana, Drill, Meta, NovaSessao, Rotina, Sessao, TesteFisico } from './types'

// Cache em memória por recurso: ao voltar a uma página os dados aparecem na hora
// e são recarregados em segundo plano. É limpo no logout.
const cache = new Map<string, unknown>()

export const limparCache = () => cache.clear()

// Dados derivados das sessões: precisam ser recarregados quando uma sessão muda.
const DERIVADOS = ['resumo', 'zonas', 'progresso', 'metas']

// Recarregadores dos componentes montados, por chave.
const recarregadores = new Map<string, Set<() => void>>()

/** Descarta os dados das chaves com esses prefixos; o que está na tela é buscado de novo. */
const invalidar = (...prefixos: string[]) => {
  const casa = (chave: string) => prefixos.some((p) => chave.startsWith(p))
  for (const chave of [...cache.keys()]) if (casa(chave)) cache.delete(chave)
  for (const [chave, lista] of recarregadores) if (casa(chave)) lista.forEach((recarregar) => recarregar())
}

// Componentes montados que mostram cada chave: uma mudança feita num deles
// (ex.: o tema salvo em Configurações) aparece na hora nos outros (ex.: o Layout).
const ouvintes = new Map<string, Set<(valor: unknown) => void>>()

function publicar(chave: string, valor: unknown) {
  cache.set(chave, valor)
  ouvintes.get(chave)?.forEach((ouvir) => ouvir(valor))
}

function useRecurso<T>(chave: string, carregar: () => Promise<T>) {
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
    setCarregando(true)
    setErro(null)
    // Mesma chave recarregando (ex.: depois de invalidar): mantém os dados na tela até chegar o novo.
    if (cache.has(chave) || chaveAnterior.current !== chave) setDadosInterno(cache.get(chave) as T | undefined)
    chaveAnterior.current = chave
    carregarRef
      .current()
      .then((novo) => ativo && publicar(chave, novo))
      .catch((e: Error) => ativo && setErro(e))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
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

export function useDrills() {
  const { dados, ...resto } = useRecurso('drills', api.drills)
  const drills = useMemo(() => dados ?? [], [dados])
  const drillPorId = useCallback((id: string) => drills.find((d) => d.id === id), [drills])
  const { recarregar } = resto

  // Exercícios do próprio atleta. Depois de salvar, a lista é recarregada para vir na ordem da API.
  const salvar = useCallback(
    async (d: Pick<Drill, 'nome' | 'categoria' | 'metrica' | 'descricao'>, id?: string) => {
      const salvo = await api.salvarDrill(d, id)
      recarregar()
      return salvo
    },
    [recarregar],
  )
  const remover = useCallback(
    async (id: string) => {
      await api.removerDrill(id)
      recarregar()
    },
    [recarregar],
  )

  return { drills, drillPorId, carregado: dados !== undefined, salvar, remover, ...resto }
}

export function useSessoes() {
  const { dados, setDados, ...resto } = useRecurso('sessoes', api.sessoes)

  const adicionar = useCallback(
    async (s: NovaSessao) => {
      const criada = await api.registrarSessao(s)
      invalidar(...DERIVADOS)
      // Só atualiza o cache se a lista já foi carregada; senão a página de destino busca tudo.
      if (cache.has('sessoes')) setDados((atual = []) => [criada, ...atual])
      return criada
    },
    [setDados],
  )

  const remover = useCallback(
    async (id: string) => {
      const anterior = cache.get('sessoes') as Sessao[] | undefined
      setDados((atual = []) => atual.filter((s) => s.id !== id))
      try {
        await api.removerSessao(id)
        invalidar(...DERIVADOS)
      } catch (e) {
        if (anterior) setDados(() => anterior)
        throw e
      }
    },
    [setDados],
  )

  return { sessoes: dados ?? [], carregado: dados !== undefined, adicionar, remover, ...resto }
}

/** Totais de [desde, ate); sem datas, todo o histórico. */
export function useResumo(desde?: Date, ate?: Date) {
  const chave = `resumo:${desde ? dataLocal(desde) : 'tudo'}:${ate ? dataLocal(ate) : 'hoje'}`
  const { dados, ...resto } = useRecurso(chave, () => api.resumo(desde, ate))
  return { resumo: dados, ...resto }
}

export function useZonas(desde?: Date) {
  const { dados, ...resto } = useRecurso(`zonas:${desde ? dataLocal(desde) : 'tudo'}`, () => api.zonas(desde))
  return { zonas: dados, ...resto }
}

export function useProgresso() {
  const { dados, ...resto } = useRecurso('progresso', api.progresso)
  return { progresso: dados, ...resto }
}

export function useMetas() {
  const { dados, setDados, ...resto } = useRecurso('metas', api.metas)

  const adicionar = useCallback(
    async (m: Pick<Meta, 'titulo' | 'tipo' | 'alvo' | 'drillId' | 'prazo'>) => {
      const criada = await api.salvarMeta(m)
      setDados((atual = []) => [criada, ...atual])
    },
    [setDados],
  )

  const remover = useCallback(
    async (id: string) => {
      await api.removerMeta(id)
      setDados((atual = []) => atual.filter((m) => m.id !== id))
    },
    [setDados],
  )

  return { metas: dados ?? [], carregado: dados !== undefined, adicionar, remover, ...resto }
}

export function useTiposTeste() {
  const { dados, ...resto } = useRecurso('tipos-teste', api.tiposTeste)
  return { tipos: dados ?? [], ...resto }
}

export function useTestes() {
  const { dados, setDados, ...resto } = useRecurso('testes', api.testes)

  const adicionar = useCallback(
    async (t: Omit<TesteFisico, 'id'>) => {
      const criado = await api.registrarTeste(t)
      invalidar('progresso')
      setDados((atual = []) => [criado, ...atual].sort((a, b) => b.data.localeCompare(a.data)))
    },
    [setDados],
  )

  const remover = useCallback(
    async (id: string) => {
      await api.removerTeste(id)
      invalidar('progresso')
      setDados((atual = []) => atual.filter((t) => t.id !== id))
    },
    [setDados],
  )

  return { testes: dados ?? [], carregado: dados !== undefined, adicionar, remover, ...resto }
}

export function useModelosRotina() {
  const { dados, ...resto } = useRecurso('modelos-rotina', api.modelosRotina)
  return { modelos: dados ?? [], carregado: dados !== undefined, ...resto }
}

export const CONFIG_PADRAO: Config = {
  tema: 'sistema',
  lembretes: { ativo: false, horario: '18:00', dias: [1, 2, 3, 4, 5] },
  metronomoBpm: 90,
}

export function useConfig() {
  const { dados, setDados, ...resto } = useRecurso('config', api.config)

  // Aplica na hora (tema, lembretes) e desfaz se o servidor recusar.
  const salvar = useCallback(
    async (nova: Config) => {
      const anterior = cache.get('config') as Config | undefined
      setDados(() => nova)
      try {
        const salva = await api.salvarConfig(nova)
        setDados(() => salva)
      } catch (e) {
        if (anterior) setDados(() => anterior)
        throw e
      }
    },
    [setDados],
  )

  return { config: dados ?? CONFIG_PADRAO, carregado: dados !== undefined, salvar, ...resto }
}

/** Depois de importar um backup, tudo precisa ser buscado de novo. */
export const recarregarTudo = () => cache.clear()

const ROTINA_VAZIA: Rotina = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }

// Salvamentos da rotina em fila, para que dois cliques rápidos não criem
// dois modelos de treino para o mesmo dia.
let filaRotina: Promise<unknown> = Promise.resolve()

export function useRotina() {
  const { dados, setDados, recarregar, ...resto } = useRecurso('rotina', api.rotina)
  const [erroSalvar, setErroSalvar] = useState<Error | null>(null)

  const alterarDia = useCallback(
    (dia: DiaSemana, atualizar: (ids: string[]) => string[]) => {
      if (!cache.has('rotina')) return
      let antes: string[] = []
      let novos: string[] = []
      setDados((atual) => {
        antes = atual!.rotina[dia]
        novos = atualizar(antes)
        return { ...atual!, rotina: { ...atual!.rotina, [dia]: novos } }
      })
      setErroSalvar(null)

      filaRotina = filaRotina.then(async () => {
        const workoutId = (cache.get('rotina') as typeof dados)?.ids[dia]
        try {
          const salvo = await api.salvarDia(dia, DIAS[dia], novos, workoutId)
          if (cache.has('rotina')) setDados((atual) => ({ ...atual!, ids: { ...atual!.ids, [dia]: salvo } }))
        } catch (e) {
          // Desfaz a mudança (se nada mais mudou o dia) e confere com o servidor.
          setErroSalvar(e as Error)
          if (cache.has('rotina')) {
            setDados((atual) =>
              atual!.rotina[dia] === novos ? { ...atual!, rotina: { ...atual!.rotina, [dia]: antes } } : atual!,
            )
          }
          recarregar()
        }
      })
    },
    [setDados, recarregar],
  )

  // Substitui a semana inteira (modelos prontos); cada dia é salvo pela mesma fila.
  const aplicarModelo = useCallback(
    (modelo: Rotina) => {
      for (const dia of [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]) alterarDia(dia, () => [...(modelo[dia] ?? [])])
    },
    [alterarDia],
  )

  /** Promessa que termina quando todos os salvamentos pendentes da rotina acabarem. */
  const aguardarSalvamentos = useCallback(() => filaRotina, [])

  return {
    rotina: dados?.rotina ?? ROTINA_VAZIA,
    carregado: dados !== undefined,
    alterarDia,
    aplicarModelo,
    aguardarSalvamentos,
    erroSalvar,
    recarregar,
    ...resto,
  }
}

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

export const aproveitamento = (acertos = 0, tentativas = 0) =>
  tentativas > 0 ? Math.round((acertos / tentativas) * 100) : null

export const ROTULO_METRICA: Record<Drill['metrica'], string> = {
  acertos: 'Acertos e tentativas',
  repeticoes: 'Repetições',
  tempo: 'Tempo',
}

/** Início do dia, `dias` atrás (0 = hoje). */
export function diasAtras(dias: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - dias)
  return d
}
