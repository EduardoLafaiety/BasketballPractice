// Fotos da Wikimedia Commons, todas com licença livre. As licenças CC BY e CC BY-SA pedem o crédito
// do autor e da licença junto da foto. As fotos foram reduzidas para 520 px de largura, e as do Booker
// e do Trae Young também recortadas; nas CC BY-SA, essas versões seguem a mesma licença.
// Lista também em CREDITOS.md.
import anthonyEdwards from './anthony-edwards.jpg'
import damianLillard from './damian-lillard.jpg'
import devinBooker from './devin-booker.jpg'
import giannisAntetokounmpo from './giannis-antetokounmpo.jpg'
import jaMorant from './ja-morant.jpg'
import jalenBrunson from './jalen-brunson.jpg'
import jamesHarden from './james-harden.jpg'
import jaysonTatum from './jayson-tatum.jpg'
import joelEmbiid from './joel-embiid.jpg'
import kawhiLeonard from './kawhi-leonard.jpg'
import kevinDurant from './kevin-durant.jpg'
import kyrieIrving from './kyrie-irving.jpg'
import lebronJames from './lebron-james.jpg'
import lukaDoncic from './luka-doncic.jpg'
import nikolaJokic from './nikola-jokic.jpg'
import shaiGilgeousAlexander from './shai-gilgeous-alexander.jpg'
import stephenCurry from './stephen-curry.jpg'
import traeYoung from './trae-young.jpg'
import tyreseHaliburton from './tyrese-haliburton.jpg'
import victorWembanyama from './victor-wembanyama.jpg'

export interface FotoJogador {
  src: string
  autor: string
  licenca: string
  /** Página do arquivo na Wikimedia Commons. */
  fonte: string
  /** Time e data em que a foto foi tirada (não necessariamente o time atual). */
  legenda: string
}

const commons = (arquivo: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(arquivo)}`

/** Foto de cada estilo, pelo id que a API usa em /styles. */
export const FOTOS_JOGADORES: Record<string, FotoJogador> = {
  'luka-doncic': { src: lukaDoncic, autor: 'Erik Drost', licenca: 'CC BY 4.0', fonte: commons('Luka_Doncic_(55095317361)_(cropped).jpg'), legenda: 'Lakers, jan/2026' },
  'kyrie-irving': { src: kyrieIrving, autor: 'Erik Drost', licenca: 'CC BY 2.0', fonte: commons('Kyrie_Irving_-_51831772061_01_(cropped).jpg'), legenda: 'Nets, jan/2022' },
  'lebron-james': { src: lebronJames, autor: 'Erik Drost', licenca: 'CC BY 2.0', fonte: commons('LeBron_James_(51959977144)_(cropped2).jpg'), legenda: 'Lakers, mar/2022' },
  'stephen-curry': { src: stephenCurry, autor: 'Keith Allison', licenca: 'CC BY-SA 2.0', fonte: commons('Stephen_Curry_(24511268640)_(cropped).jpg'), legenda: 'Warriors, fev/2016' },
  'shai-gilgeous-alexander': { src: shaiGilgeousAlexander, autor: 'All-Pro Reels', licenca: 'CC BY-SA 2.0', fonte: commons('Shai_Gilgeous-Alexander_(51815871018)_(cropped).jpg'), legenda: 'Thunder, jan/2022' },
  'nikola-jokic': { src: nikolaJokic, autor: 'All-Pro Reels', licenca: 'CC BY-SA 2.0', fonte: commons('Nikola_Jokic_free_throw_(cropped).jpg'), legenda: 'Nuggets, jan/2020' },
  'giannis-antetokounmpo': { src: giannisAntetokounmpo, autor: 'Keith Allison', licenca: 'CC BY-SA 2.0', fonte: commons('Giannis_Antetokounmpo_(24845003687)_(cropped).jpg'), legenda: 'Bucks, jan/2018' },
  'kevin-durant': { src: kevinDurant, autor: 'YES Network', licenca: 'CC BY 3.0', fonte: commons('Kevin_Durant_Nets_March_2022.png'), legenda: 'Nets, mar/2022' },
  'jayson-tatum': { src: jaysonTatum, autor: 'Hameltion', licenca: 'CC BY-SA 4.0', fonte: commons('Celtics_at_Wizards_2024-12-044_(cropped_2).jpg'), legenda: 'Celtics, dez/2024' },
  'anthony-edwards': { src: anthonyEdwards, autor: 'All-Pro Reels', licenca: 'CC BY-SA 2.0', fonte: commons('Anthony_Edwards_Kentavious_Caldwell-Pope_(51734745028)_(cropped)_(cropped).jpg'), legenda: 'Timberwolves, dez/2021' },
  'victor-wembanyama': { src: victorWembanyama, autor: 'Frenchieinportland', licenca: 'CC BY 4.0', fonte: commons('Victor_Wembanyama_San_Antonio_Spurs_2024.jpg'), legenda: 'Spurs, dez/2024' },
  'jalen-brunson': { src: jalenBrunson, autor: 'Erik Drost', licenca: 'CC BY 2.0', fonte: commons('Jalen_Brunson_2023_(cropped).jpg'), legenda: 'Knicks, abr/2023' },
  'james-harden': { src: jamesHarden, autor: 'Erik Drost', licenca: 'CC BY 2.0', fonte: commons('Harden_dribbling_midcourt,_Cavaliers_vs_Nets_on_January_17,_2022_(cropped).jpg'), legenda: 'Nets, jan/2022' },
  'damian-lillard': { src: damianLillard, autor: 'Erik Drost', licenca: 'CC BY 2.0', fonte: commons('Damian_Lillard_(2021)_(cropped).jpg'), legenda: 'Trail Blazers, nov/2021' },
  'ja-morant': { src: jaMorant, autor: 'All-Pro Reels', licenca: 'CC BY-SA 2.0', fonte: commons('Ja_Morant_2021.jpg'), legenda: 'Grizzlies, nov/2021' },
  'tyrese-haliburton': { src: tyreseHaliburton, autor: 'Chensiyuan', licenca: 'CC BY-SA 4.0', fonte: commons('1_tyrese_haliburton_2025_(cropped_2).jpg'), legenda: 'Pacers, mar/2025' },
  'devin-booker': { src: devinBooker, autor: 'Keith Allison', licenca: 'CC BY-SA 2.0', fonte: commons('Devin_Booker_(30362063153)_(cropped).jpg'), legenda: 'Suns, nov/2016' },
  'joel-embiid': { src: joelEmbiid, autor: 'Keith Allison', licenca: 'CC BY-SA 2.0', fonte: commons('Joel_Embiid_2018_(cropped2).jpg'), legenda: '76ers, fev/2018' },
  'kawhi-leonard': { src: kawhiLeonard, autor: 'Chensiyuan', licenca: 'CC BY-SA 4.0', fonte: commons('1_kawhi_leonard_2019_(cropped).jpg'), legenda: 'Raptors, mar/2019' },
  'trae-young': { src: traeYoung, autor: 'Alexander Jonesi', licenca: 'CC BY-SA 2.0', fonte: commons('Trae_Young.jpg'), legenda: 'Hawks, jan/2020' },
}
