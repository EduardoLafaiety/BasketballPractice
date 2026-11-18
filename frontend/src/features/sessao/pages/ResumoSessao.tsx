import { useEffect, useRef, useState, type FormEvent } from 'react'
import Botao from '../../../shared/ui/Botao'
import Campo from '../../../shared/ui/Campo'
import Mensagem from '../../../shared/ui/Mensagem'
import { salvarOuEnfileirar } from '../model/salvar-sessao'
import { minutosDaSessao, montarSessao } from '../model/execucao'
import type { DadosZonas } from '../model/contador'
import type { Entrada } from '../../../shared/types'
import type { useSessoes } from '../model/usarSessoes'
import type { PlanoGuiado, Rascunho } from '../model/sessao'
export default function Final({
  conta, clientId, diario, setDiario, erroLocal,
  plano,
  entradas,
  zonas,
  segundos,
  inicio,
  salvar,
  aoSalvar,
  aoGuardar,
}: {
  conta: string
  clientId: string
  diario: Rascunho['diario']
  setDiario: (d: Rascunho['diario']) => void
  erroLocal: string | null
  plano: PlanoGuiado
  entradas: Entrada[]
  zonas: DadosZonas
  segundos: number
  inicio: string
  salvar: ReturnType<typeof useSessoes>['adicionar']
  aoSalvar: () => void
  aoGuardar: () => void
}) {
  const { esforco, cansaco, notas } = diario
  const ativa = useRef(true)
  useEffect(() => { ativa.current = true; return () => { ativa.current = false } }, [])
  const setEsforco = (esforco: number) => setDiario({ ...diario, esforco })
  const setCansaco = (cansaco: number) => setDiario({ ...diario, cansaco })
  const setNotas = (notas: string) => setDiario({ ...diario, notas })
  const [estado, setEstado] = useState<'edicao' | 'enviando' | 'aparelho'>('edicao')
  const salvando = estado === 'enviando'
  const [erro, setErro] = useState<string | null>(null)
  const minutos = minutosDaSessao(segundos)
  const acertos = entradas.reduce((t, e) => t + (e.acertos ?? 0), 0)
  const tentativas = entradas.reduce((t, e) => t + (e.tentativas ?? 0), 0)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (salvando) return
    setEstado('enviando')
    setErro(null)
    try {
      const sessao = montarSessao({ clientId, plano, diario, entradas, zonas, segundos, inicio })
      if (await salvarOuEnfileirar(conta, sessao, salvar) === 'aparelho') {
        if (ativa.current) { aoGuardar(); setEstado('aparelho') }
        return
      }
      if (ativa.current) aoSalvar()
    } catch (e) {
      if (ativa.current) { setErro((e as Error).message); setEstado('edicao') }
    }
  }

  if (estado === 'aparelho') return <section className="card">
    <h1>Treino guardado neste aparelho</h1>
    <p>O aplicativo enviará o registro quando houver conexão. Ao concluir o envio, o aviso de pendência desaparecerá.</p>
  </section>

  return (
    <>
      <h1>Treino concluído<span className="ponto">.</span></h1>
      <section className="stats">
        <div className="card stat"><strong>{minutos}</strong><span className="muted">minutos</span></div>
        <div className="card stat"><strong>{entradas.length}</strong><span className="muted">exercícios feitos</span></div>
        <div className="card stat">
          <strong>{tentativas ? `${Math.round((acertos / tentativas) * 100)}%` : '—'}</strong>
          <span className="muted">aproveitamento ({acertos}/{tentativas})</span>
        </div>
      </section>
      <form className="card form form-solto" onSubmit={enviar}>
        <h3>Diário do treino</h3>
        <label>
          Esforço: {esforco}/5
          <input type="range" min={1} max={5} value={esforco} onChange={(e) => setEsforco(Number(e.target.value))} />
        </label>
        <label>
          Cansaço ao terminar: {cansaco}/5 <span className="meta">(1 = inteiro, 5 = exausto)</span>
          <input type="range" min={1} max={5} value={cansaco} onChange={(e) => setCansaco(Number(e.target.value))} />
        </label>
        <Campo rotulo="Notas">
          <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Como se sentiu? Alguma dor?" />
        </Campo>
        {erroLocal && <Mensagem>{erroLocal}</Mensagem>}
        {erro && <Mensagem>{erro}</Mensagem>}
        <Botao className="btn btn-primario" type="submit" ocupado={salvando}>
          {salvando ? 'Salvando' : 'Salvar sessão'}
        </Botao>
      </form>
    </>
  )
}
