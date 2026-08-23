import path from 'path'
import { loadEnv } from 'payload/node'
import { fileURLToPath } from 'url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default defineConfig(() => {
  loadEnv(path.resolve(dirname, './dev'))

  return {
    plugins: [
      tsconfigPaths({
        ignoreConfigErrors: true,
      }),
    ],
    test: {
      environment: 'node',
      // e2e.spec.ts is a Playwright suite (run by `pnpm test:e2e`); vitest's default
      // include of *.spec.ts would load it and fail on Playwright's test() guard
      exclude: [...configDefaults.exclude, '**/e2e.spec.ts'],
      hookTimeout: 30_000,
      testTimeout: 30_000,
    },
  }
})
