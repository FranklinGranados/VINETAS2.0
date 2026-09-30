/// <reference types="vite/client" />

// Declara el tipo de nuestras variables de entorno VITE_* para que
// import.meta.env.VITE_API_URL tenga autocompletado y chequeo de tipos
// en vez de ser "any".
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
