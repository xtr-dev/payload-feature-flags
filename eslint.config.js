// @ts-check
import js from '@eslint/js'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/build/**',
      '**/temp/**',
      '**/*.d.ts',
      '**/payload-types.ts',
    ],
  },
  {
    ...js.configs.recommended,
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
  },
]