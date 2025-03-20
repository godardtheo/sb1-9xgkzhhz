// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add support for CJS/MJS files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Configure watchman to ignore node_modules
config.watchFolders = [path.resolve(__dirname)];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Optimize Metro for development
config.maxWorkers = 4;
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: false,
};

module.exports = config;