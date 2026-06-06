import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable all node built-in polyfills
      include: ['buffer', 'process', 'util', 'stream'],
      // Explicitly enable globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Reference the SDK build output directly to support hot updates
      'meta-earth-js-sdk': resolve(__dirname, '../../dist/index.js'),
    },
  },
  // Ensure .wasm files are treated as static assets
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 3000,
  },
})
