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
        URLSearchParams: 'readonly',
        // Node.js stream utilities are imported via fs/stream — no globals needed
        // but mark atob/btoa just in case any future code uses them
        atob: 'readonly',
        btoa: 'readonly'
      }
    }
  }
]
