const enableSSR = process.env.VUE_APP_MODE === 'ssr';

module.exports = {
  chainWebpack: config => {
    config
      .entry('app')
      .clear()
      .add('./src/entry-client.js')
      .end();

    if (config.plugins.has('copy')) {
      config
        .plugin('copy')
        .tap(([[config]]) => [
          [{ ...config, ignore: [...config.ignore, 'index.template.html'] }],
        ]);
    }

    if (!enableSSR) return;

    const nodeExternals = require('webpack-node-externals');
    const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
    const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');

    const isServerBuild = process.env.VUE_APP_ENV === 'server';

    config.plugins
      .delete('html')
      .delete('preload')
      .delete('prefetch')
      .delete('pwa')
      .end()
      .plugin('vue-ssr')
      .use(isServerBuild ? VueSSRServerPlugin : VueSSRClientPlugin)
      .end();

    if (!isServerBuild) return;

    config
      .entry('app')
      .clear()
      .add('./src/entry-server.js')
      .end()
      .target('node')
      .devtool('source-map')
      .externals(nodeExternals({ whitelist: /\.css$/ }))
      .output.filename('server-bundle.js')
      .libraryTarget('commonjs2')
      .end()
      .optimization.splitChunks({})
      .end()
      .plugins.delete('named-chunks')
      .delete('hmr')
      .delete('workbox');

    const path = require('path');
    const resolve = filepath => path.resolve(__dirname, filepath);

    config.module
      .rule('vue')
      .use('cache-loader')
      .tap(config => ({
        ...config,
        cacheDirectory: resolve(
          './node_modules/.cache/server-bundle/vue-loader',
        ),
      }))
      .end()
      .use('vue-loader')
      .tap(config => ({
        ...config,
        cacheDirectory: resolve(
          './node_modules/.cache/server-bundle/vue-loader',
        ),
      }))
      .end()
      .end()
      .rule('js')
      .use('cache-loader')
      .tap(config => ({
        ...config,
        cacheDirectory: resolve(
          './node_modules/.cache/server-bundle/babel-loader',
        ),
      }));
  },
};
