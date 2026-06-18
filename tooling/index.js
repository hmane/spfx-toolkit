'use strict';

/**
 * spfx-toolkit build-time helpers (Node-only — NOT for runtime/web-part imports).
 *
 *   const customize = require('spfx-toolkit/tooling').customizeWebpack;
 *   // or
 *   const customize = require('spfx-toolkit/tooling/customize-webpack');
 */
module.exports = {
  customizeWebpack: require('./customize-webpack'),
};
