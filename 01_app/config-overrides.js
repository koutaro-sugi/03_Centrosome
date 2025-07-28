module.exports = function override(config, env) {
  // AWS IoT Device SDK v2用のpolyfill設定
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "util": require.resolve("util/"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "process": require.resolve("process/browser.js"),
    "crypto": require.resolve("crypto-browserify"),
    "fs": false,
    "path": require.resolve("path-browserify"),
    "os": require.resolve("os-browserify/browser")
  };

  // Fully specified ESM解決エラーの修正
  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  // Webpack 5用のprovide plugin
  const webpack = require('webpack');
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ];

  return config;
};