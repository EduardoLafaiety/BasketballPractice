import assert from 'node:assert/strict'
import { it } from 'node:test'
import { billingRequired } from '../src/config.js'

it('produção exige pagamento mesmo com flag vazia, falsa ou ausente', () => {
  for (const flag of [undefined, '', 'false', 'true']) assert.equal(billingRequired('production', flag), true)
  assert.equal(billingRequired('development', 'true'), true)
  assert.equal(billingRequired('test', 'false'), false)
})
