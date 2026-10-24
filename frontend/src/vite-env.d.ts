/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API, ex.: https://api.exemplo.com/api. Padrão: /api (proxy do Vite). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
