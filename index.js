/*!
 * accepts
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 * @private
 */

var Negotiator = require('negotiator')
var mime = require('mime-types')

/**
 * Module exports.
 * @public
 */

module.exports = Accepts

/**
 * Optimization: Cache for negotiation results
 * @private
 */
var negotiationCache = new Map()
var CACHE_SIZE_LIMIT = 1000

/**
 * Optimization: Cache for mime type lookups
 * @private
 */
var mimeCache = new Map()

/**
 * Create a new Accepts object for the given req.
 *
 * @param {object} req
 * @public
 */

function Accepts (req) {
  if (!(this instanceof Accepts)) {
    return new Accepts(req)
  }

  this.headers = req.headers
  this.negotiator = new Negotiator(req)
}

/**
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single mime type string
 * such as "application/json", the extension name
 * such as "json" or an array `["json", "html", "text/plain"]`. When a list
 * or array is given the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     this.types('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     this.types('html');
 *     // => "html"
 *     this.types('text/html');
 *     // => "text/html"
 *     this.types('json', 'text');
 *     // => "json"
 *     this.types('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     this.types('image/png');
 *     this.types('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     this.types(['html', 'json']);
 *     this.types('html', 'json');
 *     // => "json"
 *
 * @param {String|Array} types...
 * @return {String|Array|Boolean}
 * @public
 */

Accepts.prototype.type =
Accepts.prototype.types = function (types_) {
  var types = types_

  // support flattened arguments
  if (types && !Array.isArray(types)) {
    types = new Array(arguments.length)
    for (var i = 0; i < types.length; i++) {
      types[i] = arguments[i]
    }
  }

  // no types, return all requested types
  if (!types || types.length === 0) {
    return this.negotiator.mediaTypes()
  }

  // Optimization: Fast path for no accept header
  if (!this.headers.accept) {
    return types[0]
  }

  // Optimization: Single type fast path
  if (types.length === 1) {
    var singleMime = extToMimeCached(types[0])
    if (!validMime(singleMime)) {
      return false
    }
    var singleResult = this.negotiator.mediaTypes([singleMime])
    return singleResult[0] ? types[0] : false
  }

  // Optimization: Check cache for this combination
  var cacheKey = this.headers.accept + '|' + types.join(',')
  var cached = negotiationCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  // Optimization: Use Map for faster mime lookups
  var mimeMap = new Map()
  var mimes = []
  for (var i = 0; i < types.length; i++) {
    var type = types[i]
    var mimeType = extToMimeCached(type)
    if (validMime(mimeType)) {
      mimes.push(mimeType)
      mimeMap.set(mimeType, type)
    }
  }

  var accepts = this.negotiator.mediaTypes(mimes)
  var first = accepts[0]
  var result = first ? mimeMap.get(first) : false

  // Optimization: Cache the result
  if (negotiationCache.size >= CACHE_SIZE_LIMIT) {
    // Simple cache eviction: clear oldest entries
    var keys = negotiationCache.keys()
    for (var j = 0; j < 100; j++) {
      negotiationCache.delete(keys.next().value)
    }
  }
  negotiationCache.set(cacheKey, result)

  return result
}

/**
 * Return accepted encodings or best fit based on `encodings`.
 *
 * Given `Accept-Encoding: gzip, deflate`
 * an array sorted by quality is returned:
 *
 *     ['gzip', 'deflate']
 *
 * @param {String|Array} encodings...
 * @return {String|Array}
 * @public
 */

Accepts.prototype.encoding =
Accepts.prototype.encodings = function (encodings_) {
  var encodings = encodings_

  // support flattened arguments
  if (encodings && !Array.isArray(encodings)) {
    encodings = new Array(arguments.length)
    for (var i = 0; i < encodings.length; i++) {
      encodings[i] = arguments[i]
    }
  }

  // no encodings, return all requested encodings
  if (!encodings || encodings.length === 0) {
    return this.negotiator.encodings()
  }

  // Optimization: Check cache
  var header = this.headers['accept-encoding']
  if (header) {
    var cacheKey = 'enc:' + header + '|' + encodings.join(',')
    var cached = negotiationCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }
  }

  var result = this.negotiator.encodings(encodings)[0] || false

  // Optimization: Cache result
  if (header) {
    if (negotiationCache.size >= CACHE_SIZE_LIMIT) {
      clearCacheEntries()
    }
    negotiationCache.set(cacheKey, result)
  }

  return result
}

/**
 * Return accepted charsets or best fit based on `charsets`.
 *
 * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
 * an array sorted by quality is returned:
 *
 *     ['utf-8', 'utf-7', 'iso-8859-1']
 *
 * @param {String|Array} charsets...
 * @return {String|Array}
 * @public
 */

Accepts.prototype.charset =
Accepts.prototype.charsets = function (charsets_) {
  var charsets = charsets_

  // support flattened arguments
  if (charsets && !Array.isArray(charsets)) {
    charsets = new Array(arguments.length)
    for (var i = 0; i < charsets.length; i++) {
      charsets[i] = arguments[i]
    }
  }

  // no charsets, return all requested charsets
  if (!charsets || charsets.length === 0) {
    return this.negotiator.charsets()
  }

  // Optimization: Check cache
  var header = this.headers['accept-charset']
  if (header) {
    var cacheKey = 'chr:' + header + '|' + charsets.join(',')
    var cached = negotiationCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }
  }

  var result = this.negotiator.charsets(charsets)[0] || false

  // Optimization: Cache result
  if (header) {
    if (negotiationCache.size >= CACHE_SIZE_LIMIT) {
      clearCacheEntries()
    }
    negotiationCache.set(cacheKey, result)
  }

  return result
}

/**
 * Return accepted languages or best fit based on `langs`.
 *
 * Given `Accept-Language: en;q=0.8, es, pt`
 * an array sorted by quality is returned:
 *
 *     ['es', 'pt', 'en']
 *
 * @param {String|Array} langs...
 * @return {Array|String}
 * @public
 */

Accepts.prototype.lang =
Accepts.prototype.langs =
Accepts.prototype.language =
Accepts.prototype.languages = function (languages_) {
  var languages = languages_

  // support flattened arguments
  if (languages && !Array.isArray(languages)) {
    languages = new Array(arguments.length)
    for (var i = 0; i < languages.length; i++) {
      languages[i] = arguments[i]
    }
  }

  // no languages, return all requested languages
  if (!languages || languages.length === 0) {
    return this.negotiator.languages()
  }

  // Optimization: Check cache
  var header = this.headers['accept-language']
  if (header) {
    var cacheKey = 'lng:' + header + '|' + languages.join(',')
    var cached = negotiationCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }
  }

  var result = this.negotiator.languages(languages)[0] || false

  // Optimization: Cache result
  if (header) {
    if (negotiationCache.size >= CACHE_SIZE_LIMIT) {
      clearCacheEntries()
    }
    negotiationCache.set(cacheKey, result)
  }

  return result
}

/**
 * Convert extnames to mime with caching.
 *
 * @param {String} type
 * @return {String}
 * @private
 */

function extToMimeCached (type) {
  if (type.indexOf('/') !== -1) {
    return type
  }

  var cached = mimeCache.get(type)
  if (cached !== undefined) {
    return cached
  }

  var result = mime.lookup(type)
  mimeCache.set(type, result)
  return result
}

/**
 * Convert extnames to mime.
 *
 * @param {String} type
 * @return {String}
 * @private
 */

function extToMime (type) {
  return type.indexOf('/') === -1
    ? mime.lookup(type)
    : type
}

/**
 * Check if mime is valid.
 *
 * @param {String} type
 * @return {Boolean}
 * @private
 */

function validMime (type) {
  return typeof type === 'string'
}

/**
 * Clear cache entries to prevent unbounded growth.
 * @private
 */

function clearCacheEntries () {
  var keys = negotiationCache.keys()
  for (var i = 0; i < 100; i++) {
    var next = keys.next()
    if (next.done) break
    negotiationCache.delete(next.value)
  }
}
