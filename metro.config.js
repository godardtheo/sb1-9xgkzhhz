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

// Prioritize 'react-native', then 'browser', then 'main' for package resolution
config.resolver.resolverMainFields = [
  'react-native',
  'browser',
  'main',
];

// Add support for native modules
config.resolver.assetExts = [...config.resolver.assetExts, 'db', 'sqlite'];
// Assurer que les extensions par défaut + mjs/cjs sont incluses
const defaultSourceExts = require('metro-config/src/defaults/defaults').sourceExts;
config.resolver.sourceExts = [...defaultSourceExts, 'mjs', 'cjs'];

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