import type { Sessao } from '../types'

/** Oferece um arquivo para download a partir de um conteúdo gerado no navegador. */
export function baixarArquivo(conteudo: BlobPart, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Ponto e vírgula e BOM: o Excel em português abre o CSV com acentos e colunas certas.
const celula = (valor: unknown) => {
  const texto = valor === undefined || valor === null ? '' : String(valor)
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function sessoesParaCsv(sessoes: Sessao[]) {
  const cabecalho = ['Data', 'Treino', 'Duração (min)', 'Acertos', 'Tentativas', 'Aproveitamento (%)', 'Repetições',
    'Maior sequência', 'Esforço (1-5)', 'Cansaço (1-5)', 'Notas']
  const linhas = sessoes.map((s) => [
    new Date(s.data).toLocaleString('pt-BR'),
    s.drillNome ?? 'Treino livre',
    s.duracaoMin || '',
    s.acertos,
    s.tentativas,
    s.tentativas ? Math.round(((s.acertos ?? 0) / s.tentativas) * 1000) / 10 : '',
    s.repeticoes,
    s.sequencia,
    s.esforco,
    s.cansaco,
    s.notas,
  ])
  return '﻿' + [cabecalho, ...linhas].map((linha) => linha.map(celula).join(';')).join('\r\n')
}
