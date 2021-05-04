const baseConfig = require('../../jest.config');

module.exports = {
  ...baseConfig,
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/<%= path %>/tsconfig.spec.json',
    },
  },
};
