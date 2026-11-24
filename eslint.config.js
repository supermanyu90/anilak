import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '.vercel/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.browser, THREE: 'readonly' } },
  },
  {
    files: ['js/tailwind.config.js'],
    languageOptions: { sourceType: 'script', globals: { tailwind: 'writable' } },
  },
  {
    files: ['api/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
