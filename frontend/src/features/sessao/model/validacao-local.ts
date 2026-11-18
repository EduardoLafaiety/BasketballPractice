import type { BlocoPlano, Entrada, NovaSessao, Zona } from '../../../shared/types'

export const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export const inteiro = (v: unknown, min = 0, max = 2_147_483_647): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
export const texto = (v: unknown): v is string => typeof v === 'string'
export const dataValida = (v: unknown): v is string => texto(v) && Number.isFinite(Date.parse(v))
export const ZONAS: Zona[] = ['garrafao', 'lance_livre', 'media_canto_e', 'media_ala_e', 'media_topo', 'media_ala_d', 'media_canto_d', 'tres_canto_e', 'tres_ala_e', 'tres_topo', 'tres_ala_d', 'tres_canto_d']
export const zonaValida = (v: unknown): v is Zona => ZONAS.includes(v as Zona)
export const categoriaValida = (v: unknown) => ['Arremesso', 'Drible', 'Passe', 'Finalização', 'Defesa', 'Condicionamento'].includes(v as string)
const opcional = (v: unknown, validar: (v: unknown) => boolean) => v === undefined || validar(v)

export function contagemValida(v: unknown): v is { acertos: number; tentativas: number } {
  return objeto(v) && inteiro(v.acertos) && inteiro(v.tentativas) && v.acertos <= v.tentativas
}
export function entradaValida(v: unknown): v is Entrada {
  return objeto(v) && texto(v.drillId) && v.drillId.length > 0 && opcional(v.drillNome, texto) &&
    ['acertos', 'tentativas', 'repeticoes', 'segundos', 'sequencia'].every((k) => opcional(v[k], inteiro)) &&
    (v.acertos === undefined || v.tentativas === undefined || Number(v.acertos) <= Number(v.tentativas)) &&
    (v.sequencia === undefined || v.acertos === undefined || Number(v.sequencia) <= Number(v.acertos))
}
export function blocoValido(v: unknown): v is BlocoPlano {
  return objeto(v) && texto(v.drillId) && v.drillId.length > 0 && texto(v.nome) && categoriaValida(v.categoria) &&
    ['acertos', 'repeticoes', 'tempo'].includes(v.metrica as string) && typeof v.minutos === 'number' && Number.isFinite(v.minutos) && v.minutos > 0 && v.minutos <= 1440
}
export function programaValido(v: unknown) {
  return objeto(v) && texto(v.id) && v.id.length > 0 && inteiro(v.dia, 1, 366)
}
/** Validação estrutural local; rejeições editáveis do contrato HTTP continuam revisáveis na fila. */
export function sessaoValida(v: unknown): v is NovaSessao & { clientId: string } {
  return objeto(v) && texto(v.clientId) && v.clientId.length > 0 && dataValida(v.data) && inteiro(v.duracaoMin, 1, 1440) &&
    Array.isArray(v.entradas) && v.entradas.length <= 100 && v.entradas.every(entradaValida) &&
    opcional(v.zonas, (z) => Array.isArray(z) && z.length <= ZONAS.length && z.every((item) => objeto(item) && zonaValida(item.zona) && contagemValida(item)) && new Set(z.map((item) => item.zona)).size === z.length) &&
    opcional(v.notas, texto) && opcional(v.esforco, (n) => inteiro(n, 1, 5)) && opcional(v.cansaco, (n) => inteiro(n, 1, 5)) &&
    opcional(v.workoutId, (n) => inteiro(n, 1)) && opcional(v.tzOffset, (n) => inteiro(n, -840, 840)) && opcional(v.programa, programaValido)
}
