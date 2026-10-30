import type { Nivel } from '../types'

/** Os níveis do catálogo, do mais simples ao mais difícil. */
export const NIVEIS: { id: Nivel; rotulo: string; foco: string }[] = [
  { id: 'iniciante', rotulo: 'Iniciante', foco: 'Controle de bola e a forma certa de arremessar.' },
  { id: 'intermediario', rotulo: 'Intermediário', foco: 'Mudanças de direção, arremesso em movimento e leitura de jogo.' },
  { id: 'avancado', rotulo: 'Avançado', foco: 'Combinações, arremesso em velocidade, contato e explosão.' },
]

export const ROTULO_NIVEL = Object.fromEntries(NIVEIS.map((n) => [n.id, n.rotulo])) as Record<Nivel, string>
