import { useCallback, useEffect, useState } from 'react'

/** Busca ao abrir, com carregando, erro e "tentar de novo". */
export function useCarga<T>(buscar: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const carregar = useCallback(() => {
    setErro(null)
    buscar().then(setDados, setErro)
  }, [buscar])
  useEffect(carregar, [carregar])
  return { dados, erro, carregar }
}
