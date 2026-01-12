import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import json from '@eslint/json';
import css from '@eslint/css';

export default [
  // Base JS
  js.configs.recommended,

  // TypeScript
  ...tseslint.configs.recommended,

  // React (si lo usas en este repo)
  pluginReact.configs.flat.recommended,

  // Globals (Node + Browser)
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // JSON lint (opcional)
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    rules: {
      ...json.configs.recommended.rules,
    },
  },

  // CSS lint (opcional)
  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    rules: {
      ...css.configs.recommended.rules,
    },
  },
];
