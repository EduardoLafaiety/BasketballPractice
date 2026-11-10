import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { anunciosPermitidos, consentimentoSalvo, fecharPreferenciasCookies } from '../lib/cookies'
import { apiFalsa } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const aviso = () => screen.queryByRole('region', { name: 'Aviso de cookies' })

afterEach(() => fecharPreferenciasCookies())

describe('Aviso de cookies', () => {
  it('aparece na primeira visita, com Recusar e Aceitar lado a lado e o link para a política', () => {
    apiFalsa({})
    abrirApp('/entrar')

    const regiao = within(aviso()!)
    expect(regiao.getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
    expect(regiao.getByRole('button', { name: 'Aceitar' })).toBeInTheDocument()
    expect(regiao.getByRole('link', { name: 'Saiba mais' })).toHaveAttribute('href', '/privacidade#cookies')
    expect(anunciosPermitidos()).toBe(false)
  })

  it.each([
    ['Aceitar', 'aceito', true],
    ['Recusar', 'recusado', false],
  ] as const)('%s guarda a escolha e some', async (botao, escolha, permitidos) => {
    const user = userEvent.setup()
    apiFalsa({})
    abrirApp('/entrar')

    await user.click(screen.getByRole('button', { name: botao }))
    expect(aviso()).not.toBeInTheDocument()
    expect(consentimentoSalvo()).toBe(escolha)
    expect(anunciosPermitidos()).toBe(permitidos)
  })

  it('não volta depois de respondido, mas reabre pelas preferências mostrando a escolha atual', async () => {
    const user = userEvent.setup()
    localStorage.setItem('bp.cookies', JSON.stringify({ versao: 1, escolha: 'aceito' }))
    apiFalsa({})
    abrirApp('/privacidade')
    expect(aviso()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Preferências de cookies' }))
    expect(aviso()).toHaveTextContent('anúncios personalizados permitidos')

    await user.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(consentimentoSalvo()).toBe('recusado')

    await user.click(screen.getByRole('button', { name: 'Preferências de cookies' }))
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(aviso()).not.toBeInTheDocument()
    expect(consentimentoSalvo()).toBe('recusado')
  })

  it('pergunta de novo quando a resposta guardada é de outra versão ou está corrompida', () => {
    localStorage.setItem('bp.cookies', JSON.stringify({ versao: 0, escolha: 'aceito' }))
    expect(consentimentoSalvo()).toBeNull()
    localStorage.setItem('bp.cookies', '{quebrado')
    expect(consentimentoSalvo()).toBeNull()
  })

  it('a política explica cookies, anúncios do Google e links da Amazon', () => {
    apiFalsa({})
    abrirApp('/privacidade')

    expect(screen.getByRole('heading', { name: 'Cookies e armazenamento no navegador' })).toHaveAttribute('id', 'cookies')
    expect(screen.getByRole('heading', { name: 'Anúncios' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Links da Amazon' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'adssettings.google.com' })).toHaveAttribute('href', 'https://adssettings.google.com')
    expect(screen.getByText(/Como Associado da Amazon/)).toBeInTheDocument()
  })
})
