import { createHash, randomBytes } from 'node:crypto'

/** Token dos links enviados por e-mail: longo e aleatório, nunca dá para adivinhar. */
export const newOneTimeToken = () => randomBytes(32).toString('base64url')

// O banco guarda só o hash: quem ler o banco (ou um backup) não consegue usar os links ainda válidos.
// SHA-256 basta aqui: o token já tem 256 bits de acaso, ao contrário de uma senha.
export const hashOneTimeToken = (token: string) => createHash('sha256').update(token).digest('hex')
