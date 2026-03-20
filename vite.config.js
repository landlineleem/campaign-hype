import { defineConfig } from 'vite';

export default defineConfig({
  base: '/campaign-hype/',
  build: {
    rollupOptions: {
      input: {
        main:   'index.html',
        admin:  'admin/index.html',
        report: 'report/index.html',
      },
    },
  },
  server: {
    open: true,
  },
});
