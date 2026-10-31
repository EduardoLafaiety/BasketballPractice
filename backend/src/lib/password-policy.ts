export const OBVIOUS_PASSWORD = 'Essa senha é fácil demais de adivinhar. Escolha outra.'

// Só as de 8 caracteres ou mais importam: as menores já são recusadas pelo tamanho.
const OBVIOUS = new Set([
  '12345678', '123456789', '1234567890', '0123456789', '87654321', '12341234', '12344321', '11223344', '123123123',
  'password', 'password1', 'password123', 'senha123', 'senha1234', 'senha12345', 'minhasenha', 'senhasenha', 'mudar123', 'trocar123',
  'qwerty123', 'qwertyuiop', 'asdfghjkl', 'abc12345', 'abcd1234', 'abcdefgh', 'a1b2c3d4', 'admin123', 'administrador', 'iloveyou', 'teamo123',
  'basquete', 'basquete1', 'basquete123', 'basketball', 'basketball1', 'basketball123', 'flamengo', 'corinthians', 'palmeiras', 'santos123',
])

/** Recusa as senhas das primeiras tentativas de quem ataca: as da lista e um caractere só repetido. */
export function isObviousPassword(password: string) {
  const normalized = password.trim().toLowerCase()
  return OBVIOUS.has(normalized) || /^(.)\1*$/.test(normalized)
}
