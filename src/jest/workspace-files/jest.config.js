const baseConfig = require('../../jest.base.config');

module.exports = {
  ...baseConfig,
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/<%= path %>/tsconfig.spec.json',
    },
  },
};
