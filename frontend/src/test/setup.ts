import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { definirToken } from '../api'
import { limparCache } from '../store'

// Avisos do React Router sobre a futura v7: não indicam problema e só poluem a saída.
const avisar = console.warn
console.warn = (...args: unknown[]) => {
  if (String(args[0]).includes('React Router Future Flag Warning')) return
  avisar(...args)
}

// O jsdom não tem Blob.text() (todo navegador atual tem); lê pelo FileReader, que ele implementa.
if (!Blob.prototype.text) {
  Blob.prototype.text = function (this: Blob) {
    return new Promise<string>((resolver, rejeitar) => {
      const leitor = new FileReader()
      leitor.onload = () => resolver(String(leitor.result))
      leitor.onerror = () => rejeitar(leitor.error)
      leitor.readAsText(this)
    })
  }
}

afterEach(() => {
  cleanup()
  definirToken(null)
  limparCache()
  globalThis.localStorage?.clear() // os testes da demonstração rodam em Node, sem localStorage
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
