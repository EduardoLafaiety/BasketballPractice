import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

function abrirConquistas(rotas: Parameters<typeof apiFalsa>[0] = {}, caminho = '/conquistas') {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /stats/progress': { streak: { current: 2, best: 5 }, achievements: [] },
    ...rotas,
  })
  abrirApp(caminho)
  return api
}

const conquista = (id: string, title: string, target: number, progress: number) => ({
  id,
  title,
  description: `Descrição de ${title}.`,
  target,
  progress,
  unlocked: progress >= target,
})

const progressoCom = (achievements: ReturnType<typeof conquista>[]) => ({ streak: { current: 2, best: 5 }, achievements })

describe('Lista de conquistas (estilo Steam)', () => {
  const catalogoDeConquistas = [
    conquista('100-sessoes', 'Centenário', 100, 40),
    conquista('primeira-sessao', 'Primeiro treino', 1, 1),
    conquista('10-sessoes', 'Constância', 10, 9),
    conquista('3-dias', 'Embalado', 3, 3),
  ]

  it('a aba se chama Conquistas e o endereço antigo (/metas) leva até ela', async () => {
    abrirConquistas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) }, '/metas')
    expect(await screen.findByRole('heading', { name: 'Conquistas', level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('caminho').textContent).toBe('/conquistas')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: /Conquistas/ })).toHaveAttribute('href', '/conquistas')
  })

  it('mostra quantas foram desbloqueadas, com a porcentagem e a barra', async () => {
    abrirConquistas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    expect(await screen.findByText(/Descrição|desbloqueadas/, { selector: '.conquistas-resumo p' })).toHaveTextContent('2 de 4 desbloqueadas (50%)')
    const barra = screen.getByRole('progressbar', { name: 'Conquistas desbloqueadas' })
    expect(barra).toHaveAttribute('aria-valuenow', '2')
    expect(barra).toHaveAttribute('aria-valuemax', '4')
  })

  it('lista as desbloqueadas primeiro e, depois, as bloqueadas da mais perto para a mais longe', async () => {
    abrirConquistas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    await screen.findByText('Primeiro treino')
    const titulos = [...document.querySelectorAll('.conquista .conquista-texto strong')].map((e) => e.textContent)
    expect(titulos).toEqual(['Primeiro treino', 'Embalado', 'Constância', 'Centenário'])
    expect(document.querySelectorAll('.conquista.desbloqueada')).toHaveLength(2)
  })

  it('cada conquista tem ícone; a bloqueada mostra o progresso e a desbloqueada, o selo', async () => {
    abrirConquistas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    await screen.findByText('Centenário')
    const bloqueada = screen.getByText('Centenário').closest('li')!
    expect(bloqueada).not.toHaveClass('desbloqueada')
    expect(bloqueada.querySelector('.conquista-icone svg')).not.toBeNull()
    expect(within(bloqueada).getByText('40/100')).toBeInTheDocument()
    expect(within(bloqueada).getByRole('progressbar', { name: 'Progresso: Centenário' })).toHaveAttribute('aria-valuenow', '40')

    const feita = screen.getByText('Primeiro treino').closest('li')!
    expect(feita).toHaveClass('desbloqueada')
    expect(within(feita).getByText('Desbloqueada')).toBeInTheDocument()
    expect(within(feita).queryByRole('progressbar')).toBeNull()
  })

  it('filtra por desbloqueadas e bloqueadas', async () => {
    const user = userEvent.setup()
    abrirConquistas({ 'GET /stats/progress': progressoCom(catalogoDeConquistas) })
    await screen.findByText('Primeiro treino')
    expect(screen.getByRole('button', { name: 'Todas (4)' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Bloqueadas (2)' }))
    expect([...document.querySelectorAll('.conquista .conquista-texto strong')].map((e) => e.textContent)).toEqual(['Constância', 'Centenário'])

    await user.click(screen.getByRole('button', { name: 'Desbloqueadas (2)' }))
    expect([...document.querySelectorAll('.conquista .conquista-texto strong')].map((e) => e.textContent)).toEqual(['Primeiro treino', 'Embalado'])
  })

  it('toda conquista do catálogo do servidor tem um sprite colorido próprio, de 16 × 16', async () => {
    const { SPRITES, PALETA, FUNDO, LADO_SPRITE } = await import('./spritesConquistas')
    const ids = ['primeira-sessao', '10-sessoes', '50-sessoes', '100-sessoes', '3-dias', '7-dias', '30-dias', '10-horas', '100-num-dia', '1000-cestas', 'sequencia-10', 'sequencia-25', 'teste-fisico']
    for (const id of ids) {
      const grade = SPRITES[id]
      expect(grade, id).toBeDefined()
      expect(grade, id).toHaveLength(LADO_SPRITE)
      for (const linha of grade) {
        expect(linha, id).toHaveLength(LADO_SPRITE)
        for (const letra of linha) expect(letra === '.' || letra in PALETA, `${id}: ${letra}`).toBe(true)
      }
      // Tem desenho de verdade (não é um quadro vazio) e usa várias cores.
      const cores = new Set(grade.join('').replaceAll('.', ''))
      expect(cores.size, id).toBeGreaterThanOrEqual(4)
      expect(FUNDO[id], id).toMatch(/^#[0-9a-f]{6}$/i)
    }
    expect(new Set(ids.map((id) => SPRITES[id].join(''))).size).toBe(ids.length)
  })

  it('a conquista desbloqueada mostra o sprite colorido; a bloqueada, o cadeado', async () => {
    abrirConquistas({ 'GET /stats/progress': progressoCom([conquista('3-dias', 'Embalado', 3, 3), conquista('7-dias', 'Semana perfeita', 7, 2)]) })
    const feita = (await screen.findByText('Embalado')).closest('li')!
    const sprite = feita.querySelector('svg.conquista-sprite')!
    expect(sprite).not.toBeNull()
    // Várias cores no mesmo ícone, e o fundo do quadrado é o da conquista.
    expect(new Set([...sprite.querySelectorAll('rect')].map((r) => r.getAttribute('fill'))).size).toBeGreaterThanOrEqual(4)
    expect(feita.querySelector('.conquista-icone')).toHaveStyle({ '--fundo': '#2b3f9a' })

    const bloqueada = screen.getByText('Semana perfeita').closest('li')!
    expect(bloqueada.querySelector('svg.conquista-sprite')).toBeNull()
    expect(bloqueada.querySelector('.conquista-icone svg')).not.toBeNull()
  })
})
