const assert = require ( 'node:assert/strict' );
const {test} = require ( 'node:test' );
const vm = require ( 'node:vm' );
const path = require ( 'node:path' );
const {buildSync} = require ( 'esbuild' );

const source = buildSync ({
  entryPoints: [path.join ( __dirname, '../src/utils.ts' )],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['vscode', 'vscode-extras'],
  write: false
}).outputFiles[0].text;

let config;
const exportsModule = {exports: {}};
vm.runInNewContext ( source, {
  module: exportsModule,
  exports: exportsModule.exports,
  process,
  require: name => {
    if ( name === 'vscode' ) return {window: {}, workspace: {getConfiguration: () => ({get: () => undefined})}};
    if ( name === 'vscode-extras' ) return {
      getActiveFilePath: () => undefined,
      getProjectRootPath: () => '/workspace',
      getProjectRootPaths: () => ['/workspace'],
      getConfig: () => config
    };
    return require ( name );
  }
});

test ( 'dynamic title defaults are inherited, with explicit terminal overrides', () => {
  const {getGroupFromUnknown, getGroupsFromInternalConfig} = exportsModule.exports;
  for ( const [setting, expected] of [[undefined, false], [false, false], [true, true], ['true', false]] ) {
    config = {
      dynamicTitle: setting,
      terminals: [
        {name: 'inherited'},
        {name: 'static', dynamicTitle: false},
        {name: 'dynamic', dynamicTitle: true},
        {name: 'invalid', dynamicTitle: 'false'}
      ]
    };
    for ( const group of [getGroupFromUnknown ( config ), getGroupsFromInternalConfig ()[0]] ) {
      assert.equal ( group.dynamicTitle, expected );
      assert.deepEqual ( Array.from ( group.terminals, terminal => terminal.dynamicTitle ), [expected, false, true, expected] );
    }
  }
});
