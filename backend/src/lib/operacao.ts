/** Nunca recebe corpo, URL, SQL, mensagem ou stack de uma exceção. */
export function registrarFalha(evento: string, error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  const codigo = typeof code === 'string' && /^(?:[0-9A-Z]{5}|ECONNRESET|ECONNREFUSED|ETIMEDOUT)$/.test(code) ? code : 'unknown'
  console.error(JSON.stringify({ evento, codigo }))
}
