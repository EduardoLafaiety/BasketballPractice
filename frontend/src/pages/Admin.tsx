import { useCallback, useEffect, useState } from 'react'
import { api, type UsuarioAdmin } from '../api'
import { useAuth } from '../auth'
import AdminNoticias from '../components/AdminNoticias'
import { Carregando, ErroCarga } from '../components/Estado'
import { formatarData } from '../store'

export default function Admin() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<number | null>(null)

  const carregar = useCallback(() => {
    setErro(null)
    api.usuariosAdmin().then(setUsuarios).catch(setErro)
  }, [])
  useEffect(carregar, [carregar])

  async function agir(u: UsuarioAdmin, acao: () => Promise<void>) {
    setErroAcao(null)
    setOcupado(u.id)
    try {
      await acao()
    } catch (e) {
      setErroAcao((e as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  const alternarAdmin = (u: UsuarioAdmin) =>
    agir(u, async () => {
      const atualizado = await api.definirAdmin(u.id, !u.isAdmin)
      setUsuarios((lista) => lista?.map((x) => (x.id === u.id ? atualizado : x)) ?? null)
    })

  const excluir = (u: UsuarioAdmin) => {
    if (!window.confirm(`Excluir a conta de ${u.name} (${u.email})? Todos os treinos e sessões dela serão apagados.`)) return
    agir(u, async () => {
      await api.excluirUsuario(u.id)
      setUsuarios((lista) => lista?.filter((x) => x.id !== u.id) ?? null)
    })
  }

  const admins = usuarios?.filter((u) => u.isAdmin).length ?? 0

  return (
    <>
      <h1>Administração</h1>
      <p className="meta">
        {usuarios ? `${usuarios.length} contas · ${admins} ${admins === 1 ? 'admin' : 'admins'}` : 'Contas cadastradas no app.'}
      </p>
      {erroAcao && <p className="erro aviso" role="alert">{erroAcao}</p>}

      {!usuarios ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto="Carregando contas…" />
      ) : (
        <ul className="metas admin-usuarios">
          {usuarios.map((u) => {
            const eu = u.id === usuario?.id
            return (
              <li key={u.id} className="card admin-usuario">
                <div className="admin-info">
                  <strong>
                    {u.name}
                    {u.isAdmin && <span className="tag admin-tag">admin</span>}
                    {eu && <span className="meta"> (você)</span>}
                  </strong>
                  <span className="meta">{u.email}</span>
                  <span className="meta">
                    Desde {formatarData(u.createdAt)} · {u.workouts} treinos · {u.sessions} sessões
                    {u.lastSessionAt && ` · última em ${formatarData(u.lastSessionAt)}`}
                  </span>
                </div>
                {!eu && (
                  <div className="acoes">
                    <button className="btn" disabled={ocupado === u.id} onClick={() => alternarAdmin(u)}>
                      {u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                    </button>
                    <button className="btn btn-perigo" disabled={ocupado === u.id} onClick={() => excluir(u)}>
                      Excluir
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <AdminNoticias />
    </>
  )
}
