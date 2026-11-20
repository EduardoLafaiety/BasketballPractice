import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { apiFalsa } from '../../../test/api-falsa'
import { abrirApp } from '../../../test/renderizar'

it('privacidade informa armazenamento essencial e afiliados sem controles de publicidade', () => {
  apiFalsa({})
  abrirApp('/privacidade')
  expect(screen.getByRole('heading', { name: '4. Cookies e armazenamento local' }).closest('section')).toHaveAttribute('id', 'cookies')
  expect(screen.getByRole('heading', { name: '5. Links de afiliados' })).toBeInTheDocument()
  expect(screen.getByText(/O site não utiliza cookies de publicidade/)).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Aviso de cookies' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Preferências de cookies' })).not.toBeInTheDocument()
})
