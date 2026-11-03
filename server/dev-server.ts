import { createServer } from 'node:http';
import { createTrackerApp } from './app';

const port = Number(process.env.PORT || 4179);
const app = createTrackerApp();

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${port}`;
    const url = `http://${host}${req.url || '/'}`;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) headers.set(k, v.join(', '));
      else if (typeof v === 'string') headers.set(k, v);
    }

    const fetchReq = new Request(url, {
      method: req.method || 'GET',
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    });

    const response = await app.fetch(fetchReq);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const arrayBuf = await response.arrayBuffer();
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Uhurued Task Tracker API listening on http://127.0.0.1:${port}`);
});
