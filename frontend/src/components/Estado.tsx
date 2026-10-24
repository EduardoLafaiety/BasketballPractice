export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="vazio estado" role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      {texto}
    </div>
  )
}

/** Aviso discreto quando a página mostra dados guardados mas não conseguiu atualizá-los. */
export function AvisoDesatualizado({ erro, tentarDeNovo }: { erro: Error | null; tentarDeNovo: () => void }) {
  if (!erro) return null
  return (
    <p className="erro aviso" role="alert">
      Não foi possível atualizar: {erro.message}{' '}
      <button className="link botao-link" onClick={tentarDeNovo}>Tentar de novo</button>
    </p>
  )
}

export function ErroCarga({ erro, tentarDeNovo }: { erro: Error; tentarDeNovo?: () => void }) {
  return (
    <div className="vazio estado estado-erro" role="alert">
      <p>{erro.message}</p>
      {tentarDeNovo && (
        <button className="btn" onClick={tentarDeNovo}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}
