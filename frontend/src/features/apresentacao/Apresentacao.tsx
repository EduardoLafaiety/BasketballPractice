import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from '../../shared/i18n/links'
import { useIdioma } from '../../shared/i18n/idioma'
import PreferenciasCabecalho from '../../shared/ui/PreferenciasCabecalho'
import Icone from '../../shared/ui/Icone'
import { BolaCouro, LinhasQuadra } from '../../shared/ui/fundoQuadra'
import LogoBola from '../../shared/ui/LogoBola'
import { NomesRolagem } from '../inicio/components/NomesRolagem'
import { corDoJogador } from '../estilos/lib/cor-do-time'
import jogadores from './jogadores.json'
import './apresentacao.css'

const recursos = [
  { numero: '01', icone: 'treinos', titulo: 'Encontre seu próximo treino.', texto: 'Explore exercícios por nível e fundamento. Do primeiro drible ao arremesso, encontre um ponto de partida para o seu jogo.' },
  { numero: '02', icone: 'rotina', titulo: 'Uma rotina que cabe na vida.', texto: 'Organize os dias da semana, distribua os fundamentos e tenha seu treino à mão quando chegar à quadra.' },
  { numero: '03', icone: 'desempenho', titulo: 'Veja sua dedicação ganhar forma.', texto: 'Registre sessões, acompanhe seus arremessos e consulte sua evolução. Cada treino faz parte da sua história.' },
] as const

function PreviaProduto() {
  const [aba, setAba] = useState(0)
  return <div className="lp-produto">
    <div className="lp-produto-topo"><span><LogoBola tamanho={20} /> Basketball Practice</span><span className="lp-selo">Prévia do site</span></div>
    <div className="lp-abas" role="tablist" aria-label="Explore os recursos">
      {['Treinos', 'Rotina', 'Evolução'].map((nome, i) => <button key={nome} id={`lp-aba-${i}`} role="tab" aria-selected={aba === i} aria-controls="lp-painel" tabIndex={aba === i ? 0 : -1} onClick={() => setAba(i)} onKeyDown={e => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const proxima = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setAba(proxima); document.getElementById(`lp-aba-${proxima}`)?.focus() } }}>{nome}</button>)}
    </div>
    <div className="lp-painel" id="lp-painel" role="tabpanel" aria-labelledby={`lp-aba-${aba}`} tabIndex={0}>
      {aba === 0 ? <><div className="lp-preview-linha"><h3>Qual fundamento vai ser hoje?</h3><span>Seu ritmo. Seu nível.</span></div><div className="lp-exercicios">{[['arremesso', 'Arremesso', 'Ajuste a mira.'], ['drible', 'Drible', 'Domine a bola.'], ['defesa', 'Defesa', 'Proteja seu espaço.']].map(([classe, nome, texto]) => <div className={`lp-exercicio ${classe}`} key={nome}><div className="lp-mini-quadra"><LinhasQuadra /><Icone nome="bola" tamanho={38} /></div><span className="lp-selo">Fundamento</span><h4>{nome}</h4><p>{texto}</p></div>)}</div></>
        : aba === 1 ? <><div className="lp-preview-linha"><h3>Uma semana com direção.</h3><span>Exemplo de organização</span></div><div className="lp-semana">{[['Seg', 'Drible'], ['Ter', 'Descanso'], ['Qua', 'Arremesso'], ['Qui', 'Descanso'], ['Sex', 'Defesa']].map(([dia, treino]) => <div key={dia}><strong>{dia}</strong><span>{treino}</span><span className={treino === 'Descanso' ? 'lp-dia-livre' : 'lp-dia-treino'} aria-hidden="true">{treino === 'Descanso' ? '—' : '✓'}</span></div>)}</div><p className="lp-preview-nota">Você escolhe os dias. A rotina acompanha você.</p></>
          : <><div className="lp-preview-linha"><h3>Cada sessão conta.</h3><span>Exemplo de acompanhamento</span></div><div className="lp-grafico" aria-label="Ilustração de sessões de treino ao longo da semana">{[35, 55, 42, 72, 60, 85, 100].map((altura, i) => <div key={i}><span style={{ height: `${altura}%` }} /><small>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}</small></div>)}</div><p className="lp-preview-nota">Histórico, arremessos e conquistas em um só lugar.</p></>}
    </div>
  </div>
}

export default function Apresentacao() {
  const { hash } = useLocation()
  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [hash])
  const idioma = useIdioma()
  useEffect(() => {
    const anterior = document.title
    document.title = idioma === 'en' ? 'Basketball Practice · Your next level' : 'Basketball Practice · Seu próximo nível'
    return () => { document.title = anterior }
  }, [idioma])
  return <div className="lp">
    <a className="lp-pular" href="#lp-conteudo">Pular para o conteúdo</a>
    <header className="lp-header lp-container">
      <Link className="lp-marca" to="/conheca" aria-label="Basketball Practice, início"><LogoBola className="lp-logo-bola" tamanho={36} /><span>Basketball<br />Practice<span className="lp-marca-ponto">.</span></span></Link>
      <nav className="lp-nav" aria-label="Conheça a plataforma"><a href="#recursos">O site</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a></nav>
      <div className="lp-header-acoes"><PreferenciasCabecalho /><Link to="/entrar" className="lp-entrar">Entrar <span aria-hidden="true">↗</span></Link></div>
    </header>
    <main id="lp-conteudo">
      <section className="lp-hero lp-container" aria-labelledby="lp-titulo">
        <div className="lp-hero-copy"><p className="lp-kicker"><span /> Basquete. Constância. Evolução.</p><h1 id="lp-titulo">Seu jogo.<br />Próximo <em>nível.</em></h1><p className="lp-intro">Treine no seu ritmo. Evolua a cada jogada.</p><p className="lp-hero-descricao">Seus exercícios, sua rotina e sua evolução no mesmo lugar. Menos tempo decidindo o que treinar. Mais tempo com a bola na mão.</p><div className="lp-hero-acoes"><a className="lp-botao lp-principal" href="#recursos">Conheça o site <Icone nome="seta" /></a><a className="lp-link" href="#como-funciona">Como funciona <span aria-hidden="true">↓</span></a></div></div>
        <div className="lp-hero-arte" aria-hidden="true"><div className="lp-arte-quadra"><LinhasQuadra /></div><span className="lp-arte-numero">01</span><div className="lp-hero-bola"><BolaCouro /></div><span className="lp-pixel">Bora pra<br />quadra.</span><span className="lp-arte-legenda">O próximo passo é seu.</span><span className="lp-estrela">✳</span></div>
      </section>
      <div className="lp-faixa" aria-label="Fundamentos de basquete"><div className="lp-container"><span>Arremesso</span><i>✳</i><span>Drible</span><i>✳</i><span>Passe</span><i>✳</i><span>Finalização</span><i>✳</i><span>Defesa</span></div></div>
      <section className="lp-secao lp-container" id="recursos" aria-labelledby="lp-recursos-titulo"><div className="lp-secao-cabecalho"><div><p className="lp-kicker">Seu treino, com direção</p><h2 id="lp-recursos-titulo">Um lugar para<br />construir seu jogo.</h2></div><p>Você traz a vontade de jogar.<br />O Basketball Practice ajuda a organizar o caminho.</p></div><PreviaProduto /><div className="lp-recursos">{recursos.map(r => <article key={r.numero}><div className="lp-recurso-topo"><Icone nome={r.icone} tamanho={27} /><span>{r.numero}</span></div><h3>{r.titulo}</h3><p>{r.texto}</p></article>)}</div></section>
      <section className="lp-como" id="como-funciona" aria-labelledby="lp-como-titulo"><div className="lp-container lp-passos"><div className="lp-passos-cabecalho"><p className="lp-kicker">Do plano à prática</p><h2 id="lp-como-titulo">Seu próximo treino<br />começa simples.</h2><p>Sem complicar o que você mais gosta de fazer.</p></div><ol>{[['Encontre seu ponto de partida', 'Escolha seu nível e o fundamento que quer desenvolver.'], ['Monte sua semana', 'Distribua os exercícios de acordo com seus dias de treino.'], ['Entre em quadra. E volte.', 'Registre suas sessões e acompanhe o que você vem construindo.']].map(([titulo, texto], i) => <li key={titulo}><div className="lp-passo-marca"><span>0{i + 1}</span><Icone nome={(['treinos', 'rotina', 'desempenho'] as const)[i]} tamanho={26} /></div><div><h3>{titulo}</h3><p>{texto}</p></div></li>)}</ol><div className="lp-passos-acao"><p>A bola está com você</p><a className="lp-botao lp-principal" href="#planos">Bora pra quadra <Icone nome="seta" /></a></div></div></section>
      <section className="lp-jogue" aria-labelledby="lp-jogue-titulo"><NomesRolagem nomes={jogadores.map(j => ({ nome: j.nome, cor: corDoJogador(j.id) }))} titulo={<h2 id="lp-jogue-titulo">Jogue como</h2>} /><ul className="lp-nomes-acessiveis">{jogadores.map(j => <li key={j.id}>{j.nome}</li>)}</ul></section>
      <section className="lp-secao lp-container lp-planos" id="planos" aria-labelledby="lp-planos-titulo"><p className="lp-kicker">Invista no seu jogo</p><h2 id="lp-planos-titulo">Pequeno no preço.<br />Grande na sua rotina.</h2><p>Todos os recursos. Escolha o ritmo da sua assinatura.</p><div className="lp-planos-grid"><article className="lp-plano"><p className="lp-plano-nome">Plano mensal</p><h3><span>R$</span> 15<span>,00</span></h3><p>por mês</p><p className="lp-plano-descricao">Um mês de cada vez.<br />Seu próximo passo começa aqui.</p><ul><li>Biblioteca de exercícios e demonstrações</li><li>Rotina semanal e programas de treino</li><li>Histórico, evolução e conquistas</li><li>Acesso na web e no celular</li></ul><Link className="lp-botao lp-secundario" to="/assinatura?plano=mensal">Escolher mensal <Icone nome="seta" /></Link></article><article className="lp-plano lp-plano-anual"><span className="lp-economia">Economize R$ 30 no ano</span><p className="lp-plano-nome">Plano anual</p><h3><span>R$</span> 150<span>,00</span></h3><p>por ano · pagamento anual</p><p className="lp-plano-descricao">Equivale a R$ 12,50 por mês.<br />Mais tempo para construir seu jogo.</p><ul><li>Biblioteca de exercícios e demonstrações</li><li>Rotina semanal e programas de treino</li><li>Histórico, evolução e conquistas</li><li>Acesso na web e no celular</li></ul><Link className="lp-botao lp-principal" to="/assinatura?plano=anual">Escolher anual <Icone nome="seta" /></Link></article></div><p className="lp-planos-nota">A economia considera 12 mensalidades de R$ 15,00. Os dois planos incluem os mesmos recursos.</p></section>
      <section className="lp-container lp-faq lp-secao" aria-labelledby="lp-faq-titulo"><div><p className="lp-kicker">Antes de entrar em quadra</p><h2 id="lp-faq-titulo">Ficou alguma dúvida?</h2><Link className="lp-link" to="/contato">Fale com a gente <span aria-hidden="true">↗</span></Link></div><div>{[['Preciso saber jogar para começar?', 'Não. A biblioteca tem exercícios organizados por nível, incluindo fundamentos para iniciantes. Você escolhe seu ponto de partida e adapta a rotina à sua realidade.'], ['Funciona no meu celular?', 'Sim. Você acessa pelo navegador do celular, tablet ou computador, com a mesma conta. Não precisa instalar para começar.'], ['O que muda entre o mensal e o anual?', 'Os recursos são os mesmos. O mensal custa R$ 15,00 por mês. O anual custa R$ 150,00 em um pagamento por ano, equivalente a R$ 12,50 por mês.'], ['O site substitui um treinador?', 'Não. O Basketball Practice ajuda a estudar fundamentos e organizar treinos. As demonstrações são educativas; um profissional pode avaliar e orientar sua execução individual.']].sort(([a], [b]) => a.length - b.length).map(([pergunta, resposta]) => <details key={pergunta}><summary>{pergunta}<span aria-hidden="true">+</span></summary><p>{resposta}</p></details>)}</div></section>
    </main>
    <footer className="lp-container lp-footer"><div className="lp-footer-topo"><Link to="/conheca" className="lp-marca"><LogoBola className="lp-logo-bola" tamanho={36} /><span>Basketball Practice<span className="lp-marca-ponto">.</span></span></Link><a href="https://www.instagram.com/basketballpratice/" target="_blank" rel="noopener noreferrer" translate="no">@basketballpratice ↗</a></div><div className="lp-footer-base"><span>© {new Date().getFullYear()} Basketball Practice</span><nav aria-label="Informações legais"><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link><Link to="/contato">Contato</Link></nav></div></footer>
  </div>
}
