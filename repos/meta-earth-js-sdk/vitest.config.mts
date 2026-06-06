import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // UI configuration
    ui: true,
    // Show verbose output
    reporters: 'verbose',
    // Enable API debug information
    logHeapUsage: false,
    // Test timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
    // Coverage configuration (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*', 'src/**/*.d.ts'],
    },
  },
})
