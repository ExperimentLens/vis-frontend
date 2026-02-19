import { fileURLToPath } from 'url';
import { dirname } from 'path';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ['dist/', '**/deprecated/'],
  },

  js.configs.recommended,
  tseslint.configs.recommended,

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
      // React – new JSX transform
      ...reactPlugin.configs['jsx-runtime'].rules,

      // React hooks
      'react-hooks/rules-of-hooks': 'error',
      // Note: It's highly recommended to leave exhaustive-deps as 'warn' or 'error' 
      // to prevent stale closures, but I've left it as you had it!
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-key': 'error',

      // TypeScript Custom Rules
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
      'no-unused-vars': 'off', // Superseded by TS rule above
      'no-console': 'error',
      'eqeqeq': 'error',

      // PRETTIER OVERRIDES: 
      // This must be placed last in your rules object to ensure it disables 
      // any formatting rules that might have been inherited from other configs.
      ...prettierConfig.rules,
    },
  },

  // TypeScript-only: enable typed linting
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Test files – Exposing Vitest/Jest globals
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
        jest: 'readonly', // Consider replacing 'jest' with 'vi' since you use Vitest
      },
    },
  },
);