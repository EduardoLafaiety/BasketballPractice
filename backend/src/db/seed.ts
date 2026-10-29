import type { Database } from './index.js'

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
  // Movimentos usados pelos estilos de jogo (aba "Jogue como").
  ['Corta-luz com cadeira', 'passe', 'repeticoes', 'Uma cadeira faz o papel do pivô: sair raspando o bloqueio e escolher entre arremesso, bandeja ou passe na parede.'],
  ['Step-back de três', 'arremesso', 'acertos', 'Dois dribles para a frente, recuo empurrando com o pé da frente e arremesso de três em base larga.'],
  ['Hesitação em linha reta', 'drible', 'repeticoes', 'Drible de fundo a fundo alternando desaceleração e explosão no primeiro passo.'],
  ['Fadeaway do cotovelo', 'arremesso', 'acertos', 'De costas para a cesta no cotovelo do garrafão, giro sobre o pé de apoio e arremesso caindo para trás.'],
  ['Floater em uma perna', 'finalizacao', 'acertos', 'Saída com um pé só a dois passos do aro, soltando a bola alta com a ponta dos dedos.'],
  ['Bandeja com contato', 'finalizacao', 'acertos', 'Bandejas absorvendo contato de uma almofada ou de um parceiro, protegendo a bola com as duas mãos.'],
  ['Eurostep entre cones', 'finalizacao', 'acertos', 'Dois passos em direções opostas entre os cones e bandeja longe do defensor.'],
  ['Trabalho de pés no poste baixo', 'finalizacao', 'repeticoes', 'Drop step e meia-volta dos dois lados do garrafão, terminando com bandeja ou gancho.'],
  ['Corre e arremessa', 'arremesso', 'acertos', 'Corridas entre dois cones com um arremesso de três cada vez que chegar na linha.'],
]

// Insere no catálogo padrão (exercícios sem dono) o que ainda não estiver lá, pelo nome: um banco novo
// recebe tudo e um banco antigo só os exercícios adicionados depois. O catálogo não pode ser apagado nem
// renomeado pela API, então nada volta sem querer. Um exercício do atleta com o mesmo nome não conta.
export async function seed(db: Database) {
  await db.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(4242)')
    for (const exercise of catalog) {
      await tx.query(
        `INSERT INTO exercises (name, category, metric, description)
         SELECT $1, $2, $3, $4
         WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = $1)`,
        exercise,
      )
    }
  })
}
