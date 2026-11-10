import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { FOTOS_ARTIGOS } from '../assets/artigos/fotos'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'
import { ARTIGOS } from './dados'
import { temIlustracao } from './Ilustracao'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

function abrir(caminho: string) {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
  abrirApp(caminho)
}

describe('imagens dos artigos', () => {
  it('a História usa foto com crédito e as outras categorias, ilustração própria', () => {
    for (const a of ARTIGOS) {
      const foto = FOTOS_ARTIGOS[a.id]
      if (a.categoria === 'historia') {
        expect(foto, a.id).toBeDefined()
        expect(foto.src && foto.srcPequena, a.id).toBeTruthy()
        expect(foto.fonte, a.id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
        expect(foto.autor && foto.licenca && foto.legenda, a.id).toBeTruthy()
      } else {
        expect(temIlustracao(a.id), a.id).toBe(true)
      }
    }
    // Nenhuma foto sobrando para um artigo que não existe.
    for (const id of Object.keys(FOTOS_ARTIGOS)) expect(ARTIGOS.map((a) => a.id)).toContain(id)
  })

  it('todo cartão da lista tem imagem', async () => {
    abrir('/artigos')
    await screen.findByRole('heading', { name: 'Artigos', level: 1 })
    expect(document.querySelectorAll('.artigo-cartao .artigo-imagem')).toHaveLength(ARTIGOS.length)
    expect(document.querySelectorAll('.artigo-cartao img')).toHaveLength(Object.keys(FOTOS_ARTIGOS).length)
  })

  it('o artigo com foto mostra a capa com a legenda e o link da licença', async () => {
    abrir('/artigos/dream-team')
    const capa = (await screen.findByRole('img', { name: /David Robinson/ })).closest('figure') as HTMLElement
    expect(within(capa).getByRole('link', { name: 'Domínio público' })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Dream_Team_at_the_1992_Summer_Olympics.JPEG',
    )
  })

  it('o artigo de ciência mostra a ilustração, sem crédito de foto', async () => {
    abrir('/artigos/hidratacao')
    await screen.findByRole('heading', { name: /Hidratação/, level: 1 })
    const capa = document.querySelector('.artigo-capa') as HTMLElement
    expect(capa.querySelector('svg.artigo-ilustracao')).not.toBeNull()
    expect(capa.querySelector('figcaption')).toBeNull()
  })
})
