// Guarda o resultado de uma busca por um tempo, na memória e na sessão do navegador, para não buscar
// de novo a cada página. Um erro nunca fica guardado: a próxima chamada tenta de novo.

const chaves = new Set<string>()

export function comValidade<T>(chave: string, validadeMs: number, buscar: () => Promise<T>) {
  chaves.add(chave)
  let emMemoria: { quando: number; dados: T } | null = null

  const guardado = () => {
    if (emMemoria) return emMemoria
    try {
      const salvo = sessionStorage.getItem(chave)
      return salvo ? (JSON.parse(salvo) as { quando: number; dados: T }) : null
    } catch {
      return null
    }
  }

  const buscarGuardado = async (agora = Date.now()): Promise<T> => {
    const antes = guardado()
    if (antes && agora - antes.quando < validadeMs) return antes.dados
    const dados = await buscar()
    emMemoria = { quando: agora, dados }
    try {
      sessionStorage.setItem(chave, JSON.stringify(emMemoria))
    } catch {
      // sem armazenamento: fica só na memória
    }
    return dados
  }
  buscarGuardado.esquecer = () => {
    emMemoria = null
    try {
      sessionStorage.removeItem(chave)
    } catch {
      // nada guardado
    }
  }
  return buscarGuardado
}
