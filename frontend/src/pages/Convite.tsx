import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Carregando, ErroCarga } from '../components/Estado'
import SoComServidor from '../components/SoComServidor'
import { apiSocial, usePerfil } from '../social/api'
import { CriarPerfil } from './Ranking'

/** /convite/:codigo — o link que um atleta manda para virar amigo de outro. */
export default function Convite() {
  if (__DEMO__) {
    return (
      <>
        <h1>Convite</h1>
        <SoComServidor recurso="O convite de amigos" porque="Amizades ligam duas contas." />
      </>
    )
  }
  return <ConviteComServidor />
}

function ConviteComServidor() {
  const { codigo = '' } = useParams()
  const navigate = useNavigate()
  const { perfil, carregado } = usePerfil()
  const [convite, setConvite] = useState<{ apelido: string; proprio: boolean; jaAmigos: boolean } | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const [erroAceitar, setErroAceitar] = useState<string | null>(null)

  useEffect(() => {
    apiSocial.convite(codigo).then(setConvite, setErro)
  }, [codigo])

  if (erro) return <><h1>Convite</h1><ErroCarga erro={erro.message.includes('não encontrado') ? new Error('Este convite não existe mais. Peça um link novo.') : erro} /></>
  if (!convite || !carregado) return <Carregando texto="Abrindo o convite" />

  async function aceitar() {
    setErroAceitar(null)
    try {
      await apiSocial.aceitarConvite(codigo)
      navigate('/ranking?escopo=amigos')
    } catch (e) {
      setErroAceitar((e as Error).message)
    }
  }

  return (
    <>
      <h1>Convite</h1>
      <section className="card convite">
        <h2 className="sem-margem texto-literal">{convite.apelido}</h2>
        {convite.proprio ? (
          <p className="muted">Este é o seu próprio convite. Mande o link para os amigos.</p>
        ) : convite.jaAmigos ? (
          <p className="muted">Vocês já são amigos. <Link to="/ranking?escopo=amigos" className="link">Ver o ranking de amigos</Link></p>
        ) : (
          <>
            <p className="muted">quer você no ranking de amigos e nos desafios da semana.</p>
            {perfil ? (
              <button className="btn btn-primario" onClick={aceitar}>Aceitar e virar amigo</button>
            ) : (
              <p className="meta">Para aceitar, crie antes o seu perfil do ranking:</p>
            )}
            {erroAceitar && <p className="erro" role="alert">{erroAceitar}</p>}
          </>
        )}
      </section>
      {!perfil && !convite.proprio && !convite.jaAmigos && <CriarPerfil />}
    </>
  )
}
