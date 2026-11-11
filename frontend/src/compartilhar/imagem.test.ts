import { describe, expect, it } from 'vitest'
import { ALTURA, LARGURA, desenharSemana, periodoDaSemana, type Contexto } from './imagem'

/** Contexto falso: guarda os textos escritos e os retângulos pintados, com a cor do momento. */
function contextoFalso() {
  const textos: { texto: string; cor: string }[] = []
  const retangulos: { x: number; y: number; l: number; a: number; cor: string }[] = []
  let pilha = 0
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillText(texto: string) {
      textos.push({ texto, cor: String(this.fillStyle) })
    },
    fillRect(x: number, y: number, l: number, a: number) {
      retangulos.push({ x, y, l, a, cor: String(this.fillStyle) })
    },
    save: () => void pilha++,
    restore: () => void pilha--,
    beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, closePath() {}, fill() {}, stroke() {}, clip() {}, rect() {}, translate() {}, scale() {},
  }
  return { ctx: ctx as unknown as Contexto, textos, retangulos, pilha: () => pilha }
}

const dados = {
  periodo: '9 a 15 de nov.',
  zonas: { tres_topo: { acertos: 4, tentativas: 10 }, garrafao: { acertos: 9, tentativas: 10 }, media_ala_e: { acertos: 0, tentativas: 0 } },
  sequencia: 6,
  acertos: 13,
  tentativas: 20,
  treinos: 3,
  minutos: 95,
  endereco: 'exemplo.com',
}

describe('Imagem da semana', () => {
  it('tem o tamanho dos stories e começa pintando o fundo inteiro', () => {
    const { ctx, retangulos } = contextoFalso()
    desenharSemana(ctx, dados)
    expect([LARGURA, ALTURA]).toEqual([1080, 1920])
    expect(retangulos[0]).toMatchObject({ x: 0, y: 0, l: 1080, a: 1920 })
  })

  it('escreve a semana, a sequência, o aproveitamento e a porcentagem só das zonas com arremessos', () => {
    const { ctx, textos, pilha } = contextoFalso()
    desenharSemana(ctx, dados)
    const escritos = textos.map((t) => t.texto)
    expect(escritos).toEqual(expect.arrayContaining(['MINHA', 'SEMANA', '9 A 15 DE NOV.', '6', 'DIAS SEGUIDOS', '65%', '13/20 ARREMESSOS', '3 TREINOS · 95 MIN', 'exemplo.com']))
    expect(escritos).toContain('40%')
    expect(escritos).toContain('90%')
    expect(escritos.filter((t) => /^\d+%$/.test(t))).toHaveLength(3)
    // Sequência em laranja.
    expect(textos.find((t) => t.texto === '6')?.cor).toBe('#ff6a13')
    // Todo save tem o seu restore.
    expect(pilha()).toBe(0)
  })

  it('sem arremessos na semana, mostra "—" no aproveitamento e no singular quando é um só', () => {
    const { ctx, textos } = contextoFalso()
    desenharSemana(ctx, { ...dados, zonas: {}, acertos: 0, tentativas: 0, sequencia: 1, treinos: 1 })
    const escritos = textos.map((t) => t.texto)
    expect(escritos).toEqual(expect.arrayContaining(['—', 'DIA SEGUIDO', '1 TREINO · 95 MIN']))
  })

  it('escreve o período de segunda a domingo', () => {
    expect(periodoDaSemana(new Date(2026, 10, 9))).toMatch(/^9 a 15 de nov/)
    expect(periodoDaSemana(new Date(2026, 9, 26))).toMatch(/^26 de out.* a 1 de nov/)
  })
})
