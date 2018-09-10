const fs = require('fs');
const { createBundleRenderer } = require('vue-server-renderer');

const bundle = require('../dist/vue-ssr-server-bundle.json');
const clientManifest = require('../dist/vue-ssr-client-manifest.json');

module.exports = function createProductionRenderer(templatePath) {
  const template = fs.readFileSync(templatePath, 'utf-8');

  return createBundleRenderer(bundle, {
    template,
    clientManifest,
    runInNewContext: false,
  });
};
