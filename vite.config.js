import {defineConfig} from 'vite';

export default defineConfig({
  // Windows file replacement can miss native watcher events. Polling keeps the
  // browser preview in sync with the same files used by the production build.
  server:{watch:{usePolling:process.platform==='win32',interval:500,ignored:['**/验收截图/**']}}
});
