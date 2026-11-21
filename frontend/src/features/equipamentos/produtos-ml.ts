// Os links de afiliado do Mercado Livre, gerados no Gerador de links do Programa de Afiliados (conferidos em 21/11/2026).
// Cada link leva ao perfil social do afiliado, com o produto recomendado em destaque (é assim que o programa funciona).
// Não editar nem encurtar os links (os termos do programa proíbem). Só entra na prateleira a bola que tem produto de
// loja brasileira no Mercado Livre; time ou modelo sem link não aparece. Para incluir uma bola: procurar o anúncio,
// gerar o link (formato "Links completos") no gerador e acrescentar aqui.

const PERFIL = 'https://www.mercadolivre.com.br/social/ddbfaecgh77608?matt_word=ddbfaecgh77608&matt_tool=85239093&forceInApp=true&ref='

export interface ProdutoTime {
  /** Link de afiliado do produto. */
  link: string
  /** A linha da Wilson que o Mercado Livre vende para esse time. */
  linha: 'Team Tribute' | 'Team Alliance'
}

/** Bolas de time (chave: sigla). */
export const PRODUTOS_TIMES: Record<string, ProdutoTime> = {
  BOS: { link: PERFIL + 'BLnH25h%2BJuJXpj2ziWD%2Fh81nyNsKD%2FU0QMZgEPYJXCpOxXyroSvOnIG5nWxtY%2Fm%2B%2BfRb4XdnUVVktagyaRq%2F%2FEfn7Xkxn1GW2LFbQEsUV%2BX8uHhF3fN1xfZ4y6%2Fq4WIkn9jfnmjkcWyFc3LWE0yvp%2BZd66ba0P%2FyiU0%2BLf9hMlewoS7w7smscH4k3FG%2BUyx06co9eRVokOYsMJvf0jkabyuLJktE6TwxGIj2f53VfDotXba8qbsZ0PARrgNzydaDsjYH%2Fw%3D%3D', linha: 'Team Tribute' },
  CHI: { link: PERFIL + 'BIUJNjmzihJA2JhHF6OG2XosDI9mz21zwc26jFVPZ5nhdFsHSQmmQd3xKmscG6Jz3JeSU4RPPHZKQNjvLIoQoW4WiKWIanY8QnwtdsDTNTYWxPqsXrdYQOKb7M16QwrDQY5UnK0XWz1PsmPn7KK1IjZ8CWqiCnMVQovztQm72CgrtENmDDCv6DTvF2L%2FoPVekUWuckAgArNCZmHt09BaYpWuaG78vLksfaFqbt52u4yRzrHRDZlAcHu6B%2F3PrZAKOVmNLQ%3D%3D', linha: 'Team Tribute' },
  GSW: { link: PERFIL + 'BGP5F0fpqtK6ZkcD6O5Wv63sX7gQFFk9mSS5woR38AqFW49vznOb4AAgVmV4blmJr%2BIRbtHXttmFr%2F3xuFBJXFrPSmeB7pw5V24WxrSrlq2NwTgiVjBY9UJXm5wI%2BXUta27Gptcj%2Br1lnk7800nV1XbJZnhp1GO3yDlsEgt1j5%2BeIMaC4HcBz6TVFfcvb3xO9tobUq2%2FA8x2TxTDEUqYXoDXvbHs%2FnIKETsZ0e6ekFT3cg5M1Md%2FZDQXjuBE5NSjjK8Nvw%3D%3D', linha: 'Team Tribute' },
  HOU: { link: PERFIL + 'BBq0tEPThW1PvyS7f4CV8RiFPc%2F%2BvaDrT%2Bo5EYTQKbifLly7MWYPLGfI1c9WYIltkK%2Fz2UwBzeixdmD%2BEJnYKgM8Cl5nNN5jvEHKgXbsvuOpTjlPpyJTokSNGCpch%2BeEyHNHLGv5tE2VfhmK0cpdAx9Zyt%2BoZJPE8H40R3NfxxyTMTEmlVItoXezx%2BM95kULkNcWgbyYdN0mgDokJ%2Fba1RvBAIvhv4HV9CT8KAJoX3l2sMfAI79RqC1yJdhYyCUWbKITjA%3D%3D', linha: 'Team Tribute' },
  LAC: { link: PERFIL + 'BKd8XqSf4niP8iXTYaqI32IWaaWZ4yfIZkAyGPXLN%2Fv%2BCjorN5aor%2FlEZwjU8WebIaskbqqoI6D%2BJkE8mTL2OIy6Hbbk2zhvut988Il8QI867%2B2Z%2Bp5xadWSMf5oyoNTxY2nqIi1YTP4JWZXsQ9bFTqUz42nTddEywOVy885vFi4DNOaSz3KZqY8jejK9KmIHZZBg3rd%2BywjmEkbs4e%2Fwnba5Ww1sNTUbVE%2BsrV6G7Z4dEz8L5ksWOju9m2XBrq3kc%2BtRQ%3D%3D', linha: 'Team Tribute' },
  LAL: { link: PERFIL + 'BEkrhGuCVzaZoMk4YBGF0kTKJFL52ypWwuPulUEYPqOPamQQ1Rmvn%2BF3PoyrjX5WgjR%2BxWW41iK0C9eaD1i%2Fl%2B7KrgAx0BcXIqbjLVpOcFCu048Fx%2FO98gieB%2BJtAkALUBIKOLAD%2FVrH2Iz28BFCt%2FZHP5EnVdEMft%2Bsp7C0pBUFUqAxBXl34RoPMZES0f%2BZfculAzbeYxLfVVeUf7U%2FzYyhWkBr2NFgWgeINnqCjUFijh9xcZzuFoRHkXv1WlsIi2w%2BZw%3D%3D', linha: 'Team Tribute' },
  MIA: { link: PERFIL + 'BG8L4mpy7Olhry%2B8fnHRegVk0anxFyUIyanx%2FCWeG1vnCY5bb13dIr%2FIGaSs1e6h6ju2n7lqwrEP04x3gFXx8R38D8oEAdL%2B19kgVpcHs2onAJSdtghgqaWxf3%2FEkpjnllnSqRVgtQv3t9BhO1k7LkPadv2TQlmau7uukgqq12WWQxhbDFqv%2FQ8Y3fmCOdAVIxr6TqjV9AmWU6SA7SoTaL9ftW4aq4D34sjq8WkMYNpxT1xER504R%2BAiphJo4al0N2i4FA%3D%3D', linha: 'Team Tribute' },
  PHI: { link: PERFIL + 'BPtNEd1RufohYq7%2BTZZLWKpcO79hF2HQjbEN30%2BsZsgF7XsHuOZKPw1vGiZKEL192GMp5IlbJSEgm0MGSdYn3%2BqRXzsyKranrzGITfeiVTUlKROqvF9ENsBMr7sC9R4LOfB7A7rVgDdNa3ct73MppB6XcxEsAUYcHmth7YSqXLaE%2Ff%2FGG%2Bq2iTJ%2FO53SBwJMclM81DcT1kiQcxnQ5yqTytaCRTM1DZEerW95zVpVQyVwnoDqqJKggX3rbG%2FtHS%2BKWaWn8g109joZXFZ4', linha: 'Team Tribute' },
  MIL: { link: PERFIL + 'BMpUyiWGlt8xce6UnXovxtzRqZZoR82D%2F9TH7Ij0nd6tPvGNUWfW7%2BYveqQOO9gJ1q%2BSkkTpT6od03jBU2Kt77vKLsyQhPhHOnpZe7zZHa0iR3yIlniZMlW9qkQR75KRkpkyCvAMAewLhfYsBvi51T0SGb6i4fqROM4zSNn5hDgCVdxKxC3h%2FW6IHr6iLV0hFKQWshIiG2ZuyHAKMnhfEffpAxX0ICjxm3zkG1HsaAEk1Z6JEdkXZ6J1oZVPCbYRnADlcNLCPW%2BoW%2FPc', linha: 'Team Alliance' },
}

/** Bolas de marca (chave: id em MARCAS). */
export const LINKS_MARCAS: Record<string, string> = {
  'wilson-evolution': PERFIL + 'BITmdDmzBW9DacuqIuMavCK2v2JiZ6Z%2B03re2rkPJRTLjLzj6ZEjRL30Cht3TVGtn8dsZor8KgyU7utM7XAa%2FhpTtMxv8bWZvxKqK0SI3c5sOxrkH9KUdtPp7Al9yuYidbWZEXn5w0OjrwnytfZT%2BSKFqQIV1CAjlqIqV0%2F2bcZjttXiqRjrUOl40P%2F0FOoN3%2BOnzCbLYw1C4yChgMuA3smEtqV2AoorLUjGFd7b1cFwhgo%2Bpq49vQFxIdPy1%2B3uTpdFqXf3VzyFrKd%2F',
  'wilson-authentic': PERFIL + 'BHt90T8Ctd1WJ6SX3%2BGvB3lBmye%2BOwiWSNrAGzzm4p5jCRF98ytQzlxGvLRN9miedT%2BKXCy9jKsuQrBTf5vpJuvkl6tJee4NrSKEbQIED0Kokhr%2BsZjxlMWDfEJ1d1o%2BhM5tfR1TWl%2FqFk0Sk4PPjOVuXIgntC%2BzQdRXO2xY45vkl17qn7orYpqVrYC3mz%2FQ3URmOWZUZMCxTSqlUdvZ%2Fyk2c3Cz5nu3zE2nVd7XqOvbMgQ%2FNGlCsqs%2BGWrX5M0HR2hG23SYFPNJUj1r',
  'wilson-drv': PERFIL + 'BOvez0YAhjEYDYomB2TAJ41NwmZU7rzLmAK4pSz%2Bf44lZGn24Z2hkHMSRSE92Vot50UqHfB1OTaHzG4zDK6%2BxjgiXsrFOmxFhYOzD4DtDHjITpIoDMIF0h4wFJz8vPF3J%2BUotYpr22jOp9zux79gNBmlI1Vx5VOaFR4AtqwW0B8pfXuQdlqjheF3u2mdlbQZeeoAOPyowWgZMNbVUw7u4QzThjtwtAsrB69fD0prA9A2uHNs2qlUU5LN4k7yfKHq%2B7KW9g%3D%3D',
  'wilson-all-team-retro': PERFIL + 'BPCQE4AVRbIA6pM6L%2Bdtio%2BMc5qeynafytp%2FF%2FwJChExlElRMNChNeQzx7fUk1PshUirtxUvOa87m0AOXGfIAdTMTMF3Pqyh%2F3xDjPVnStLrgsZT6Ij%2FpVbsbm%2B2c8CviIIY1w%2BiULj%2FahdlAV6ZPuMcx6z%2BLs3FbCAQiFpnei5GQHLvDd9wGrHcyJwJEMg3jbrGcAIVN29bxHYakO%2FXpfUi04SAXUZg4ujtGUf4xjbhDSEHmzt6KmkUjEBdF987RFmJQg%3D%3D',
  'spalding-tf1000': PERFIL + 'BL6AqIDl3aT6ncq2WtrghK33Ab40NnnsNxGBHehflVz7U5KBv34VNydD8hoi%2BtSUUSjzFDEcsZWYYLUHDhSI%2FsJVvmIcIN%2FufkmHE1pcnhOha9sm1g7tmFcC3R9VlSNVPCnXj5JP1PrfyKdDIstuSLqGtP0Pird1KgwVAQMWX4IwLe2WiI2Xsg5HNGsKlz6didTRU2HHMyfISBmSNj%2BsVEr%2FF7om9Wg1%2Bvhi7lFpOsfiG6D72yGOp9cAVWv1oZ1XydUXA0m8yYxCHOV%2F',
  'spalding-tf250': PERFIL + 'BIMoX6XFbPvbdFPBMzKBSSlDydF3XAAwfbCgL24KlGvHmE6QUTclXbARS55DBml3a0fTIHygFLLIvYgzCU9rJ4VoV0%2FCFoglc9nJSTnTTA%2BNmaxhwyWCxrWGAQd7qtmv029BEWAl70Qje075%2FS%2Fto4XE5%2FNV5BjpxLmQhkk9U9sqQE4ARw6cyAtppkwXZdhKux7oWvb%2FZq2spF%2FCRSeNVSDDyjkjzfLjOdblhhNuQVxcBKpqgpsgCbkyznsX%2Betz0y9j',
  'spalding-street': PERFIL + 'BIEzZ7T1GWCxo6jvwBVY1hIJhwpni2hiVwQOUlhPQC3YplhHAX7xLTlmU4zmukeGGISRNm9AvxqEyRlKSBwaMEDODMbLO09fa%2FwWu3bvChsn6DxOxZQFhb4CwWNLLpUemso1b%2FNl5%2B%2F1zRahKL%2BOdoFJHMfgMnYrZbjHeKlMgTP6s%2B4auRcx%2B3u0WO9cTe88Yjtc3kOksFbm%2BBsASKuC8vLc%2BKpJEHtWrtNBxDVbVdfaSkiEGYqOgyHwHUqbkaCUQm7fIw%3D%3D',
  'molten-bg4500': PERFIL + 'BOKzHOpDDVj4%2BXjynqEJNeJxnA0x1A6WN8MeKVaTFPhnRQTJzutLHJeCBZt7P4VNjfOQ6tLHhTUrb%2FELTUsAWaVrtlYWnH6zlTAzaFLt5Z3XGsRrpaOzs%2F5s2QdQUs8Jgs%2FndhCTe2ShRJx1VzLiaBDlN%2Bj8XwGklV9QVEG62qnG5nHXJYg58CWfrYUmm4QogRVQVf3DXatePPDMxHYH1gb%2FH1d7gyEfOd8zbSJ%2B3g6KPQWLlcXmKxixTQ40ebeD4EVu8A%3D%3D',
}
