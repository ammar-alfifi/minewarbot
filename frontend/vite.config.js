import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // مهم: تيليجرام يتطلب HTTPS — ngrok يعطيك إياه
    // allowedHosts: true
  }
});
