import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseNbbStandings } from '../src/lib/nbb.js'

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
