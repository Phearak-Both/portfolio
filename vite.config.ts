import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js lives in the lazily-loaded Avatar3D chunk (~265 kB gzip),
    // fetched only when a .glb model is present.
    chunkSizeWarningLimit: 1100,
  },
});
