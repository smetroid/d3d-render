import js from '@eslint/js'

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**']
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js built-ins
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        TextDecoder: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly'
      }
    }
  }
]
