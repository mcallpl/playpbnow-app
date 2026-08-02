// Metro (Expo SDK 50+) can bundle without this file, which is why the project
// had none. Jest cannot: without a Babel config it fails to transform
// react-native's own jest/setup.js, which is Flow-typed, and every suite dies
// at parse time with "Unexpected token, expected ','".
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
