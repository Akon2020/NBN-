module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: isTest
      ? ['babel-preset-expo']
      : [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
