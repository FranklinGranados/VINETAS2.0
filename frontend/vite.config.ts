import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Si el 5173 ya está ocupado (otra terminal con `npm run dev` abierta),
    // Vite por defecto se muda en silencio al 5174 y la dirección que uno
    // tiene abierta deja de ser la correcta. Con strictPort falla con un
    // error claro ("Port 5173 is already in use") en vez de cambiar de puerto.
    strictPort: true,
  },
})
