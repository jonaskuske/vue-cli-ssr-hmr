/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createBundleRenderer } = require('vue-server-renderer');
const webpack = require('webpack');
const chokidar = require('chokidar');
const memoryFS = require('memory-fs');
const vueCli = require('@vue/cli-service');
const cliService = new vueCli(process.cwd());

cliService.init('ssr-client');
const clientConfigChain = cliService.resolveChainableWebpackConfig();
process.env.VUE_APP_ENV = 'server';
const serverConfigChain = cliService.resolveChainableWebpackConfig();

const outputPath = clientConfigChain.output.get('path');
const outputPublicPath = clientConfigChain.output.get('publicPath');

const readFile = (fs, file) => {
  try {
    return fs.readFileSync(path.join(outputPath, file), 'utf-8');
  } catch (e) {
    /* */
  }
};

function createDevelopmentRenderer(app, templatePath, updateRenderer) {
  let bundle;
  let template;
  let clientManifest;

  let ready;
  const readyPromise = new Promise(resolve => (ready = resolve));

  const createNextRenderer = () => {
    if (bundle && clientManifest) {
      ready();

      const newRenderer = createBundleRenderer(bundle, {
        template,
        clientManifest,
        runInNewContext: false,
      });

      updateRenderer(newRenderer);
    }
  };

  clientConfigChain
    .entry('app')
    .prepend(path.resolve(__dirname, './hmr-client'))
    .end()
    .output.filename('[name].js');

  const clientCompiler = webpack(clientConfigChain.toConfig());

  const webpackDevMiddleware = require('webpack-dev-middleware')(
    clientCompiler,
    {
      publicPath: outputPublicPath,
      logLevel: 'error',
    },
  );
  app.use(webpackDevMiddleware);

  clientCompiler.plugin('done', stats => {
    const { errors } = stats.toJson();
    errors.forEach(error => console.error(error));
    if (errors.length) return;

    clientManifest = JSON.parse(
      readFile(webpackDevMiddleware.fileSystem, 'vue-ssr-client-manifest.json'),
    );
    createNextRenderer();
  });

  const webpackHotMiddleware = require('webpack-hot-middleware')(
    clientCompiler,
    { heartbeat: 5000 },
  );
  app.use(webpackHotMiddleware);

  template = fs.readFileSync(templatePath, 'utf-8');
  chokidar.watch(templatePath).on('change', () => {
    template = fs.readFileSync(templatePath, 'utf-8');

    createNextRenderer();
    webpackHotMiddleware.publish({ reload: true });
  });

  const serverCompiler = webpack(serverConfigChain.toConfig());
  serverCompiler.outputFileSystem = new memoryFS();

  serverCompiler.watch({ 'info-verbosity': 'none' }, (error, stats) => {
    if (error) throw error;
    stats = stats.toJson();
    if (stats.errors.length) return;

    bundle = JSON.parse(
      readFile(serverCompiler.outputFileSystem, 'vue-ssr-server-bundle.json'),
    );

    createNextRenderer();
  });

  return readyPromise;
}

module.exports = createDevelopmentRenderer;
