/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ss:// access key for the tunnel; overrides the default throwaway test server. */
  readonly VITE_OQUS_ACCESS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
