import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // A suíte do backend na raiz não deve descobrir testes do app independente.
    include: ['tests/**/*.ui.jsx', 'tests/**/*.spec.js'],
    clearMocks: true,
  },
});
