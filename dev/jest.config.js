/** @type {import('ts-jest').JestConfigWithTsJest} **/
const esModules = [
  'file-type',
  'strtok3',
  'readable-web-to-node-stream',
  'token-types',
  'peek-readable',
  'locate-path',
  'p-locate',
  'p-limit',
  'yocto-queue',
  'unicorn-magic',
  'path-exists',
  'qs-esm',
  'uint8array-extras',
  // payload
  'payload'
].join('|')

export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: [
    `/node_modules/(?!.pnpm)(?!(${esModules})/)`,
    `/node_modules/.pnpm/(?!(${esModules.replace(/\//g, '\\+')})@)`,
    `../node_modules/(?!.pnpm)(?!(${esModules})/)`,
    `../node_modules/.pnpm/(?!(${esModules.replace(/\//g, '\\+')})@)`,
  ]
};
