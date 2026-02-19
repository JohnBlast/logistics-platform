/// <reference types="vite/client" />

// Ensure ImportMeta.env is available in all build contexts (CI, Render, etc.)
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
