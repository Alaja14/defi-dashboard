import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  server: {watch:{ignored:['**/data/**','**/.data-stage/**','**/.data-backup/**','**/.cache/**','**/.venv/**','**/scripts/**','**/tests/**']}},
  build: {rollupOptions:{output:{manualChunks:{charts:['recharts'],icons:['lucide-react']}}}},
  plugins: [react(), tailwindcss(), {
    name: 'repository-data',
    configureServer(server) { server.middlewares.use('/data', async (req, res, next) => {
      const { createReadStream, existsSync } = await import('node:fs');
      const { resolve, sep } = await import('node:path');
      const root = resolve('data'); const path = resolve(root, '.' + (req.url || '').split('?')[0]);
      if (!path.startsWith(root + sep) || !path.endsWith('.json') || !existsSync(path)) return next();
      res.setHeader('Content-Type', 'application/json'); createReadStream(path).pipe(res);
    }); },
    closeBundle() { if (existsSync('data')) { mkdirSync('dist/data', {recursive:true}); cpSync('data','dist/data',{recursive:true}); } }
  }],
});
