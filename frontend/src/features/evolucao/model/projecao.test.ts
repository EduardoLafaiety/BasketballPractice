import { expect, it } from 'vitest'
import { paraProgresso, paraSessao } from '../../../shared/api/mapeamento'
import { atributos, conquistas, estatisticas } from './calculos'
import type { ProgressSessionApi, SessionApi } from '../../../../../contracts/api'
import type { Drill } from '../../../shared/types'

it('projeção compacta mantém pontuações, dias locais, entradas repetidas e conquistas', () => {
  const sessoes: SessionApi[] = Array.from({ length: 35 }, (_, i) => ({
    id: i + 1, performedAt: new Date(2026, 9, i + 1, 23, 45).toISOString(), durationMinutes: 30,
    rating: 4, notes: 'Não participa da fórmula',
    entries: [{ exerciseId: 1, exerciseName: 'Defesa', makes: 10, attempts: 20, reps: null, seconds: null, bestStreak: 7 },
      { exerciseId: 1, exerciseName: 'Defesa', makes: 5, attempts: null, reps: null, seconds: 60, bestStreak: 3 }],
    shots: [{ zone: 'tres_topo', makes: 3, attempts: 10 }],
  }))
  const compactas: ProgressSessionApi[] = sessoes.map((s) => ({ id: s.id, performedAt: s.performedAt,
    durationMinutes: Number(s.durationMinutes), makes: 15, bestStreak: 7,
    entries: s.entries.map(({ exerciseId }) => ({ exerciseId })), shots: s.shots!,
  }))
  const completas = sessoes.map(paraSessao), projetadas = compactas.map(paraProgresso)
  const drill = () => ({ id: '1', categoria: 'Defesa' } as Drill)
  expect(estatisticas(projetadas)).toEqual(estatisticas(completas))
  expect(conquistas(projetadas)).toEqual(conquistas(completas))
  expect(atributos(projetadas, drill)).toEqual(atributos(completas, drill))
})
