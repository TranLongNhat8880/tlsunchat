/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  // thêm các biến môi trường khác ở đây nếu cần
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
