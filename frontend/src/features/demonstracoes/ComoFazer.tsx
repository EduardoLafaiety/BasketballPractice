import { useDrills } from '../treinos/model/usarExercicios'
import { coreografiaDe } from './coreografias'
import Demonstracao from './Demonstracao'

/** Demonstração do exercício em andamento, sempre à vista durante o treino. */
export default function ComoFazer({ drillId, nome, somenteTexto = false, descricaoOffline }: { drillId: string; nome: string; somenteTexto?: boolean; descricaoOffline?: string }) {
  const drill = useDrills().drillPorId(drillId)
  if (somenteTexto) return <section className="card" aria-label={`Instruções: ${nome}`}><h2>Como fazer</h2><p>{descricaoOffline || drill?.descricao || 'Siga as orientações do treino preparado. A demonstração animada fica disponível com conexão.'}</p></section>
  // Exercício do próprio atleta (ou ainda não carregado) não tem demonstração.
  const coreografia = drill && coreografiaDe(nome, drill.personalizado)
  if (!coreografia) return null
  return <Demonstracao coreografia={coreografia} nome={nome} />
}
