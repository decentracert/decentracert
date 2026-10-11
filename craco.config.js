const webpack = require('webpack');
process.env.HOST ||= '127.0.0.1';
// keep cra off the api port from .env
process.env.PORT = '3000';

module.exports = {
  webpack: {
    configure: cfg => {
      cfg.plugins.push(new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }));
      return cfg;
    }
  },
  devServer: cfg => {
    const before = cfg.onBeforeSetupMiddleware;
    const after = cfg.onAfterSetupMiddleware;
    if (cfg.https) cfg.server = { type: 'https', options: cfg.https === true ? {} : cfg.https };
    delete cfg.https;
    delete cfg.onBeforeSetupMiddleware;
    delete cfg.onAfterSetupMiddleware;
    cfg.host = '127.0.0.1';
    cfg.allowedHosts = ['localhost', '127.0.0.1'];
    cfg.headers = {};
    // adapt cra's middleware and shutdown hooks to dev server 5
    cfg.setupMiddlewares = (middlewares, server) => {
      server.close = callback => server.stopCallback(callback || (() => {}));
      before?.(server);
      after?.(server);
      return middlewares;
    };
    return cfg;
  }
};
