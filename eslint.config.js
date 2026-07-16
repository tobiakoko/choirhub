// Root ESLint flat config for the ChoirHub monorepo.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const choirhub = require('./tooling/eslint-plugin-choirhub');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      '**/coverage/**',
      'supabase/functions/**', // Deno, linted separately
      'apps/mobile/expo-env.d.ts',
    ],
  },
  ...expoConfig,
  // Resolve the mobile app's `@/*` tsconfig path alias for import/* rules.
  {
    files: ['apps/mobile/**/*.{js,jsx,ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: { project: 'apps/mobile/tsconfig.json' },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },
      },
    },
  },
  // Design System rule: no raw colors or px values outside tokens.ts
  {
    files: ['apps/mobile/src/**/*.{js,jsx,ts,tsx}', 'packages/ui/src/**/*.{js,jsx,ts,tsx}'],
    plugins: { choirhub },
    rules: {
      'choirhub/no-magic-tokens': 'error',
    },
  },
  {
    // tokens.ts is the single place raw visual values may live
    files: ['packages/ui/src/tokens.ts'],
    rules: {
      'choirhub/no-magic-tokens': 'off',
    },
  },
  prettierConfig,
];
