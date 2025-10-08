import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  output: {
    distPath: { root: 'build' }
  },
  html: {
    template: './public/index.html'
  },
  resolve: {
    alias: {
      '@': './src',
      '@assets': './src/assets',
      '@components': './src/components',
      '@tools': './src/tools'
    }
  }
});
