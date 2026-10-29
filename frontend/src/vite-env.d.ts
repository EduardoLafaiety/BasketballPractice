/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API, ex.: https://api.exemplo.com/api. Padrão: /api (proxy do Vite). */
  readonly VITE_API_URL?: string
  /** "true" no build da demonstração (.env.demo): a API roda no navegador, sem backend. */
  readonly VITE_DEMO?: string
  /** Subpasta onde o site é publicado, ex.: /BasketballPractice/ (GitHub Pages). Padrão: /. */
  readonly VITE_BASE?: string
}

/** true no build da demonstração; definido no vite.config.ts a partir de VITE_DEMO. */
declare const __DEMO__: boolean

interface ImportMeta {
  readonly env: ImportMetaEnv
}
