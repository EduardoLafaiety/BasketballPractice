import { useState } from 'react'
import { useDrills } from '../store'
import { coreografiaDe } from './coreografias'
import Demonstracao from './Demonstracao'

/** Demonstração recolhida, que só monta (e anima) quando o atleta abre. */
export default function ComoFazer({ drillId, nome }: { drillId: string; nome: string }) {
  const [aberto, setAberto] = useState(false)
  const drill = useDrills().drillPorId(drillId)
  // Exercício do próprio atleta (ou ainda não carregado) não tem demonstração.
  const coreografia = drill && coreografiaDe(nome, drill.personalizado)
  if (!coreografia) return null
  return (
    <details className="guiada-demo" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary>Ver como fazer</summary>
      {aberto && <Demonstracao coreografia={coreografia} nome={nome} />}
    </details>
  )
}
