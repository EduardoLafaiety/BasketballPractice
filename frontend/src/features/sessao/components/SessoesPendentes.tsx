import { sincronizar } from '../model/sincronizar-sessoes'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api, ApiError, contaLocal, tokenAtual } from '../../../shared/api/backend'
import { useAuth } from '../../autenticacao/model/auth'
import { invalidar } from '../../../shared/data/recursos'
import { descartarRegistrosInvalidos, enfileirar, exportarTreinosLocais, lerLocal, pendentes, registrosComProblema, removerPendente } from '../model/treino-local'
import { rascunhoValido } from '../model/sessao'
import { baixarArquivo } from '../../../shared/lib/arquivo'
import type { FalhaEnvio } from '../model/sincronizar-sessoes'
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
  const [problemas, setProblemas] = useState(0)
  const [fila, setFila] = useState<NovaSessao[]>([])
  const [falhas, setFalhas] = useState<Record<string, FalhaEnvio>>({})
  const falhasAtuais = useRef<Record<string, FalhaEnvio>>({})
  const [enviando, setEnviando] = useState(false)
  const bloqueado = useRef(false)
  const identidade = useRef('')
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    if (!conta) { setQuantidade(0); setRascunho(false); setProblemas(0); return }
    const atual = `${conta}:${token}`
    if (identidade.current !== atual) { bloqueado.current = false; identidade.current = atual; setErro(''); falhasAtuais.current = {}; setFalhas({}); setEnviando(false) }
    let ativa = true
    const atualizar = () => { if (ativa) {
      const itens = pendentes(conta)
      const atuais = Object.fromEntries(Object.entries(falhasAtuais.current).filter(([id, falha]) => itens.some((s) => s.clientId === id && JSON.stringify(s) === JSON.stringify(falha.sessao))))
      falhasAtuais.current = atuais; setFalhas(atuais)
      setFila(itens); setQuantidade(itens.length); setRascunho(rascunhoValido(lerLocal(conta, 'rascunho'))); setProblemas(registrosComProblema(conta).length)
    } }
    const enviar = () => {
      atualizar()
      if (!navigator.onLine || !autenticado || bloqueado.current) return
      setEnviando(true)
      void sincronizar(conta, api.registrarSessao, () => ativa && tokenAtual() === token, (s) => Boolean(falhasAtuais.current[s.clientId!]))
        .then((resultado) => { if (ativa) {
          for (const falha of resultado.falhas) falhasAtuais.current[falha.sessao.clientId!] = falha
          const e = resultado.interrupcao
          bloqueado.current = e instanceof ApiError && [401, 403].includes(e.status)
          setErro(e?.message ?? '')
          if (resultado.enviadas) invalidar('sessoes', 'resumo', 'zonas', 'progresso')
        } })
        .catch((e: Error) => { if (ativa) setErro(e.message) })
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
  if (!quantidade && !problemas && (!rascunho || pathname === '/sessao')) return null
  return <aside className="card pendentes" aria-label="Treinos neste aparelho" aria-busy={enviando}>
    {problemas > 0 && <div>
      <p role="alert">{problemas} registro(s) local(is) precisam de revisão. Os dados foram preservados e não serão enviados automaticamente.</p>
      <Botao onClick={() => { try { baixarArquivo(exportarTreinosLocais(conta!), 'treinos-recuperacao-local.json', 'application/json') } catch { setErro('Não foi possível exportar os dados deste aparelho.') } }}>Exportar dados para recuperação</Botao>
      <Botao disabled={enviando} onClick={() => { if (conta && window.confirm('Descartar somente os registros locais inválidos? Exporte uma cópia antes; essa ação não pode ser desfeita.')) { try { descartarRegistrosInvalidos(conta) } catch { setErro('Não foi possível descartar os registros locais.') } } }}>Descartar registros inválidos</Botao>
      {erro && !quantidade && <p role="alert">{erro}</p>}
    </div>}
    {rascunho && pathname !== '/sessao' && <p><Link className="btn" to="/sessao">Retomar treino em andamento</Link></p>}
    {quantidade > 0 && <div role="status"><p>{quantidade} sessão(ões) salva(s) neste aparelho, aguardando sincronização. Entre nesta conta com conexão para enviar.</p>
    {erro && <p>{erro}</p>}
    <Botao disabled={enviando} onClick={() => { falhasAtuais.current = {}; setFalhas({}); bloqueado.current = false; setTentativa((t) => t + 1) }}>{enviando ? 'Enviando sessões' : 'Sincronizar agora'}</Botao>
    <details><summary>Revisar sessões pendentes</summary><ul className="pendentes-lista">
      {fila.map((s) => <li key={s.clientId}>
        <strong>{new Date(s.data).toLocaleString('pt-BR')} · {s.duracaoMin} min</strong>
        <p>{s.entradas.length} exercícios · {s.notas || 'Sem notas'}</p>
        {s.programa && <p>Programa: {s.programa.id}, dia {s.programa.dia}</p>}
        {falhas[s.clientId!] && <>
          <p role="alert">{falhas[s.clientId!].erro.message}</p>
          <label>Corrigir notas<textarea key={s.notas} disabled={enviando} defaultValue={s.notas} maxLength={2000} onBlur={(e) => { if (conta && e.target.value !== (s.notas ?? '')) { enfileirar(conta, { ...s, notas: e.target.value }); setTentativa((t) => t + 1) } }} /></label>
          <Botao disabled={enviando} onClick={() => { delete falhasAtuais.current[s.clientId!]; setTentativa((t) => t + 1) }}>Tentar esta sessão novamente</Botao>
        </>}
        {s.programa && falhas[s.clientId!]?.erro.status === 409 && <Botao disabled={enviando} onClick={() => {
          if (!conta || !window.confirm('Salvar este treino sem marcar um dia do programa como concluído?')) return
          enfileirar(conta, { ...s, programa: undefined }); bloqueado.current = false; setTentativa((t) => t + 1)
        }}>Salvar treino fora do programa</Botao>}
        <Botao disabled={enviando} onClick={() => { if (conta && window.confirm('Descartar somente esta sessão ainda não sincronizada?')) { removerPendente(conta, s.clientId!); bloqueado.current = false; setTentativa((t) => t + 1) } }}>Descartar esta pendência</Botao>
      </li>)}
    </ul></details></div>}
  </aside>
}
