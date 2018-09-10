/* eslint-disable no-console */
const path = require('path');
const express = require('express');
const isProduction = process.env.NODE_ENV === 'production';
const resolve = file => path.resolve(__dirname, file);
const templatePath = resolve('./public/index.template.html');
const app = express();

let renderer;
let readyPromise;

if (isProduction) {
  const createProductionRenderer = require('./server/prod-renderer');
  renderer = createProductionRenderer(templatePath);
} else {
  const createDevelopmentRenderer = require('./server/dev-renderer');

  readyPromise = createDevelopmentRenderer(
    app,
    templatePath,
    updatedRenderer => (renderer = updatedRenderer),
  );
}

function respond(req, res) {
  res.setHeader('Content-Type', 'text/html');

  const handleError = err => {
    if (err.url) {
      res.redirect(err.url);
    } else if (err.code === 404) {
      res.status(404).send('404 | Page Not Found');
    } else {
      res.status(500).send('500 | Internal Server Error');
      console.error(`error during render : ${req.url}`);
      console.error(err.stack);
    }
  };
  const context = { title: 'Vue CLI + SSR + HMR', url: req.url };

  renderer.renderToString(context, (err, html) => {
    if (err) return handleError(err);
    res.send(html);
  });
}

app.use(express.static(resolve('./dist')));

const respondWith = isProduction
  ? respond
  : (req, res) => readyPromise.then(() => respond(req, res));
app.get('*', respondWith);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server is live at localhost:${port}\n`));
