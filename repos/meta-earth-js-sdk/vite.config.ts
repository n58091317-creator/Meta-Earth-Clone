import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MetaEarthSDK',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'umd' ? 'umd.cjs' : 'js'}`,
    },
    rollupOptions: {
      external: [],
      output: {
        exports: 'named',
        globals: {},
      },
    },
    sourcemap: false,
    minify: 'terser',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    nodePolyfills({
      // Enable all node built-in polyfills
      include: ['buffer', 'process', 'util', 'stream', 'crypto', 'vm'],
      // Explicitly enable globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
})
