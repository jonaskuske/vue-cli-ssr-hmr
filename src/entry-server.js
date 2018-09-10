import createApp from './createApp';

export default context => {
  context.BASE_URL = process.env.BASE_URL;

  return new Promise((resolve, reject) => {
    const { app, store, router } = createApp();

    const { url } = context;
    const { fullPath } = router.resolve(url).route;

    if (fullPath !== url) {
      return reject({ url: fullPath });
    }

    router.push(url);

    router.onReady(() => {
      const matchedComponents = router.getMatchedComponents();

      if (!matchedComponents.length) {
        return reject({ code: 404 });
      }

      context.state = store.state;
      resolve(app);
    }, reject);
  });
};
