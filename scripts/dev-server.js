#!/usr/bin/env bun

import { watch } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// MIME type mapping
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.zbl': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// Live reload client script (injected into HTML)
const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  let ws;
  let reconnectTimeout;
  let heartbeatInterval;

  function connect() {
    ws = new WebSocket('ws://localhost:${PORT}/ws');

    ws.onopen = () => {
      console.log('🔌 Dev server connected');

      // Clear any existing heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Send heartbeat every 25 seconds (before server's 30s ping)
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'reload') {
        console.log('🔄 Reloading page...');
        location.reload();
      } else if (event.data === 'ping') {
        // Respond to server ping
        ws.send('pong');
      }
    };

    ws.onclose = () => {
      console.log('❌ Dev server disconnected, attempting to reconnect...');

      // Clear heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Attempt reconnection
      reconnectTimeout = setTimeout(connect, 1000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  connect();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (ws) {
      ws.close();
    }
  });
})();
</script>
`;

// WebSocket clients for live reload
const clients = new Set();

// File watcher state
let watchTimeout;
const DEBOUNCE_DELAY = 500;

// File watcher
function setupFileWatcher() {
  const dirsToWatch = [
    join(projectRoot, 'js'),
    join(projectRoot, 'css'),
    join(projectRoot, 'templates'),
    projectRoot, // Watch root for index.html
  ];

  dirsToWatch.forEach(dir => {
    if (!existsSync(dir)) return;

    const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Filter out hidden directories (any path component starting with '.')
      const pathParts = filename.split('/');
      const isHiddenPath = pathParts.some(part => part.startsWith('.'));

      if (isHiddenPath) {
        // Skip files in hidden directories (.git, .claude, etc.)
        return;
      }

      // Filter out files we don't want to trigger reload
      const ext = extname(filename);
      const ignoredExtensions = ['.xlsx', '.xls', '.pdf', '.lockb', '.swp', '.tmp'];
      const ignoredFiles = ['bun.lockb', '.DS_Store'];

      if (ignoredExtensions.includes(ext) || ignoredFiles.includes(filename)) {
        return;
      }

      // Debounce file changes
      clearTimeout(watchTimeout);
      watchTimeout = setTimeout(() => {
        console.log(`📝 File changed: ${filename}`);
        notifyClients('reload');
      }, DEBOUNCE_DELAY);
    });
  });

  console.log('👀 Watching files for changes...');
}

// Notify all connected WebSocket clients
function notifyClients(message) {
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Get MIME type for file
function getMimeType(filepath) {
  const ext = extname(filepath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Serve static files
async function serveStaticFile(filepath) {
  try {
    const file = Bun.file(filepath);
    const exists = await file.exists();

    if (!exists) {
      return new Response('Not Found', { status: 404 });
    }

    const mimeType = getMimeType(filepath);
    let content = await file.text();

    // Inject live reload script into HTML files
    if (mimeType === 'text/html' && content.includes('</body>')) {
      content = content.replace('</body>', `${LIVE_RELOAD_SCRIPT}</body>`);
    }

    return new Response(content, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Create HTTP server
const server = Bun.serve({
  port: PORT,
  hostname: HOST,

  async fetch(req, server) {
    const url = new URL(req.url);

    // Handle WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return undefined;
    }

    // Handle error logging endpoint
    if (url.pathname === '/log-error' && req.method === 'POST') {
      try {
        const errorData = await req.json();

        // Format error log for stdout
        const timestamp = new Date(errorData.timestamp).toLocaleString();
        const separator = '━'.repeat(60);

        console.error('');
        console.error(separator);
        console.error(`❌ ERROR CAPTURED: ${errorData.category}`);
        console.error(separator);
        console.error(`Timestamp: ${timestamp}`);
        console.error(`Context:   ${errorData.context}`);
        console.error(`Message:   ${errorData.message}`);
        console.error(`Error:     ${errorData.name}`);

        if (errorData.metadata && Object.keys(errorData.metadata).length > 0) {
          console.error('\nMetadata:');
          Object.entries(errorData.metadata).forEach(([key, value]) => {
            if (typeof value === 'object') {
              console.error(`  ${key}: ${JSON.stringify(value, null, 2)}`);
            } else {
              console.error(`  ${key}: ${value}`);
            }
          });
        }

        if (errorData.stack) {
          console.error('\nStack Trace:');
          console.error(errorData.stack);
        }

        console.error(separator);
        console.error('');

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (logError) {
        console.error('Failed to process error log:', logError);
        return new Response(JSON.stringify({ success: false, error: logError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Determine file path
    let filepath = url.pathname === '/' ? '/index.html' : url.pathname;
    filepath = join(projectRoot, filepath);

    // Security: prevent directory traversal
    if (!filepath.startsWith(projectRoot)) {
      return new Response('Forbidden', { status: 403 });
    }

    return serveStaticFile(filepath);
  },

  websocket: {
    open(ws) {
      clients.add(ws);
      console.log(`🔌 Client connected (${clients.size} total)`);

      // Send periodic ping to keep connection alive
      ws.pingInterval = setInterval(() => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.ping();
        }
      }, 30000); // Ping every 30 seconds
    },

    close(ws, code, reason) {
      // Clear ping interval
      if (ws.pingInterval) {
        clearInterval(ws.pingInterval);
      }

      clients.delete(ws);
      console.log(`❌ Client disconnected (${clients.size} remaining) - Code: ${code}, Reason: ${reason || 'N/A'}`);
    },

    message(ws, message) {
      // Handle pong or other messages from client
      if (message === 'pong') {
        // Client acknowledged ping
      }
    },

    // Bun WebSocket configuration
    perMessageDeflate: false,
    maxPayloadLength: 16 * 1024 * 1024, // 16MB
    idleTimeout: 120, // 2 minutes idle timeout
    backpressureLimit: 1024 * 1024, // 1MB
  },
});

// Setup file watching
setupFileWatcher();

// Display startup message
console.log('');
console.log('🚀 Hyperpro Sticker Generator Development Server');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📡 Server running at: http://localhost:${PORT}`);
console.log(`🔥 Hot reload enabled`);
console.log('');
console.log('Press Ctrl+C to stop the server');
console.log('');

// Auto-open browser (cross-platform)
const openBrowser = (url) => {
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';

  try {
    Bun.spawn([start, url], { stdio: 'ignore' });
  } catch (error) {
    // Silently fail if browser can't be opened
  }
};

// Open browser after short delay
setTimeout(() => {
  openBrowser(`http://localhost:${PORT}`);
}, 500);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n');
  console.log('👋 Shutting down dev server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n');
  console.log('👋 Shutting down dev server...');
  server.stop();
  process.exit(0);
});
