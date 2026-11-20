import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { useState } from 'react'
import { definirIdioma, traduzir } from './idioma'

afterEach(async () => { await act(() => definirIdioma('pt')) })

function Formulario() {
  const [nome, setNome] = useState('Arremesso')
  return <><h1>Treinos</h1><label>Nome<input value={nome} onChange={e => setNome(e.target.value)} /></label>
    <p translate="no">Arremesso</p><select aria-label="Fundamento" defaultValue="Arremesso"><option>Arremesso</option><option>Drible</option></select></>
}

it('traduz a apresentação e acessibilidade sem alterar valores, conteúdo pessoal ou estado do formulário', async () => {
  render(<Formulario />)
  const input = screen.getByLabelText('Nome')
  await userEvent.type(input, ' pessoal')
  await act(() => definirIdioma('en'))
  expect(screen.getByRole('heading', { name: 'Workouts' })).toBeInTheDocument()
  expect(screen.getByLabelText('Name')).toBe(input)
  expect(input).toHaveValue('Arremesso pessoal')
  expect(screen.getByText('Arremesso', { selector: 'p' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Skill' })).toHaveValue('Arremesso')
  expect(screen.getByRole('option', { name: 'Shooting' })).toBeInTheDocument()
  expect(document.documentElement.lang).toBe('en')
  await act(() => definirIdioma('pt'))
  expect(screen.getByRole('heading', { name: 'Treinos' })).toBeInTheDocument()
  expect(input).toHaveValue('Arremesso pessoal')
})

it('traduz o conteúdo fixo do catálogo e preserva os parâmetros das frases', async () => {
  await definirIdioma('en')
  expect(traduzir('Drible sentado')).toBe('Seated dribbling')
  expect(traduzir('Treine no seu ritmo. Evolua a cada jogada.')).toBe('Train at your own pace. Improve with every play.')
  expect(traduzir('Progresso em Drible sentado')).toBe('Progress in Seated dribbling')
  expect(localStorage.getItem('bp.idioma')).toBe('en')
})
