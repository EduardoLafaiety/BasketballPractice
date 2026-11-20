import { createContext, createElement, forwardRef, useContext, type ElementType, type ReactNode, type Key } from 'react'
import { jsx as original, jsxs as originais, Fragment } from 'react/jsx-runtime'
import { traduzir, useIdioma } from './idioma'
export { Fragment }
export type { JSX } from 'react/jsx-runtime'

const SemTraducao = createContext(false)
type Propriedades = Record<string, unknown> & { children?: ReactNode; translate?: string }
const texto = (filho: ReactNode): ReactNode => typeof filho === 'string' ? traduzir(filho) : Array.isArray(filho) ? filho.map(texto) : filho

// Cada elemento assina o idioma sem remontar telas, formulários ou demonstrações.
// O React continua dono dos nós: não há MutationObserver nem edição de texto no DOM.
const ElementoLocalizado = forwardRef<HTMLElement, Propriedades & { __tag: string }>(function ElementoLocalizado({ __tag, ...propriedades }, ref) {
  const tag = __tag as string
  useIdioma()
  const herdado = useContext(SemTraducao)
  const ignorar = herdado || propriedades.translate === 'no' || ['input', 'textarea', 'script', 'style'].includes(tag)
  const props: Propriedades = { ...propriedades, ref }
  if (!ignorar) {
    for (const atributo of ['title', 'placeholder', 'alt', 'aria-label', 'aria-description', 'aria-valuetext']) {
      const valor = props[atributo]
      if (typeof valor === 'string') props[atributo] = traduzir(valor)
    }
    props.children = texto(props.children)
    // Opções sem value explícito precisam continuar devolvendo o valor original ao aplicativo.
    if (tag === 'option' && props.value === undefined && typeof propriedades.children === 'string') props.value = propriedades.children
  } else if (tag === 'input' || tag === 'textarea') {
    for (const atributo of ['placeholder', 'aria-label', 'title']) {
      if (!herdado && typeof props[atributo] === 'string') props[atributo] = traduzir(props[atributo] as string)
    }
  }
  const elemento = createElement(tag, props)
  return propriedades.translate === 'no' && !herdado ? createElement(SemTraducao.Provider, { value: true }, elemento) : elemento
})

export function elementoLocalizado(tipo: ElementType, props: unknown): [ElementType, unknown] {
  if (typeof tipo !== 'string') return [tipo, props]
  const propriedades = (props ?? {}) as Propriedades & { ref?: unknown }
  return [ElementoLocalizado, { ...propriedades, __tag: tipo }]
}
export function jsx(tipo: ElementType, props: unknown, chave?: Key) {
  const [elemento, propriedades] = elementoLocalizado(tipo, props)
  return original(elemento, propriedades, chave)
}
export function jsxs(tipo: ElementType, props: unknown, chave?: Key) {
  const [elemento, propriedades] = elementoLocalizado(tipo, props)
  return originais(elemento, propriedades, chave)
}
