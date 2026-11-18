import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, contaLocal, tokenAtual } from '../api'
import { useAuth } from '../auth'
import { invalidar } from '../store'
import { lerLocal, pendentes, sincronizar } from '../lib/treino-local'

export default function SessoesPendentes() {
  const { usuario } = useAuth()
  const conta = usuario ? String(usuario.id) : contaLocal()
  const autenticado = usuario !== null
  const token = tokenAtual()
  const { pathname } = useLocation()
  const [rascunho, setRascunho] = useState(false)
  const [quantidade, setQuantidade] = useState(0)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    if (!conta) { setQuantidade(0); setRascunho(false); return }
    let ativa = true
    const atualizar = () => { if (ativa) { setQuantidade(pendentes(conta).length); setRascunho(lerLocal(conta, 'rascunho') !== null) } }
    const enviar = () => {
      atualizar()
      if (!navigator.onLine || !autenticado) return
      void sincronizar(conta, api.registrarSessao, () => ativa && tokenAtual() === token)
        .then(() => { if (ativa) { setErro(''); invalidar('sessoes', 'resumo', 'zonas', 'progresso') } })
        .catch((e: Error) => { if (ativa) setErro(e.message) })
        .finally(atualizar)
    }
    atualizar()
    if (pendentes(conta).length) enviar()
    window.addEventListener('treino-local', atualizar)
    window.addEventListener('online', enviar)
    // Falhas transitórias também se recuperam sem exigir uma mudança de conexão.
    const timer = window.setInterval(() => { if (pendentes(conta).length) enviar() }, 30_000)
    return () => { ativa = false; window.clearInterval(timer); window.removeEventListener('online', enviar); window.removeEventListener('treino-local', atualizar) }
  }, [conta, autenticado, token, tentativa])
  if (!quantidade && (!rascunho || pathname === '/sessao')) return null
  return <aside className="card pendentes" aria-label="Treinos neste aparelho">
    {rascunho && pathname !== '/sessao' && <p><Link className="btn" to="/sessao">Retomar treino em andamento</Link></p>}
    {quantidade > 0 && <div role="status"><p>{quantidade} sessão(ões) salva(s) neste aparelho, aguardando sincronização. Entre nesta conta com conexão para enviar.</p>
    {erro && <p>{erro}</p>}
    <button className="btn" onClick={() => setTentativa((t) => t + 1)}>Sincronizar agora</button></div>}
  </aside>
}
