// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Ensure proper resolution of dependencies
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true; // Disable hierarchical lookup to prevent resolution issues
config.resolver.useWatchman = false; // Disable watchman to prevent memory issues

// Add support for native modules
config.resolver.assetExts = [...config.resolver.assetExts, 'db', 'sqlite'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Optimize Metro for memory usage
config.maxWorkers = 2;
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: false,
};

// Clear cache on start
config.resetCache = true;

module.exports = config;