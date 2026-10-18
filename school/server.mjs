// Backward-compatible launcher: teacher authentication requires the server.
import {fileURLToPath} from 'node:url';
process.argv=[process.execPath,fileURLToPath(new URL('./scripts/run-framework.mjs',import.meta.url)),'dev',...process.argv.slice(2)];
await import('./scripts/run-framework.mjs');
