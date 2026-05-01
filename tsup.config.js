import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false
})
