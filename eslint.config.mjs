import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    ignores: ['eslint.config.mjs', '**/*.js', '**/*.d.ts']
  },
  {
    plugins: {
      react: react
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      eqeqeq: 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-floating-promises': 'warn'
    },
    files: ['src/**/*.ts', 'src/**/*.tsx']
  }
);

// import react from 'eslint-plugin-react';
// import prettier from 'eslint-plugin-prettier';
// import ts from '@typescript-eslint/eslint-plugin';
// import tsParser from '@typescript-eslint/parser';
// import eslint from '@eslint/js';
// import tseslint from 'typescript-eslint';
// import globals from 'globals';
// import imprt from 'eslint-plugin-import';

// export default tseslint.config(
//   eslint.configs.recommended,
//   react.configs.recommended,
//   prettier.configs.recommended,
//   tseslint.configs.strictTypeChecked,
//   tseslint.configs.stylisticTypeChecked,
//   {
//     plugins: {
//       ['@typescript-eslint']: tseslint.plugin,
//       ['react']: react,
//       ['prettier']: prettier,
//       ['import']: imprt,
//       ts
//     },
//     languageOptions: {
//       globals: {
//         ...globals.es2020
//       },
//       parser: tsParser,
//       parserOptions: {
//         ecmaFeatures: {
//           modules: true
//         },
//         ecmaVersion: 'latest',
//         project: ['./tsconfig.json'],
//         projectService: true,
//         tsconfigRootDir: import.meta.dirname
//       }
//     },
//     rules: {
//       semi: ['error', 'always'],
//       quotes: ['error', 'single'],

//       'no-unused-vars': [
//         'error',
//         {
//           argsIgnorePattern: '^_'
//         }
//       ],

//       '@typescript-eslint/explicit-function-return-type': 'off'
//     }
//   }
// );
