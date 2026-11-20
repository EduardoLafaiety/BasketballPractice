import { useSyncExternalStore } from 'react'

export type Idioma = 'pt' | 'en'
let atual: Idioma = 'pt'
let ingles: Record<string, string> = {}
let padroes: { regex: RegExp; traducao: string }[] = []
const ouvintes = new Set<() => void>()
const assinar = (fn: () => void) => { ouvintes.add(fn); return () => { ouvintes.delete(fn) } }
const obter = () => atual
const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim()
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function useIdioma() {
  return useSyncExternalStore(assinar, obter, () => 'pt' as Idioma)
}

export function idiomaAtual() { return atual }
export function localeAtual() { return atual === 'en' ? 'en-US' : 'pt-BR' }

export async function definirIdioma(idioma: Idioma) {
  if (idioma === 'en' && !Object.keys(ingles).length) {
    const [base, revisao, exercicios, landing, billing] = await Promise.all([import('./en.json'), import('./revisao-en.json'), import('./exercicios-en.json'), import('./landing-en.json'), import('./billing-en.json')])
    ingles = { ...base.default, ...revisao.default, ...exercicios.default, ...landing.default, ...billing.default }
    padroes = Object.entries(ingles).filter(([pt]) => /\{\d+\}/.test(pt)).map(([pt, en]) => ({
      regex: new RegExp('^' + pt.split(/\{\d+\}/).map(escapar).join('(.+?)') + '$'),
      traducao: en,
    })).sort((a, b) => b.regex.source.length - a.regex.source.length)
  }
  atual = idioma
  document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR'
  try { localStorage.setItem('bp.idioma', idioma) } catch { /* vale nesta visita */ }
  ouvintes.forEach(fn => fn())
}

export async function iniciarIdioma() {
  try { if (localStorage.getItem('bp.idioma') === 'en') await definirIdioma('en') } catch { /* português por padrão */ }
}

/** Traduz somente apresentação; IDs, valores de formulários e objetos da API não são alterados. */
export function traduzir(texto: string): string {
  if (atual === 'pt' || !texto.trim()) return texto
  const chave = normalizar(texto)
  let traducao = ingles[chave]
  if (!traducao) {
    for (const padrao of padroes) {
      const partes = chave.match(padrao.regex)
      if (partes) {
        traducao = padrao.traducao.replace(/\{(\d+)\}/g, (_, i: string) => traduzir(partes[Number(i) + 1]))
        break
      }
    }
  }
  return traducao ? (texto.match(/^\s*/)?.[0] ?? '') + traducao + (texto.match(/\s*$/)?.[0] ?? '') : texto
}
