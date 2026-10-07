const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../lib/errors.ts');
const source = fs.readFileSync(filename, 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(javascript, filename);

const { getErrorMessage } = compiled.exports;
assert.equal(getErrorMessage({ message: 'QRIS_NOT_READY' }), 'QRIS_NOT_READY');
assert.equal(getErrorMessage(new Error('x')), 'x');
assert.equal(getErrorMessage('plain string'), 'plain string');
assert.equal(getErrorMessage(null), 'null');
console.log('getErrorMessage checks passed.');
