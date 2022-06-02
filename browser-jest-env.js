'use strict';

const JsDomEnv = require('jest-environment-jsdom');
const { TextDecoder, TextEncoder } = require('util');
class MyEnvironment extends JsDomEnv {
  constructor(config) {
    super(
      Object.assign({}, config, {
        globals: Object.assign({}, config.globals, {
          Uint8Array,
          TextDecoder,
          TextEncoder,
          setImmediate: null,
          clearImmediate: null,
        }),
      })
    );
  }
}

module.exports = MyEnvironment;
