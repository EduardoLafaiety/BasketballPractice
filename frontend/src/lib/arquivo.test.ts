import { describe, expect, it } from 'vitest'
import type { Sessao } from '../types'
import { sessoesParaCsv } from './arquivo'

const sessao = (extra: Partial<Sessao> = {}): Sessao => ({
  id: '1',
  drillNome: 'Lance livre',
  data: '2026-10-20T21:30:00.000Z',
  duracaoMin: 45,
  acertos: 41,
  tentativas: 50,
  entradas: [],
  zonas: [],
  ...extra,
})

describe('sessoesParaCsv', () => {
  it('começa com BOM e usa ponto e vírgula e CRLF para o Excel em português', () => {
    const csv = sessoesParaCsv([sessao()])
    expect(csv.startsWith('﻿')).toBe(true)
    const [cabecalho, linha] = csv.slice(1).split('\r\n')
    expect(cabecalho.split(';')).toHaveLength(11)
    expect(cabecalho).toContain('Aproveitamento (%)')
    expect(linha.split(';').slice(1, 6)).toEqual(['Lance livre', '45', '41', '50', '82'])
  })

  it('protege valores com ponto e vírgula, aspas e quebra de linha', () => {
    const csv = sessoesParaCsv([sessao({ notas: 'Cansado; mas "focado"\nsegunda linha' })])
    expect(csv).toContain('"Cansado; mas ""focado""\nsegunda linha"')
  })

  it('deixa vazio o que não foi registrado e chama de treino livre a sessão sem nome', () => {
    const csv = sessoesParaCsv([sessao({ drillNome: undefined, duracaoMin: 0, acertos: undefined, tentativas: undefined })])
    const colunas = csv.split('\r\n')[1].split(';')
    expect(colunas[1]).toBe('Treino livre')
    expect(colunas.slice(2, 6)).toEqual(['', '', '', ''])
  })

  it('só gera o cabeçalho sem sessões', () => {
    expect(sessoesParaCsv([]).split('\r\n')).toHaveLength(1)
  })
})
