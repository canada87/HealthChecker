/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Set at image build time from the git tag / commit (see frontend/Dockerfile)
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_COMMIT?: string
}

// Injected by vite.config.ts
declare const __BUILD_DATE__: string
