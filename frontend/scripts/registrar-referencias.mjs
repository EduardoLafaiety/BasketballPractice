import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
const raiz = new URL('../', import.meta.url)
const catalogo = readFileSync(new URL('../../backend/src/db/catalog.ts', import.meta.url), 'utf8')
const fontes = {
  arremesso: 'https://jr.nba.com/shooting/',
  drible: 'https://jr.nba.com/how-to-dribble-a-basketball',
  progressao: 'https://jr.nba.com/basketball-practice-plans/starter/',
  bandeja: 'https://www.usab.com/news/2014/01/the-stride-stop-layup',
  passe: 'https://www.usab.com/news/2014/01/basketball-101-fundamentals-of-passing',
  fundamentos: 'https://assets.fiba.basketball/image/upload/documents-corporate-wabc-start-coaching-eng-facilitator-handbook.pdf',
  aquecimento: 'https://jr.nba.com/jrnbaathome/',
  agachamento: 'https://www.acefitness.org/resources/everyone/exercise-library/135/bodyweight-squat/',
  afundo: 'https://www.acefitness.org/resources/everyone/exercise-library/94/forward-lunge/',
  captura: 'https://mocap.cs.cmu.edu/',
}
const principios = {
  arremesso: ['Base equilibrada e flexão coordenada das pernas.', 'Mão dominante sustenta; apoio lateral não impulsiona.', 'Extensão do cotovelo seguida da soltura pelos dedos.'],
  drible: ['Olhar elevado e base estável.', 'Controle pelos dedos, contato por cima no quique vertical.', 'Transferência de mão acompanha a trajetória; não carregar a bola por baixo.'],
  finalizacao: ['Na bandeja convencional, impulsão na perna oposta à mão.', 'Recolher a bola antes da sequência de passos.', 'Variações com dois pés, reversa e finger roll precisam de revisão própria.'],
  passe: ['Receber com as mãos prontas e dedos abertos.', 'Coordenar passo, extensão dos braços e soltura.', 'A orientação da mão varia entre peito, picado, alto e passe de uma mão.'],
  defesa: ['Base estável com flexão de quadris e joelhos.', 'Passos laterais controlados, mantendo equilíbrio.', 'Frear antes de mudar de direção.'],
  condicionamento: ['Respeitar apoio, amplitude e alinhamento de cada exercício.', 'Aterrissar com flexão de quadril e joelhos.', 'Não aplicar uma mesma coreografia a todos os exercícios.'],
}
const exercicios = [...catalogo.matchAll(/^\s+\['([^']+)', '(arremesso|drible|finalizacao|passe|defesa|condicionamento)', '[^']+', '([^']+)'\]/gm)].map(([, nome, categoria, descricao]) => {
  const familia = /gancho/i.test(nome) ? 'gancho' : /deitado/i.test(nome) ? 'arremesso-deitado' : /sentado|cadeira/i.test(nome) ? `${categoria}-sentado` : /reversa|reverso/i.test(nome) ? 'finalizacao-reversa' : /finger|por baixo/i.test(nome) ? 'finalizacao-por-baixo' : /euro/i.test(nome) ? 'eurostep' : categoria
  const referencias = categoria === 'arremesso' ? ['arremesso', 'progressao'] : categoria === 'finalizacao' ? ['bandeja', 'progressao'] : categoria === 'drible' ? ['drible', 'progressao'] : categoria === 'passe' ? ['passe', 'fundamentos'] : categoria === 'defesa' ? ['fundamentos', 'progressao'] : /agachamento/i.test(nome) ? ['agachamento', 'aquecimento'] : /afundo/i.test(nome) ? ['afundo', 'aquecimento'] : ['aquecimento']
  return { nome, categoria, familia, descricao, referencias, revisao: 'Fundamentos de família registrados; validação técnica e visual individual pendente.' }
})
if (exercicios.length !== 181 || new Set(exercicios.map(e => e.nome)).size !== 181) throw new Error('Catálogo mudou: revisar cobertura das referências')
mkdirSync(new URL('src/features/demonstracoes/referencias/', raiz), { recursive: true })
writeFileSync(new URL('src/features/demonstracoes/referencias/catalogo.json', raiz), JSON.stringify({ consultadoEm: '2026-11-18', fontes, principios, limites: 'Fontes de fundamentos não equivalem a captura de todos os exercícios. O CMU não captura os dedos nem a bola. Testes geométricos não certificam execução humana.', exercicios }, null, 2) + '\n')
