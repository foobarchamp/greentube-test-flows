// ESLint flat configuration.
//
// The rules are the two documented starting points, JavaScript recommended and TypeScript recommended,
// with eslint-config-prettier after the rule sets, so formatting is Prettier's job and not a lint rule.
// Node globals are declared so a JavaScript file added here can read the environment or print without a
// no-undef error; on the TypeScript file that rule is off, because the language service owns those names.

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'reports/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
);
