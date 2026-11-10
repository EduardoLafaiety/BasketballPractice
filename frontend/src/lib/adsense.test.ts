import { describe, expect, it } from 'vitest'
import { conteudoAdsTxt, idEditor } from './adsense'

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
