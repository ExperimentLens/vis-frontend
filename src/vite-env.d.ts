/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" to send signed-out users to /login (see routes.tsx). */
  readonly VITE_REQUIRE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
