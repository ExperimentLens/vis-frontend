/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" to send signed-out users to /login (see routes.tsx). */
  readonly VITE_REQUIRE_AUTH?: string;
  /** Link behind "Read the SDK quickstart" on the experiments page. */
  readonly VITE_SDK_DOCS_URL?: string;
  /** Link behind the "GitHub" button on the experiments page. */
  readonly VITE_GITHUB_URL?: string;
  /** Address behind "Need help? Contact us" on the experiments page. */
  readonly VITE_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
