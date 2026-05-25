import fs from 'node:fs'

import eslint from '@eslint/js'
import pluginImportX from 'eslint-plugin-import-x'
import prettier from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const prettierOptions = JSON.parse(fs.readFileSync('./.prettierrc', 'utf8'))

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'import-x': pluginImportX,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.builtin,
        Bun: 'readonly',
        process: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
      },
    },
    rules: {
      semi: ['error', 'never'],
      '@typescript-eslint/semi': ['error', 'never'],
      'prettier/prettier': ['error', prettierOptions],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          pathGroupsExcludedImportTypes: ['type'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: '~/**',
              group: 'internal',
            },
            {
              pattern: '#/**',
              group: 'internal',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**', '**/bun.lockb'],
  },
)
