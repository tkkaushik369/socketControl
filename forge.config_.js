/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const customConfigPath = path.resolve(__dirname, './dist/ForgeConfig/forge.config.js');
const customConfig = require(customConfigPath);
module.exports = customConfig;
