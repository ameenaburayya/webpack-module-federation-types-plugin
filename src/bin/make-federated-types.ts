#!/usr/bin/env node

import path from 'path';

import parseArgs from 'minimist';

import {
  DEFAULT_DIR_DIST, DEFAULT_DIR_EMITTED_TYPES, DEFAULT_DIR_GLOBAL_TYPES, TS_CONFIG_FILE,
} from '../constants';
import {
  compileTypes, rewritePathsWithExposedFederatedModules,
} from '../compileTypes';
import { setLogger } from '../helpers';
import { FederationConfig } from '../models';

import {
  assertRunningFromRoot, getFederationConfig, getOptionsFromWebpackConfig,
} from './helpers';

assertRunningFromRoot();

type Argv = {
  'global-types': string,
  'federation-config'?: string,
  'output-types-folder': string,
  'tsconfig': string,
  'webpack-config'?: string,
}

const argv = parseArgs<Argv>(process.argv.slice(2), {
  alias: {
    'global-types': 'g',
    'output-types-folder': 'o',
    'federation-config': 'c',
    tsconfig: 't',
  } as Partial<Argv>,
});

const webpackConfigPath = argv['webpack-config'] || 'webpack.config.js';
const federationConfig = webpackConfigPath
  ? getOptionsFromWebpackConfig(webpackConfigPath).mfPluginOptions as unknown as FederationConfig
  : getFederationConfig(argv['federation-config']);
const compileFiles = Object.values(federationConfig.exposes);

const outDir = argv['output-types-folder'] || path.join(DEFAULT_DIR_DIST, DEFAULT_DIR_EMITTED_TYPES);
const outFile = path.join(outDir, 'index.d.ts');
const dirGlobalTypes = argv['global-types'] || DEFAULT_DIR_GLOBAL_TYPES;
const tsconfigPath = argv.tsconfig || TS_CONFIG_FILE;

console.log(`Emitting types for ${compileFiles.length} exposed module(s)`);

setLogger(console);

const { isSuccess, typeDefinitions } = compileTypes(
  tsconfigPath,
  compileFiles,
  outFile,
  dirGlobalTypes,
);

if (!isSuccess) {
  process.exit(1);
}

console.log('Replacing paths with names of exposed federate modules in typings file:', outFile);

rewritePathsWithExposedFederatedModules(federationConfig, outFile, typeDefinitions);
