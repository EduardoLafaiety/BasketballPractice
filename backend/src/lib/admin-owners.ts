/** O papel também precisa existir no banco; conhecer/cadastrar um e-mail nunca concede acesso. */
export const ADMIN_OWNERS = [
  { name: 'Agatha Lafaiety', email: 'agatha.lafaietyy@gmail.com' },
  { name: 'Eduardo Lopes', email: 'deveducontato@gmail.com' },
] as const

export const ownerEmail = (email: string) => ADMIN_OWNERS.some(owner => owner.email === email.trim().toLowerCase())
export const ownersOnly = () => typeof process !== 'undefined' && (process.env.NODE_ENV === 'production' || process.env.ADMIN_OWNERS_ONLY === 'true')
export const effectiveAdmin = (email: string, role: boolean) => role && (!ownersOnly() || ownerEmail(email))
