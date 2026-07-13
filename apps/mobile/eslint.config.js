// Flat ESLint config (Expo preset). Kept lenient to start: it catches real
// mistakes (unused vars, bad hooks deps, etc.) without blocking on style.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'expo-env.d.ts'],
  },
  {
    // Opinionated React Compiler-era rules and pure style: keep them VISIBLE
    // (warnings) without blocking CI yet. Tighten to "error" in a dedicated
    // cleanup pass later. Real bugs (unused vars, undefined, etc.) still fail.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];
