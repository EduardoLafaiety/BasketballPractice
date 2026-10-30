import { describe, expect, it } from 'vitest'
import { STYLES } from '../../../../backend/src/routes/styles'
import { FOTOS_JOGADORES } from './fotos'

describe('Fotos dos jogadores', () => {
  it('todo estilo da API tem foto com crédito, e nenhuma foto sobra', () => {
    const ids = STYLES.map((s) => s.id).sort()
    expect(Object.keys(FOTOS_JOGADORES).sort()).toEqual(ids)
    for (const foto of Object.values(FOTOS_JOGADORES)) {
      expect(foto.autor).not.toBe('')
      expect(foto.licenca).toMatch(/^(CC BY(-SA)? \d\.\d|CC0|Domínio público)$/)
      expect(foto.fonte).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    }
  })
})
