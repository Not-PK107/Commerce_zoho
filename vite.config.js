import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import zohoConfig from './zohoConfig.js';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), zohoConfig()],
  server: {
    port: 3000,
    strictPort: true,
  },
});
