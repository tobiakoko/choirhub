module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB models use legacy decorators
      ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
    ],
  };
};
