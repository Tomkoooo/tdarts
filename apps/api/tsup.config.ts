import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/trpc/standalone/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  // Inline workspace packages (they don't emit their own dist/)
  noExternal: [/@tdarts\/.*/],
  clean: true,
  sourcemap: true,
  // tsconfig paths are read automatically
  tsconfig: 'tsconfig.build.json',
});
