const enableSSR = process.env.VUE_APP_MODE === 'ssr';

module.exports = {
  chainWebpack: config => {
    config
      // Update entry to use universal client entry
      .entry('app')
      .clear()
      .add('./src/entry-client.js')
      .end()
      // Exclude unprocessed HTML templates from being copied to 'dist' folder.
      // First check if copy-webpack-plugin exists, it is not added to the
      // config in some circumstances. (e.g. legacy build when using --modern)
      .when(config.plugins.has('copy'), config => {
        config.plugin('copy').tap(([[config]]) => [
          [
            {
              ...config,
              ignore: [...config.ignore, 'index.html', 'index.template.html'],
            },
          ],
        ]);
      });

    if (!enableSSR) return;

    const nodeExternals = require('webpack-node-externals');
    const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
    const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');

    const isServerBuild = process.env.VUE_APP_ENV === 'server';

    config.plugins
      // Delete plugins that are unnecessary/broken in SSR & add Vue SSR plugin
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
      // Configure the server-side build that's run in a Node environment
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

    // Change caching directories so client- and server-side webpack instances
    // don't share one cache – otherwise the client build would use cached SSR
    // code (and vice versa) and break the build in some cases.
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
