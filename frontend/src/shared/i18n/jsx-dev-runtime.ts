import { jsxDEV as original, type JSXSource } from 'react/jsx-dev-runtime'
import type { ElementType, Key } from 'react'
import { elementoLocalizado } from './jsx-runtime'
export { Fragment } from './jsx-runtime'
export type { JSX } from './jsx-runtime'

export function jsxDEV(tipo: ElementType, props: unknown, chave: Key | undefined, estaticos: boolean, origem?: JSXSource, contexto?: unknown) {
  const [elemento, propriedades] = elementoLocalizado(tipo, props)
  return original(elemento, propriedades, chave, estaticos, origem, contexto)
}
