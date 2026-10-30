import { useDrills } from '../store'
import { coreografiaDe } from './coreografias'
import Demonstracao from './Demonstracao'

/** Demonstração do exercício em andamento, sempre à vista durante o treino. */
export default function ComoFazer({ drillId, nome }: { drillId: string; nome: string }) {
  const drill = useDrills().drillPorId(drillId)
  // Exercício do próprio atleta (ou ainda não carregado) não tem demonstração.
  const coreografia = drill && coreografiaDe(nome, drill.personalizado)
  if (!coreografia) return null
  return <Demonstracao coreografia={coreografia} nome={nome} />
}
