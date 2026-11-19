import { afterEach, describe, expect, it } from 'vitest'
import { carregarAdsense, conteudoAdsTxt, definirPersonalizacao, idEditor } from './adsense'

describe('ads.txt do AdSense', () => {
  it('aceita o ID como aparece na conta (ca-pub-) ou sem o prefixo', () => {
    expect(idEditor('ca-pub-1234567890123456')).toBe('pub-1234567890123456')
    expect(idEditor(' pub-1234567890123456 ')).toBe('pub-1234567890123456')
  })

  it('sem ID, não há ads.txt', () => {
    expect(idEditor(undefined)).toBeNull()
    expect(idEditor('  ')).toBeNull()
  })

  it.each(['pub-123', 'ca-pub-12345678901234567', 'google.com, pub-1234567890123456', 'pub-123456789012345a'])(
    'recusa o formato errado: %s',
    (valor) => {
      expect(() => idEditor(valor)).toThrow('VITE_ADSENSE_ID inválido')
    },
  )

  it('gera a linha do Google no formato da IAB', () => {
    expect(conteudoAdsTxt('pub-1234567890123456')).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n')
  })
})

describe('script do AdSense', () => {
  afterEach(() => {
    document.querySelectorAll('script[data-adsense]').forEach((s) => s.remove())
    delete window.adsbygoogle
  })

  it('entra uma vez só, com o ID do editor, e pede anúncios não personalizados sem o Aceitar', () => {
    carregarAdsense('pub-1234567890123456', false)
    carregarAdsense('pub-1234567890123456', false)

    const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-adsense]')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456')
    expect(scripts[0].async).toBe(true)
    expect(window.adsbygoogle?.requestNonPersonalizedAds).toBe(1)
  })

  it('com o Aceitar, os próximos anúncios podem ser personalizados; recusando de novo, voltam a não ser', () => {
    carregarAdsense('pub-1234567890123456', true)
    expect(window.adsbygoogle?.requestNonPersonalizedAds).toBe(0)
    definirPersonalizacao(false)
    expect(window.adsbygoogle?.requestNonPersonalizedAds).toBe(1)
  })
})
