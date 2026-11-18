import type { NovaSessao } from '../../../shared/types'
import { ApiError } from '../../../shared/api/http'
import { pendentes, removerPendente } from './treino-local'

// Uma fila por conta, inclusive se mais de um componente pedir sincronização.
export interface FalhaEnvio { sessao: NovaSessao; erro: ApiError }
export interface ResultadoEnvio { enviadas: number; falhas: FalhaEnvio[]; interrupcao?: Error }
const envios = new Map<string, Promise<ResultadoEnvio>>()
export function sincronizar(conta: string, enviar: (s: NovaSessao) => Promise<unknown>, ativa: () => boolean, ignorar: (s: NovaSessao) => boolean = () => false): Promise<ResultadoEnvio> {
  const existente = envios.get(conta)
  if (existente) return existente
  const executar = async () => {
    const resultado: ResultadoEnvio = { enviadas: 0, falhas: [] }
    for (const s of pendentes(conta)) {
      if (!ativa()) return resultado
      if (ignorar(s)) continue
      try { await enviar(s) }
      catch (erro) {
        if (!ativa()) return resultado
        // Rejeições do registro não impedem enviar os demais. Falhas de acesso,
        // limite de pedidos e rede interrompem a tentativa e preservam toda a fila.
        if (erro instanceof ApiError && [400, 404, 409, 422].includes(erro.status)) {
          resultado.falhas.push({ sessao: s, erro }); continue
        }
        resultado.interrupcao = erro instanceof Error ? erro : new Error('Não foi possível enviar as sessões.')
        return resultado
      }
      if (!ativa()) return resultado
      resultado.enviadas++
      // Releitura preserva sessões adicionadas enquanto a rede respondia.
      const atual = pendentes(conta).find((p) => p.clientId === s.clientId)
      if (JSON.stringify(atual) === JSON.stringify(s)) removerPendente(conta, s.clientId!)
    }
    return resultado
  }
  const envio = (navigator.locks ? navigator.locks.request(`bp-treino-envio:${conta}`, executar) : executar()).finally(() => { envios.delete(conta) })
  envios.set(conta, envio)
  return envio
}
