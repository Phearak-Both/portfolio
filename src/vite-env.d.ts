/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI RAG backend. Unset = mock responses. */
  readonly VITE_CHAT_API_URL?: string;
}
