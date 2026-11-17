import { describe, expect, it } from 'vitest'
import type { Drill, Sessao } from '../types'
import { atributos, conquistas, estatisticas, estiloDeJogador, faixaDaNota, faixaDoOverall, ordenarConquistas, overall, pontosParaNota } from './calculos'
import { JOGADOR } from './JogadorPixel'

const sessao = (dia: string, extra: Partial<Sessao> = {}): Sessao => ({
  id: dia + Math.random(),
  data: `${dia}T15:00:00`,
  duracaoMin: 30,
  entradas: [],
  zonas: [],
  ...extra,
})

const drills: Record<string, Drill> = {
  '1': { id: '1', nome: 'Drible cruzado', categoria: 'Drible', metrica: 'repeticoes', descricao: '', personalizado: false },
  '2': { id: '2', nome: 'Suicídio', categoria: 'Condicionamento', metrica: 'tempo', descricao: '', personalizado: false },
}
const porId = (id: string) => drills[id]

describe('estatisticas', () => {
  it('sem sessões, tudo zerado', () => {
    expect(estatisticas([])).toEqual({ sessoes: 0, minutos: 0, acertos: 0, acertosNoMelhorDia: 0, melhorSequenciaDeDias: 0, melhorSequenciaDeAcertos: 0 })
  })

  it('conta a maior sequência de dias seguidos, mesmo com buracos e sessões repetidas no dia', () => {
    const e = estatisticas([
      sessao('2026-11-01'), sessao('2026-11-02'), sessao('2026-11-02'), sessao('2026-11-03'),
      sessao('2026-11-10'), sessao('2026-11-11'),
    ])
    expect(e.melhorSequenciaDeDias).toBe(3)
    expect(e.sessoes).toBe(6)
    expect(e.minutos).toBe(180)
  })

  it('a sequência de dias atravessa a virada de mês e de ano', () => {
    expect(estatisticas([sessao('2026-12-31'), sessao('2027-01-01')]).melhorSequenciaDeDias).toBe(2)
  })

  it('soma acertos por dia e pega a maior sequência de acertos', () => {
    const e = estatisticas([
      sessao('2026-11-01', { acertos: 60, sequencia: 8 }),
      sessao('2026-11-01', { acertos: 50, sequencia: 12 }),
      sessao('2026-11-02', { entradas: [{ drillId: '1', acertos: 30, sequencia: 5 }] }),
    ])
    expect(e.acertos).toBe(140)
    expect(e.acertosNoMelhorDia).toBe(110)
    expect(e.melhorSequenciaDeAcertos).toBe(12)
  })
})

describe('conquistas', () => {
  it('sem treino, todas bloqueadas e sem progresso', () => {
    const lista = conquistas([])
    expect(lista.length).toBe(12)
    expect(lista.every((c) => !c.desbloqueada && c.progresso === 0)).toBe(true)
  })

  it('desbloqueia pelo alvo e limita o progresso ao alvo', () => {
    const lista = conquistas([sessao('2026-11-01', { acertos: 1200, sequencia: 11 })])
    const por = (id: string) => lista.find((c) => c.id === id)!
    expect(por('primeira-sessao').desbloqueada).toBe(true)
    expect(por('10-sessoes').desbloqueada).toBe(false)
    expect(por('10-sessoes').progresso).toBe(1)
    expect(por('1000-cestas').desbloqueada).toBe(true)
    expect(por('1000-cestas').progresso).toBe(1000)
    expect(por('sequencia-10').desbloqueada).toBe(true)
    expect(por('sequencia-25').progresso).toBe(11)
  })

  it('ordena as desbloqueadas primeiro e depois as bloqueadas, das mais perto às mais longe', () => {
    const ordem = ordenarConquistas(conquistas([sessao('2026-11-01', { sequencia: 20 })])).map((c) => c.id)
    expect(ordem[0]).toBe('primeira-sessao')
    expect(ordem.slice(0, 2)).toEqual(['primeira-sessao', 'sequencia-10'])
    expect(ordem.indexOf('sequencia-25')).toBeLessThan(ordem.indexOf('100-sessoes'))
  })
})

describe('overall', () => {
  it('sem treino todo atributo fica em 40', () => {
    const lista = atributos([], porId)
    expect(lista.map((a) => a.valor)).toEqual([40, 40, 40, 40, 40])
    expect(overall(lista)).toBe(40)
  })

  it('a nota sobe com os pontos e nunca passa de 99', () => {
    expect(pontosParaNota(0)).toBe(40)
    expect(pontosParaNota(40)).toBeGreaterThan(pontosParaNota(10))
    expect(pontosParaNota(1_000_000)).toBe(99)
    expect(pontosParaNota(-5)).toBe(40)
  })

  it('cada exercício sobe só o atributo da própria categoria', () => {
    const lista = atributos([sessao('2026-11-01', { entradas: [{ drillId: '1' }, { drillId: '2' }] })], porId)
    const v = (id: string) => lista.find((a) => a.id === id)!.valor
    expect(v('drible')).toBeGreaterThan(40)
    expect(v('condicionamento')).toBeGreaterThan(40)
    expect(v('defesa')).toBe(40)
    expect(v('passe')).toBe(40)
    expect(v('arremesso3')).toBe(40)
  })

  it('o arremesso de 3 conta só as zonas de 3 pontos, e acertar rende mais', () => {
    const errou = atributos([sessao('2026-11-01', { zonas: [{ zona: 'tres_topo', acertos: 0, tentativas: 40 }] })], porId)[0].valor
    const acertou = atributos([sessao('2026-11-01', { zonas: [{ zona: 'tres_topo', acertos: 30, tentativas: 40 }] })], porId)[0].valor
    const media = atributos([sessao('2026-11-01', { zonas: [{ zona: 'media_topo', acertos: 30, tentativas: 40 }] })], porId)[0].valor
    expect(acertou).toBeGreaterThan(errou)
    expect(media).toBe(40)
  })

  it('exercício desconhecido não quebra nem pontua', () => {
    expect(atributos([sessao('2026-11-01', { entradas: [{ drillId: '999' }] })], porId).every((a) => a.valor === 40)).toBe(true)
  })

  it('o overall é a média arredondada e tem faixas', () => {
    expect(overall([{ valor: 72 }, { valor: 65 }, { valor: 58 }, { valor: 70 }, { valor: 63 }])).toBe(66)
    expect(faixaDoOverall(40)).toBe('Novato')
    expect(faixaDoOverall(66)).toBe('Rotação')
    expect(faixaDoOverall(99)).toBe('Superestrela')
  })
})

describe('visual do overall', () => {
  it('a cor da nota segue as faixas do jogo', () => {
    expect([40, 50, 60, 70, 80, 90, 95, 99].map((n) => faixaDaNota(n).id)).toEqual(['novato', 'bronze', 'prata', 'ouro', 'esmeralda', 'ametista', 'diamante', 'rosa'])
    expect(faixaDaNota(49).id).toBe('novato')
    expect(faixaDaNota(94).id).toBe('ametista')
  })

  it('o estilo de jogador vem do atributo mais alto; sem destaque, fica em aberto', () => {
    const base = atributos([], porId)
    expect(estiloDeJogador(base)).toEqual({ build: 'Estilo em aberto', forte: undefined, fraco: undefined })
    const treinado = atributos([sessao('2026-11-01', { entradas: [{ drillId: '2' }] })], porId)
    const e = estiloDeJogador(treinado)
    expect(e.build).toBe('Maratonista')
    expect(e.forte?.id).toBe('condicionamento')
    expect(e.fraco?.valor).toBe(40)
  })

  it('cada conquista rende pontos', () => {
    expect(conquistas([]).every((c) => c.pontos > 0)).toBe(true)
  })

  it('o jogador em pixel tem todas as linhas do mesmo tamanho', () => {
    expect(JOGADOR.every((l) => l.length === 16)).toBe(true)
    expect(JOGADOR.length).toBe(20)
  })
})
