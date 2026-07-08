/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the OqusVPN backend API (default http://localhost:8080). */
  readonly VITE_OQUS_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
