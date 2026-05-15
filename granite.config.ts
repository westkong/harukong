import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'harukong',
  brand: {
    displayName: '하루콩',
    primaryColor: '#3DAE89',
    icon: 'https://harukong-delta.vercel.app/favicon.svg',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite dev',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
