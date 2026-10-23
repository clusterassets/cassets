'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { discover } = require('../../src/modules/architecture-core');
const { analyzeFile, classify } = require('../../src/modules/architecture-analyzers');

test('mixed-language graph retains evidence and does not pretend external references are local', () => {
  const result = discover({
    'web/app.ts': "import x from './service';",
    'web/service.ts': '',
    'api/main.py': 'from . import handlers\nimport requests',
    'api/handlers.py': '',
    'worker/main.go': 'import "net/http"',
    'native/lib.rs': 'use std::collections::HashMap;',
    'infra/main.tf': 'resource "aws_s3_bucket" "data" {}',
    'compose.yaml': 'services:\n  api:\n    image: node'
  });
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].evidence.analyzer, 'javascript');
  assert.equal(result.coverage.python, 2);
  assert.equal(result.coverage.go, 1);
  assert.equal(result.coverage.rust, 1);
  assert.equal(result.coverage.infrastructure, 1);
  assert.equal(result.coverage.manifest, 1);
  assert.ok(result.external.some(x => x.specifier === 'requests'));
});
test('analyzer registry recognizes Java, .NET, C/C++ and SQL without fabricating local edges', () => {
  assert.equal(analyzeFile('App.java', 'import java.util.List;').references[0].specifier, 'java.util.List');
  assert.equal(analyzeFile('App.cs', 'using System.Text;').references[0].specifier, 'System.Text');
  assert.equal(analyzeFile('main.cpp', '#include "engine.h"').references[0].specifier, 'engine.h');
  assert.equal(analyzeFile('schema.sql', 'FOREIGN KEY (id) REFERENCES customers(id)').references[0].specifier, 'customers');
  assert.equal(classify('docker-compose.yaml'), 'manifest');
  assert.equal(classify('custom.xyz'), 'unsupported');
});
