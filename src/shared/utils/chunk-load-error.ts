// Wording differs per browser: Chromium, Firefox and Safari respectively.
const CHUNK_LOAD_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
];

/** True when a lazily loaded page failed to download, typically because the app was redeployed. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return CHUNK_LOAD_MESSAGES.some(message => error.message.includes(message));
}
