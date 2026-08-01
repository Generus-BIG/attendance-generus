import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.tsx', 'api/**/*.ts', 'supabase/functions/**/*.ts'],
  ignore: ['src/components/ui/**', 'src/routeTree.gen.ts'],
  ignoreDependencies: ['tailwindcss', 'tw-animate-css'],
}

export default config
