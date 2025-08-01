import Module from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...args) {
  if (request.startsWith('@/')) {
    const p = path.join(__dirname, '../test-dist', request.slice(2));
    return originalResolve.call(this, p, parent, ...args);
  }
  return originalResolve.call(this, request, parent, ...args);
};
