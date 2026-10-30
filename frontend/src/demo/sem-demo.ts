// Entra no lugar de servidor.ts fora do build da demonstração (alias "@demo/servidor" no vite.config.ts),
// para o site normal não levar o PGlite nem as rotas do backend. Nunca é chamado: __DEMO__ é false.
const desligada = () => Promise.reject(new Error('A versão de demonstração não faz parte deste build'))

export const responder = desligada
