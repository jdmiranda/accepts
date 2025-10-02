/*!
 * accepts - Benchmarks
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

var accepts = require('./index.js')
var Benchmark = require('benchmark')

var suite = new Benchmark.Suite()

// Create test requests
var reqWithAccept = {
  headers: {
    accept: 'application/json, text/html, text/plain;q=0.5, application/xml;q=0.8'
  }
}

var reqWithAcceptLanguage = {
  headers: {
    'accept-language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7'
  }
}

var reqWithAcceptEncoding = {
  headers: {
    'accept-encoding': 'gzip, deflate, br'
  }
}

var reqWithAcceptCharset = {
  headers: {
    'accept-charset': 'utf-8, iso-8859-1;q=0.5'
  }
}

// Benchmark: Type negotiation - single type
suite.add('types() - single type', function () {
  var accept = accepts(reqWithAccept)
  accept.types('json')
})

// Benchmark: Type negotiation - multiple types
suite.add('types() - multiple types', function () {
  var accept = accepts(reqWithAccept)
  accept.types('html', 'json', 'xml', 'text')
})

// Benchmark: Type negotiation - array of types
suite.add('types() - array of types', function () {
  var accept = accepts(reqWithAccept)
  accept.types(['html', 'json', 'xml', 'text'])
})

// Benchmark: Type negotiation - cache hit
suite.add('types() - cache hit (repeated call)', function () {
  var accept = accepts(reqWithAccept)
  accept.types('html', 'json', 'xml')
  accept.types('html', 'json', 'xml')
  accept.types('html', 'json', 'xml')
})

// Benchmark: Language negotiation
suite.add('languages() - multiple languages', function () {
  var accept = accepts(reqWithAcceptLanguage)
  accept.languages('en', 'es', 'fr', 'de')
})

// Benchmark: Language negotiation - cache hit
suite.add('languages() - cache hit', function () {
  var accept = accepts(reqWithAcceptLanguage)
  accept.languages('en', 'es', 'fr')
  accept.languages('en', 'es', 'fr')
})

// Benchmark: Encoding negotiation
suite.add('encodings() - multiple encodings', function () {
  var accept = accepts(reqWithAcceptEncoding)
  accept.encodings('gzip', 'deflate', 'identity')
})

// Benchmark: Encoding negotiation - cache hit
suite.add('encodings() - cache hit', function () {
  var accept = accepts(reqWithAcceptEncoding)
  accept.encodings('gzip', 'deflate')
  accept.encodings('gzip', 'deflate')
})

// Benchmark: Charset negotiation
suite.add('charsets() - multiple charsets', function () {
  var accept = accepts(reqWithAcceptCharset)
  accept.charsets('utf-8', 'iso-8859-1', 'ascii')
})

// Benchmark: Charset negotiation - cache hit
suite.add('charsets() - cache hit', function () {
  var accept = accepts(reqWithAcceptCharset)
  accept.charsets('utf-8', 'iso-8859-1')
  accept.charsets('utf-8', 'iso-8859-1')
})

// Benchmark: Mixed workload (realistic scenario)
suite.add('mixed workload', function () {
  var accept1 = accepts(reqWithAccept)
  accept1.types('json', 'html')

  var accept2 = accepts(reqWithAcceptLanguage)
  accept2.languages('en', 'es')

  var accept3 = accepts(reqWithAcceptEncoding)
  accept3.encodings('gzip', 'deflate')

  var accept4 = accepts(reqWithAcceptCharset)
  accept4.charsets('utf-8', 'iso-8859-1')
})

// Run benchmarks
suite
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('\nBenchmark complete!')
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
  .run({ async: false })
