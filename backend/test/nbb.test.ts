import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { attachTeams, parseNbbLeaders, parseNbbNews, parseNbbStandings, type NbbTeam } from '../src/lib/nbb.js'

// Linha no formato da página da LNB: colunas em data-sort-value, com as de pontos escondidas no meio.
const linha = (pos: number, sigla: string, nome: string, logo: string, [pct, jogos, vit, der, pro, con, saldo, pon]: number[]) => `
<tr class="">
  <td class="open_content headcol"><div class="number"><strong>${pos}</strong></div>
    <div class="pos"><!-- <img src="x.png"> --></div>
    <div class="team"><strong class="team_first">${sigla}</strong> </div>
    <div class="logo" style="max-height:32px;"><img style="max-height:32px;" src="${logo}" alt="${nome}" > </div></td>
  <td class="wins_avg" data-sort-value="${pct}">${pct}</td>
  <td class="points_avg" style="display:none;" data-sort-value="${jogos}">${jogos}</td>
  <td class="points_avg" style="display:none;" data-sort-value="${Math.round(pct)}">${Math.round(pct)}</td>
  <td data-sort-value="${jogos}">${jogos}</td><td data-sort-value="${vit}">${vit}</td><td data-sort-value="${der}">${der}</td>
  <td class="hide-for-small-only" data-sort-value="3">3-0</td><td class="hide-for-small-only" data-sort-value="4">4-0</td>
  <td data-sort-value="${pro}">${pro}</td><td data-sort-value="${con}">${con}</td><td data-sort-value="${saldo}">${saldo}</td>
  <td style="font-size:0"><div class="ball_winner"></div></td>
  <td class="wins_avg" data-sort-value="${pon}">${pon}</td>
</tr>`

const pagina = (linhas: string) => `<select><option value="/nbb/2026-2027" selected>NBB 2026/2027</option><option value="/nbb/2025-2026" >NBB 2025/2026</option></select>
<table class="table_ap table-wrapper wins_avg"><thead><tr><th>EQUIPES</th></tr></thead><tbody>${linhas}</tbody></table>`

const oito = Array.from({ length: 8 }, (_, i) => linha(i + 3, `T${i}`, `Time ${i}`, 'https://lnb.com.br/x.png', [50, 10, 5, 5, 700, 700, 0, 15])).join('')

describe('Classificação do NBB da LNB', () => {
  it('lê posição, time, escudo e números, na ordem da classificação', () => {
    const html = pagina(
      linha(2, 'MOG', 'Mogi Basquete', 'http://lnb.com.br/uploads/mogi-150x150.png', [85.7, 7, 6, 1, 582, 517, 65, 13]) +
        linha(1, 'MIN', 'Minas Storm', 'https://lnb.com.br/uploads/Minas-150.png', [100, 7, 7, 0, 604, 460, 144, 14]) +
        oito,
    )
    const { season, teams } = parseNbbStandings(html)
    assert.equal(season, '2026/2027')
    assert.deepEqual(teams.slice(0, 2).map((t) => t.abbreviation), ['MIN', 'MOG'])
    assert.deepEqual(teams[0], {
      position: 1,
      abbreviation: 'MIN',
      name: 'Minas Storm',
      logo: 'https://lnb.com.br/uploads/Minas-150.png',
      games: 7,
      wins: 7,
      losses: 0,
      winPct: 1,
      pointsFor: 604,
      pointsAgainst: 460,
      pointsDiff: 144,
      points: 14,
    })
    assert.equal(teams[1].logo, 'https://lnb.com.br/uploads/mogi-150x150.png', 'escudo sempre em https')
    assert.equal(teams[1].winPct, 0.857)
  })

  it('ignora linha incompleta e acusa quando a página mudou e quase nada foi reconhecido', () => {
    assert.equal(parseNbbStandings(pagina(oito + '<tr class=""><td>sem dados</td></tr>')).teams.length, 8)
    assert.throws(() => parseNbbStandings('<html>página diferente</html>'), /mudou/)
    assert.throws(() => parseNbbStandings(pagina(linha(1, 'MIN', 'Minas', 'https://x/y.png', [100, 7, 7, 0, 1, 1, 0, 14]))), /mudou/)
  })
})

// Tabela de líderes da LNB: posição, jogador (com link), equipe (com link), jogos, minutos e a média da categoria.
const linhaLider = (pos: number, jogador: string, equipe: string, jogos: number, valor: number) => `
<tr class="row-item-hidden">
  <td class="headcol-2 no_sorter">${pos}</td>
  <!-- SE FOR PESQUISA DE EQUIPE ADICIONAR A CLASSE HIDE -->
  <td class="headcol no_sorter"><a href="https://lnb.com.br/atletas/x/">${jogador}</a></td>
  <td><a href="https://lnb.com.br/equipes/y/">${equipe}</a></td>
  <td data-sort-value="${jogos}"> ${jogos} </td><td data-sort-value="30.10" > 30.10 </td><td data-sort-value="${valor}"> ${valor} </td>
</tr>`

const paginaLideres = (linhas: string) => `<table id="stats-table" class="tablesorter"><thead><tr><th>Pos.</th></tr></thead><tbody>${linhas}</tbody></table>`

describe('Líderes do NBB da LNB', () => {
  it('lê jogador, equipe, jogos e média, ordenados pela posição e limitados ao pedido', () => {
    const html = paginaLideres(
      linhaLider(2, 'Harris #1', 'Bauru Basket', 7, 21.71) + linhaLider(1, 'Dupree #11', 'Basquete Cearense', 6, 23.33) + linhaLider(3, 'Bridgewater #2', 'Pinheiros', 6, 20.67),
    )
    assert.deepEqual(parseNbbLeaders(html, 2), [
      { position: 1, name: 'Dupree #11', team: 'Basquete Cearense', games: 6, value: 23.33 },
      { position: 2, name: 'Harris #1', team: 'Bauru Basket', games: 7, value: 21.71 },
    ])
  })

  it('ignora linha incompleta e acusa quando a tabela some', () => {
    assert.equal(parseNbbLeaders(paginaLideres(linhaLider(1, 'A #1', 'Pinheiros', 5, 10) + '<tr><td>sem dados</td></tr>')).length, 1)
    assert.throws(() => parseNbbLeaders('<html>outra página</html>'), /mudou/)
  })

  it('liga o time do jogador ao da classificação pelo nome, sem ligar acento nem caixa; sem correspondência fica vazio', () => {
    const time = (name: string, abbreviation: string) => ({ name, abbreviation, logo: `https://lnb.com.br/${abbreviation}.png` }) as NbbTeam
    const [a, b] = attachTeams(
      [
        { position: 1, name: 'A #1', team: 'SÃO JOSÉ Basketball', games: 5, value: 10 },
        { position: 2, name: 'B #2', team: 'Time Novo', games: 5, value: 9 },
      ],
      [time('São José Basketball', 'SJO')],
    )
    assert.deepEqual([a.teamAbbreviation, a.teamLogo], ['SJO', 'https://lnb.com.br/SJO.png'])
    assert.deepEqual([b.teamAbbreviation, b.teamLogo], ['', ''])
  })
})

const cartao = (url: string, titulo: string, resumo: string, data: string, img = 'https://lnb.com.br/wp-content/uploads/2026/11/foto-400x320.jpg') => `
<div class="noticias_jogadores"> <a href="${url}" title=""><div class="noticias_jogadores_img"><img src="${img}"></div></a>
 <div class="desc_noticias_jogadores"><div class="cat_nbb"><a href="${url}"><strong>NBB Caixa</strong></a></div>
 <a href="${url}"><div class="titulo_noticias_jogadores"><strong><b>${titulo}</b></strong></div></a>
 <a href="${url}"><div class="conteudo_noticias_jogadores pulse animated"> ${resumo} </div></a>
 <a href="${url}"><div class="date_cat"> ${data} </div></a></div></div>`

describe('Notícias do NBB da LNB', () => {
  it('lê link, título, resumo, foto e dia de cada notícia, sem repetir e com as entidades resolvidas', () => {
    const html =
      '<section>' +
      cartao('https://lnb.com.br/noticias/a/', 'Corinthians 79 x 91 Pinheiros', 'Pinheiros &#8211; 37 pontos &amp; vitória', '12/11/2026') +
      cartao('https://lnb.com.br/noticias/a/', 'Corinthians 79 x 91 Pinheiros', 'repetida', '12/11/2026') +
      cartao('https://lnb.com.br/noticias/b/', 'Minas segue invicta', 'Sétima vitória', '09/11/2026', 'http://lnb.com.br/x.jpg') +
      '</section>'
    assert.deepEqual(parseNbbNews(html), [
      { url: 'https://lnb.com.br/noticias/a/', title: 'Corinthians 79 x 91 Pinheiros', summary: 'Pinheiros – 37 pontos & vitória', image: 'https://lnb.com.br/wp-content/uploads/2026/11/foto-400x320.jpg', date: '2026-11-12' },
      { url: 'https://lnb.com.br/noticias/b/', title: 'Minas segue invicta', summary: 'Sétima vitória', image: 'https://lnb.com.br/x.jpg', date: '2026-11-09' },
    ])
  })

  it('deixa de fora cartão sem título, sem data ou sem link da LNB; página sem cartões dá lista vazia', () => {
    const semData = cartao('https://lnb.com.br/noticias/c/', 'Sem data', 'x', '').replace('date_cat', 'outra')
    const fora = cartao('https://outro.example/noticia/', 'De fora', 'x', '01/01/2026')
    assert.deepEqual(parseNbbNews(semData + fora), [])
    assert.deepEqual(parseNbbNews('<html></html>'), [])
  })
})
