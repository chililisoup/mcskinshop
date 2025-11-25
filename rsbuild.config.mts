import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions(opts) {
        opts.plugins?.unshift('babel-plugin-react-compiler');
      }
    })
  ],
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
