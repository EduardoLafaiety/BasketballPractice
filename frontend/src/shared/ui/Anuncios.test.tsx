import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirConsentimento } from '../lib/cookies'

// O ID é lido quando o módulo carrega: cada teste define o ambiente e importa o componente de novo.
async function montar(id?: string) {
  vi.resetModules()
  vi.stubEnv('VITE_ADSENSE_ID', id ?? '')
  const { default: Anuncios } = await import('./Anuncios')
  render(<Anuncios />)
}

const script = () => document.querySelector<HTMLScriptElement>('script[data-adsense]')

afterEach(() => {
  vi.unstubAllEnvs()
  script()?.remove()
  delete window.adsbygoogle
})

describe('Anúncios', () => {
  it('sem VITE_ADSENSE_ID, o site não carrega o AdSense', async () => {
    await montar()
    expect(script()).toBeNull()
    expect(window.adsbygoogle).toBeUndefined()
  })

  it('com o ID, carrega na primeira visita sem personalizar e passa a personalizar depois do Aceitar', async () => {
    await montar('ca-pub-1234567890123456')
    expect(script()?.src).toContain('client=ca-pub-1234567890123456')
    expect(window.adsbygoogle?.requestNonPersonalizedAds).toBe(1)

    act(() => definirConsentimento('aceito'))
    expect(window.adsbygoogle?.requestNonPersonalizedAds).toBe(0)
    act(() => definirConsentimento('recusado'))
    expect(window.adsbygoogle?.requestNonPersonalizedAds).toBe(1)
    expect(document.querySelectorAll('script[data-adsense]')).toHaveLength(1)
  })
})
