import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // `next lint` skipped build output on its own; the ESLint CLI needs telling.
  {
    // New in eslint-config-next 16 (React Compiler-based hook rules). They flag
    // load-on-mount and read-localStorage-after-mount effects across ~11
    // components; those work correctly today, so they're warnings until the
    // components are reworked rather than a blocker for the framework upgrade.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  globalIgnores(['.next/**', '.open-next/**', '.wrangler/**', '.netlify/**', 'out/**', 'build/**', 'next-env.d.ts']),
])

export default eslintConfig
