import { one, type Database } from './index.js'

type SeedExercise = [name: string, category: string, metric: string, description: string]

const catalog: SeedExercise[] = [
  ['Lance livre', 'arremesso', 'acertos', 'Arremessos da linha de lance livre, mantendo a mesma rotina antes de cada tentativa.'],
  ['Arremesso de média distância', 'arremesso', 'acertos', 'Arremessos parados de 5 pontos ao redor do garrafão.'],
  ['Arremesso de três', 'arremesso', 'acertos', 'Arremessos de 3 pontos das cinco posições: zonas mortas, 45° e topo.'],
  ['Arremesso após drible', 'arremesso', 'acertos', 'Um ou dois dribles e arremesso em pull-up.'],
  ['Mikan drill', 'finalizacao', 'acertos', 'Bandejas alternadas embaixo da cesta, sem deixar a bola cair.'],
  ['Bandeja com a mão fraca', 'finalizacao', 'acertos', 'Bandejas partindo da linha de 3, sempre com a mão não dominante.'],
  ['Drible estacionário', 'drible', 'tempo', 'Drible baixo, alto, cruzado, entre as pernas e por trás, parado no lugar.'],
  ['Drible com duas bolas', 'drible', 'tempo', 'Drible simultâneo e alternado com duas bolas.'],
  ['Zigue-zague com mudança de direção', 'drible', 'repeticoes', 'Deslocamento em zigue-zague pela quadra trocando de mão em cada cone.'],
  ['Passe na parede', 'passe', 'repeticoes', 'Passes de peito, picados e por cima da cabeça contra a parede.'],
  ['Deslizamento defensivo', 'defesa', 'tempo', 'Deslocamento lateral em base baixa, de lado a lado do garrafão.'],
  ['Closeout', 'defesa', 'repeticoes', 'Sair do garrafão até a linha de 3 e fechar o arremessador com passos curtos.'],
  ['Suicídio', 'condicionamento', 'tempo', 'Corridas de ida e volta às linhas da quadra.'],
  ['Saltos na caixa', 'condicionamento', 'repeticoes', 'Saltos explosivos para melhorar a impulsão.'],
]

// Popula o catálogo padrão (exercícios sem dono) apenas na primeira execução.
export async function seed(db: Database) {
  await db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(4242)')
    if (await one(tx, 'SELECT 1 FROM exercises WHERE user_id IS NULL LIMIT 1')) return

    for (const exercise of catalog) {
      await tx.query('INSERT INTO exercises (name, category, metric, description) VALUES ($1, $2, $3, $4)', exercise)
    }
  })
}
