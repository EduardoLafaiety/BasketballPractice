import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, ApiError, contaLocal, tokenAtual } from '../../../shared/api/backend'
import { useAuth } from '../../autenticacao/model/auth'
import { invalidar } from '../../../shared/data/recursos'
import { enfileirar, lerLocal, pendentes, removerPendente, sincronizar } from '../model/treino-local'
import type { NovaSessao } from '../../../shared/types'
import Botao from '../../../shared/ui/Botao'

export default function SessoesPendentes() {
  const { usuario } = useAuth()
  const conta = usuario ? String(usuario.id) : contaLocal()
  const autenticado = usuario !== null
  const token = tokenAtual()
  const { pathname } = useLocation()
  const [rascunho, setRascunho] = useState(false)
  const [quantidade, setQuantidade] = useState(0)
  const [fila, setFila] = useState<NovaSessao[]>([])
  const [statusErro, setStatusErro] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const bloqueado = useRef(false)
  const identidade = useRef('')
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    if (!conta) { setQuantidade(0); setRascunho(false); return }
    const atual = `${conta}:${token}`
    if (identidade.current !== atual) { bloqueado.current = false; identidade.current = atual; setErro(''); setStatusErro(0); setEnviando(false) }
    let ativa = true
    const atualizar = () => { if (ativa) { const itens = pendentes(conta); setFila(itens); setQuantidade(itens.length); setRascunho(lerLocal(conta, 'rascunho') !== null) } }
    const enviar = () => {
      atualizar()
      if (!navigator.onLine || !autenticado || bloqueado.current) return
      setEnviando(true)
      void sincronizar(conta, api.registrarSessao, () => ativa && tokenAtual() === token)
        .then(() => { if (ativa) { setErro(''); setStatusErro(0); invalidar('sessoes', 'resumo', 'zonas', 'progresso') } })
        .catch((e: Error) => { if (ativa) { const status = e instanceof ApiError ? e.status : 0; setStatusErro(status); bloqueado.current = status >= 400 && status < 500; setErro(e.message) } })
        .finally(() => { if (ativa) setEnviando(false); atualizar() })
    }
    atualizar()
    if (pendentes(conta).length) enviar()
    window.addEventListener('treino-local', atualizar)
    window.addEventListener('online', enviar)
    window.addEventListener('storage', atualizar)
    // Falhas transitórias também se recuperam sem exigir uma mudança de conexão.
    const timer = window.setInterval(() => { if (pendentes(conta).length) enviar() }, 30_000)
    return () => { ativa = false; window.clearInterval(timer); window.removeEventListener('online', enviar); window.removeEventListener('treino-local', atualizar); window.removeEventListener('storage', atualizar) }
  }, [conta, autenticado, token, tentativa])
  if (!quantidade && (!rascunho || pathname === '/sessao')) return null
  return <aside className="card pendentes" aria-label="Treinos neste aparelho" aria-busy={enviando}>
    {rascunho && pathname !== '/sessao' && <p><Link className="btn" to="/sessao">Retomar treino em andamento</Link></p>}
    {quantidade > 0 && <div role="status"><p>{quantidade} sessão(ões) salva(s) neste aparelho, aguardando sincronização. Entre nesta conta com conexão para enviar.</p>
    {erro && <p>{erro}</p>}
    <Botao disabled={enviando} onClick={() => { bloqueado.current = false; setTentativa((t) => t + 1) }}>{enviando ? 'Enviando sessões' : 'Sincronizar agora'}</Botao>
    <details><summary>Revisar sessões pendentes</summary><ul className="pendentes-lista">
      {fila.map((s) => <li key={s.clientId}>
        <strong>{new Date(s.data).toLocaleString('pt-BR')} · {s.duracaoMin} min</strong>
        <p>{s.entradas.length} exercícios · {s.notas || 'Sem notas'}</p>
        {s.programa && <p>Programa: {s.programa.id}, dia {s.programa.dia}</p>}
        {statusErro >= 400 && statusErro < 500 && <label>Corrigir notas<textarea defaultValue={s.notas} maxLength={2000} onBlur={(e) => { if (conta) enfileirar(conta, { ...s, notas: e.target.value }) }} /></label>}
        {s.programa && statusErro === 409 && <Botao disabled={enviando} onClick={() => {
          if (!conta || !window.confirm('Salvar este treino sem marcar um dia do programa como concluído?')) return
          enfileirar(conta, { ...s, programa: undefined }); bloqueado.current = false; setTentativa((t) => t + 1)
        }}>Salvar treino fora do programa</Botao>}
        <Botao disabled={enviando} onClick={() => { if (conta && window.confirm('Descartar somente esta sessão ainda não sincronizada?')) { removerPendente(conta, s.clientId!); bloqueado.current = false; setTentativa((t) => t + 1) } }}>Descartar esta pendência</Botao>
      </li>)}
    </ul></details></div>}
  </aside>
}
