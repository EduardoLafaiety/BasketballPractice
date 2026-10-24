export default function BarraProgresso({ valor, alvo, rotulo }: { valor: number; alvo: number; rotulo: string }) {
  const pct = Math.min(100, Math.round((valor / alvo) * 100))
  return (
    <div
      className={`barra-progresso ${pct >= 100 ? 'completa' : ''}`}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={alvo}
      aria-valuenow={Math.min(valor, alvo)}
    >
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}
