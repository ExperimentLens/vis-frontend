import { fileURLToPath } from 'url';
import { dirname } from 'path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // Ignore patterns (replaces .eslintignore + ignorePatterns)
  {
    ignores: ['dist/', '**/deprecated/'],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (sets up parser + plugin automatically)
  tseslint.configs.recommended,

  // Main config for all source files
  {
    files: ['**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}'],

    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },

    settings: {
      react: { version: 'detect' },
    },

    rules: {
      // React – new JSX transform (no need to import React in scope)
      ...reactPlugin.configs['jsx-runtime'].rules,

      // Prettier – disable formatting rules that conflict with prettier
      ...prettierConfig.rules,

      // React hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-key': 'error',

      // TypeScript
      '@typescript-eslint/consistent-type-imports': [
        2,
        { fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-restricted-imports': [
        2,
        {
          paths: [
            {
              name: 'react-redux',
              importNames: ['useSelector', 'useStore', 'useDispatch'],
              message: 'Please use pre-typed versions from `src/app/hooks.ts` instead.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // General quality rules
      'no-unused-vars': 'off', // superseded by @typescript-eslint/no-unused-vars
      'no-console': 'error',
      'eqeqeq': 'error',

      // Formatting rules (prettier-config disables the conflicting ones)
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': ['error', 'always'],
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'only-multiline'],
      'comma-spacing': ['error', { before: false, after: true }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'object-curly-spacing': ['error', 'always'],
      'space-before-blocks': ['error', 'always'],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      'eol-last': ['error', 'always'],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      'newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
      'no-trailing-spaces': 'error',
    },
  },

  // TypeScript-only: enable typed linting (requires tsconfig project)
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Test files – expose jest globals
  {
    files: ['**/*.{test,spec}.{ts,js,tsx,jsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
  },
);
