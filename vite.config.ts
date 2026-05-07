import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // ─── Serve run_XXXXXXXX/ folders từ project root ─────────────────────────
    // Vì Vite chỉ serve public/ theo mặc định, nhưng các run folder lại nằm
    // ngay ở gốc project (ngang hàng với src/). Plugin này intercept request
    // có dạng /run_*/... và trả file thực tế từ filesystem.
    {
      name: 'serve-run-folders',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0] ?? '';
          // Chỉ handle request khớp pattern /run_YYYYMMDD_HHMM_xxxxxxxx/...
          if (/^\/run_\d{8}_\d{4}_[0-9a-f]+\//.test(url)) {
            const filePath = path.join(process.cwd(), url);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.json': 'application/json',
                '.jpg':  'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png':  'image/png',
                '.webp': 'image/webp',
                '.txt':  'text/plain',
                '.md':   'text/markdown',
              };
              res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
    },
  ],
})
