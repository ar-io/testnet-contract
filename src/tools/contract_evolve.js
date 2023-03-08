(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __markAsModule = (target) =>
    __defProp(target, '__esModule', { value: true });
  var __commonJS = (cb, mod) =>
    function __require() {
      return (
        mod ||
          (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod),
        mod.exports
      );
    };
  var __reExport = (target, module, desc) => {
    if (
      (module && typeof module === 'object') ||
      typeof module === 'function'
    ) {
      for (let key of __getOwnPropNames(module))
        if (!__hasOwnProp.call(target, key) && key !== 'default')
          __defProp(target, key, {
            get: () => module[key],
            enumerable:
              !(desc = __getOwnPropDesc(module, key)) || desc.enumerable,
          });
    }
    return target;
  };
  var __toModule = (module) => {
    return __reExport(
      __markAsModule(
        __defProp(
          module != null ? __create(__getProtoOf(module)) : {},
          'default',
          module && module.__esModule && 'default' in module
            ? { get: () => module.default, enumerable: true }
            : { value: module, enumerable: true },
        ),
      ),
      module,
    );
  };

  // node_modules/axios/lib/helpers/bind.js
  var require_bind = __commonJS({
    'node_modules/axios/lib/helpers/bind.js'(exports, module) {
      'use strict';
      module.exports = function bind(fn, thisArg) {
        return function wrap() {
          var args = new Array(arguments.length);
          for (var i = 0; i < args.length; i++) {
            args[i] = arguments[i];
          }
          return fn.apply(thisArg, args);
        };
      };
    },
  });

  // node_modules/axios/lib/utils.js
  var require_utils = __commonJS({
    'node_modules/axios/lib/utils.js'(exports, module) {
      'use strict';
      var bind = require_bind();
      var toString = Object.prototype.toString;
      function isArray(val) {
        return Array.isArray(val);
      }
      function isUndefined(val) {
        return typeof val === 'undefined';
      }
      function isBuffer(val) {
        return (
          val !== null &&
          !isUndefined(val) &&
          val.constructor !== null &&
          !isUndefined(val.constructor) &&
          typeof val.constructor.isBuffer === 'function' &&
          val.constructor.isBuffer(val)
        );
      }
      function isArrayBuffer(val) {
        return toString.call(val) === '[object ArrayBuffer]';
      }
      function isFormData(val) {
        return toString.call(val) === '[object FormData]';
      }
      function isArrayBufferView(val) {
        var result;
        if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
          result = ArrayBuffer.isView(val);
        } else {
          result = val && val.buffer && isArrayBuffer(val.buffer);
        }
        return result;
      }
      function isString(val) {
        return typeof val === 'string';
      }
      function isNumber(val) {
        return typeof val === 'number';
      }
      function isObject(val) {
        return val !== null && typeof val === 'object';
      }
      function isPlainObject(val) {
        if (toString.call(val) !== '[object Object]') {
          return false;
        }
        var prototype = Object.getPrototypeOf(val);
        return prototype === null || prototype === Object.prototype;
      }
      function isDate(val) {
        return toString.call(val) === '[object Date]';
      }
      function isFile(val) {
        return toString.call(val) === '[object File]';
      }
      function isBlob(val) {
        return toString.call(val) === '[object Blob]';
      }
      function isFunction(val) {
        return toString.call(val) === '[object Function]';
      }
      function isStream(val) {
        return isObject(val) && isFunction(val.pipe);
      }
      function isURLSearchParams(val) {
        return toString.call(val) === '[object URLSearchParams]';
      }
      function trim(str) {
        return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
      }
      function isStandardBrowserEnv() {
        if (
          typeof navigator !== 'undefined' &&
          (navigator.product === 'ReactNative' ||
            navigator.product === 'NativeScript' ||
            navigator.product === 'NS')
        ) {
          return false;
        }
        return typeof window !== 'undefined' && typeof document !== 'undefined';
      }
      function forEach(obj, fn) {
        if (obj === null || typeof obj === 'undefined') {
          return;
        }
        if (typeof obj !== 'object') {
          obj = [obj];
        }
        if (isArray(obj)) {
          for (var i = 0, l = obj.length; i < l; i++) {
            fn.call(null, obj[i], i, obj);
          }
        } else {
          for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              fn.call(null, obj[key], key, obj);
            }
          }
        }
      }
      function merge() {
        var result = {};
        function assignValue(val, key) {
          if (isPlainObject(result[key]) && isPlainObject(val)) {
            result[key] = merge(result[key], val);
          } else if (isPlainObject(val)) {
            result[key] = merge({}, val);
          } else if (isArray(val)) {
            result[key] = val.slice();
          } else {
            result[key] = val;
          }
        }
        for (var i = 0, l = arguments.length; i < l; i++) {
          forEach(arguments[i], assignValue);
        }
        return result;
      }
      function extend(a, b, thisArg) {
        forEach(b, function assignValue(val, key) {
          if (thisArg && typeof val === 'function') {
            a[key] = bind(val, thisArg);
          } else {
            a[key] = val;
          }
        });
        return a;
      }
      function stripBOM(content) {
        if (content.charCodeAt(0) === 65279) {
          content = content.slice(1);
        }
        return content;
      }
      module.exports = {
        isArray,
        isArrayBuffer,
        isBuffer,
        isFormData,
        isArrayBufferView,
        isString,
        isNumber,
        isObject,
        isPlainObject,
        isUndefined,
        isDate,
        isFile,
        isBlob,
        isFunction,
        isStream,
        isURLSearchParams,
        isStandardBrowserEnv,
        forEach,
        merge,
        extend,
        trim,
        stripBOM,
      };
    },
  });

  // node_modules/axios/lib/helpers/buildURL.js
  var require_buildURL = __commonJS({
    'node_modules/axios/lib/helpers/buildURL.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      function encode(val) {
        return encodeURIComponent(val)
          .replace(/%3A/gi, ':')
          .replace(/%24/g, '$')
          .replace(/%2C/gi, ',')
          .replace(/%20/g, '+')
          .replace(/%5B/gi, '[')
          .replace(/%5D/gi, ']');
      }
      module.exports = function buildURL(url, params, paramsSerializer) {
        if (!params) {
          return url;
        }
        var serializedParams;
        if (paramsSerializer) {
          serializedParams = paramsSerializer(params);
        } else if (utils.isURLSearchParams(params)) {
          serializedParams = params.toString();
        } else {
          var parts = [];
          utils.forEach(params, function serialize(val, key) {
            if (val === null || typeof val === 'undefined') {
              return;
            }
            if (utils.isArray(val)) {
              key = key + '[]';
            } else {
              val = [val];
            }
            utils.forEach(val, function parseValue(v) {
              if (utils.isDate(v)) {
                v = v.toISOString();
              } else if (utils.isObject(v)) {
                v = JSON.stringify(v);
              }
              parts.push(encode(key) + '=' + encode(v));
            });
          });
          serializedParams = parts.join('&');
        }
        if (serializedParams) {
          var hashmarkIndex = url.indexOf('#');
          if (hashmarkIndex !== -1) {
            url = url.slice(0, hashmarkIndex);
          }
          url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
        }
        return url;
      };
    },
  });

  // node_modules/axios/lib/core/InterceptorManager.js
  var require_InterceptorManager = __commonJS({
    'node_modules/axios/lib/core/InterceptorManager.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      function InterceptorManager() {
        this.handlers = [];
      }
      InterceptorManager.prototype.use = function use(
        fulfilled,
        rejected,
        options,
      ) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null,
        });
        return this.handlers.length - 1;
      };
      InterceptorManager.prototype.eject = function eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      };
      InterceptorManager.prototype.forEach = function forEach(fn) {
        utils.forEach(this.handlers, function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        });
      };
      module.exports = InterceptorManager;
    },
  });

  // node_modules/axios/lib/helpers/normalizeHeaderName.js
  var require_normalizeHeaderName = __commonJS({
    'node_modules/axios/lib/helpers/normalizeHeaderName.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      module.exports = function normalizeHeaderName(headers, normalizedName) {
        utils.forEach(headers, function processHeader(value, name) {
          if (
            name !== normalizedName &&
            name.toUpperCase() === normalizedName.toUpperCase()
          ) {
            headers[normalizedName] = value;
            delete headers[name];
          }
        });
      };
    },
  });

  // node_modules/axios/lib/core/enhanceError.js
  var require_enhanceError = __commonJS({
    'node_modules/axios/lib/core/enhanceError.js'(exports, module) {
      'use strict';
      module.exports = function enhanceError(
        error,
        config,
        code,
        request,
        response,
      ) {
        error.config = config;
        if (code) {
          error.code = code;
        }
        error.request = request;
        error.response = response;
        error.isAxiosError = true;
        error.toJSON = function toJSON() {
          return {
            message: this.message,
            name: this.name,
            description: this.description,
            number: this.number,
            fileName: this.fileName,
            lineNumber: this.lineNumber,
            columnNumber: this.columnNumber,
            stack: this.stack,
            config: this.config,
            code: this.code,
            status:
              this.response && this.response.status
                ? this.response.status
                : null,
          };
        };
        return error;
      };
    },
  });

  // node_modules/axios/lib/defaults/transitional.js
  var require_transitional = __commonJS({
    'node_modules/axios/lib/defaults/transitional.js'(exports, module) {
      'use strict';
      module.exports = {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false,
      };
    },
  });

  // node_modules/axios/lib/core/createError.js
  var require_createError = __commonJS({
    'node_modules/axios/lib/core/createError.js'(exports, module) {
      'use strict';
      var enhanceError = require_enhanceError();
      module.exports = function createError(
        message,
        config,
        code,
        request,
        response,
      ) {
        var error = new Error(message);
        return enhanceError(error, config, code, request, response);
      };
    },
  });

  // node_modules/axios/lib/core/settle.js
  var require_settle = __commonJS({
    'node_modules/axios/lib/core/settle.js'(exports, module) {
      'use strict';
      var createError = require_createError();
      module.exports = function settle(resolve, reject, response) {
        var validateStatus = response.config.validateStatus;
        if (
          !response.status ||
          !validateStatus ||
          validateStatus(response.status)
        ) {
          resolve(response);
        } else {
          reject(
            createError(
              'Request failed with status code ' + response.status,
              response.config,
              null,
              response.request,
              response,
            ),
          );
        }
      };
    },
  });

  // node_modules/axios/lib/helpers/cookies.js
  var require_cookies = __commonJS({
    'node_modules/axios/lib/helpers/cookies.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      module.exports = utils.isStandardBrowserEnv()
        ? (function standardBrowserEnv() {
            return {
              write: function write(
                name,
                value,
                expires,
                path,
                domain,
                secure,
              ) {
                var cookie = [];
                cookie.push(name + '=' + encodeURIComponent(value));
                if (utils.isNumber(expires)) {
                  cookie.push('expires=' + new Date(expires).toGMTString());
                }
                if (utils.isString(path)) {
                  cookie.push('path=' + path);
                }
                if (utils.isString(domain)) {
                  cookie.push('domain=' + domain);
                }
                if (secure === true) {
                  cookie.push('secure');
                }
                document.cookie = cookie.join('; ');
              },
              read: function read(name) {
                var match = document.cookie.match(
                  new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'),
                );
                return match ? decodeURIComponent(match[3]) : null;
              },
              remove: function remove(name) {
                this.write(name, '', Date.now() - 864e5);
              },
            };
          })()
        : (function nonStandardBrowserEnv() {
            return {
              write: function write() {},
              read: function read() {
                return null;
              },
              remove: function remove() {},
            };
          })();
    },
  });

  // node_modules/axios/lib/helpers/isAbsoluteURL.js
  var require_isAbsoluteURL = __commonJS({
    'node_modules/axios/lib/helpers/isAbsoluteURL.js'(exports, module) {
      'use strict';
      module.exports = function isAbsoluteURL(url) {
        return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
      };
    },
  });

  // node_modules/axios/lib/helpers/combineURLs.js
  var require_combineURLs = __commonJS({
    'node_modules/axios/lib/helpers/combineURLs.js'(exports, module) {
      'use strict';
      module.exports = function combineURLs(baseURL, relativeURL) {
        return relativeURL
          ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
          : baseURL;
      };
    },
  });

  // node_modules/axios/lib/core/buildFullPath.js
  var require_buildFullPath = __commonJS({
    'node_modules/axios/lib/core/buildFullPath.js'(exports, module) {
      'use strict';
      var isAbsoluteURL = require_isAbsoluteURL();
      var combineURLs = require_combineURLs();
      module.exports = function buildFullPath(baseURL, requestedURL) {
        if (baseURL && !isAbsoluteURL(requestedURL)) {
          return combineURLs(baseURL, requestedURL);
        }
        return requestedURL;
      };
    },
  });

  // node_modules/axios/lib/helpers/parseHeaders.js
  var require_parseHeaders = __commonJS({
    'node_modules/axios/lib/helpers/parseHeaders.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var ignoreDuplicateOf = [
        'age',
        'authorization',
        'content-length',
        'content-type',
        'etag',
        'expires',
        'from',
        'host',
        'if-modified-since',
        'if-unmodified-since',
        'last-modified',
        'location',
        'max-forwards',
        'proxy-authorization',
        'referer',
        'retry-after',
        'user-agent',
      ];
      module.exports = function parseHeaders(headers) {
        var parsed = {};
        var key;
        var val;
        var i;
        if (!headers) {
          return parsed;
        }
        utils.forEach(headers.split('\n'), function parser(line) {
          i = line.indexOf(':');
          key = utils.trim(line.substr(0, i)).toLowerCase();
          val = utils.trim(line.substr(i + 1));
          if (key) {
            if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
              return;
            }
            if (key === 'set-cookie') {
              parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
            } else {
              parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
            }
          }
        });
        return parsed;
      };
    },
  });

  // node_modules/axios/lib/helpers/isURLSameOrigin.js
  var require_isURLSameOrigin = __commonJS({
    'node_modules/axios/lib/helpers/isURLSameOrigin.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      module.exports = utils.isStandardBrowserEnv()
        ? (function standardBrowserEnv() {
            var msie = /(msie|trident)/i.test(navigator.userAgent);
            var urlParsingNode = document.createElement('a');
            var originURL;
            function resolveURL(url) {
              var href = url;
              if (msie) {
                urlParsingNode.setAttribute('href', href);
                href = urlParsingNode.href;
              }
              urlParsingNode.setAttribute('href', href);
              return {
                href: urlParsingNode.href,
                protocol: urlParsingNode.protocol
                  ? urlParsingNode.protocol.replace(/:$/, '')
                  : '',
                host: urlParsingNode.host,
                search: urlParsingNode.search
                  ? urlParsingNode.search.replace(/^\?/, '')
                  : '',
                hash: urlParsingNode.hash
                  ? urlParsingNode.hash.replace(/^#/, '')
                  : '',
                hostname: urlParsingNode.hostname,
                port: urlParsingNode.port,
                pathname:
                  urlParsingNode.pathname.charAt(0) === '/'
                    ? urlParsingNode.pathname
                    : '/' + urlParsingNode.pathname,
              };
            }
            originURL = resolveURL(window.location.href);
            return function isURLSameOrigin(requestURL) {
              var parsed = utils.isString(requestURL)
                ? resolveURL(requestURL)
                : requestURL;
              return (
                parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host
              );
            };
          })()
        : (function nonStandardBrowserEnv() {
            return function isURLSameOrigin() {
              return true;
            };
          })();
    },
  });

  // node_modules/axios/lib/cancel/Cancel.js
  var require_Cancel = __commonJS({
    'node_modules/axios/lib/cancel/Cancel.js'(exports, module) {
      'use strict';
      function Cancel(message) {
        this.message = message;
      }
      Cancel.prototype.toString = function toString() {
        return 'Cancel' + (this.message ? ': ' + this.message : '');
      };
      Cancel.prototype.__CANCEL__ = true;
      module.exports = Cancel;
    },
  });

  // node_modules/axios/lib/adapters/xhr.js
  var require_xhr = __commonJS({
    'node_modules/axios/lib/adapters/xhr.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var settle = require_settle();
      var cookies = require_cookies();
      var buildURL = require_buildURL();
      var buildFullPath = require_buildFullPath();
      var parseHeaders = require_parseHeaders();
      var isURLSameOrigin = require_isURLSameOrigin();
      var createError = require_createError();
      var transitionalDefaults = require_transitional();
      var Cancel = require_Cancel();
      module.exports = function xhrAdapter(config) {
        return new Promise(function dispatchXhrRequest(resolve, reject) {
          var requestData = config.data;
          var requestHeaders = config.headers;
          var responseType = config.responseType;
          var onCanceled;
          function done() {
            if (config.cancelToken) {
              config.cancelToken.unsubscribe(onCanceled);
            }
            if (config.signal) {
              config.signal.removeEventListener('abort', onCanceled);
            }
          }
          if (utils.isFormData(requestData)) {
            delete requestHeaders['Content-Type'];
          }
          var request = new XMLHttpRequest();
          if (config.auth) {
            var username = config.auth.username || '';
            var password = config.auth.password
              ? unescape(encodeURIComponent(config.auth.password))
              : '';
            requestHeaders.Authorization =
              'Basic ' + btoa(username + ':' + password);
          }
          var fullPath = buildFullPath(config.baseURL, config.url);
          request.open(
            config.method.toUpperCase(),
            buildURL(fullPath, config.params, config.paramsSerializer),
            true,
          );
          request.timeout = config.timeout;
          function onloadend() {
            if (!request) {
              return;
            }
            var responseHeaders =
              'getAllResponseHeaders' in request
                ? parseHeaders(request.getAllResponseHeaders())
                : null;
            var responseData =
              !responseType ||
              responseType === 'text' ||
              responseType === 'json'
                ? request.responseText
                : request.response;
            var response = {
              data: responseData,
              status: request.status,
              statusText: request.statusText,
              headers: responseHeaders,
              config,
              request,
            };
            settle(
              function _resolve(value) {
                resolve(value);
                done();
              },
              function _reject(err) {
                reject(err);
                done();
              },
              response,
            );
            request = null;
          }
          if ('onloadend' in request) {
            request.onloadend = onloadend;
          } else {
            request.onreadystatechange = function handleLoad() {
              if (!request || request.readyState !== 4) {
                return;
              }
              if (
                request.status === 0 &&
                !(
                  request.responseURL &&
                  request.responseURL.indexOf('file:') === 0
                )
              ) {
                return;
              }
              setTimeout(onloadend);
            };
          }
          request.onabort = function handleAbort() {
            if (!request) {
              return;
            }
            reject(
              createError('Request aborted', config, 'ECONNABORTED', request),
            );
            request = null;
          };
          request.onerror = function handleError() {
            reject(createError('Network Error', config, null, request));
            request = null;
          };
          request.ontimeout = function handleTimeout() {
            var timeoutErrorMessage = config.timeout
              ? 'timeout of ' + config.timeout + 'ms exceeded'
              : 'timeout exceeded';
            var transitional = config.transitional || transitionalDefaults;
            if (config.timeoutErrorMessage) {
              timeoutErrorMessage = config.timeoutErrorMessage;
            }
            reject(
              createError(
                timeoutErrorMessage,
                config,
                transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
                request,
              ),
            );
            request = null;
          };
          if (utils.isStandardBrowserEnv()) {
            var xsrfValue =
              (config.withCredentials || isURLSameOrigin(fullPath)) &&
              config.xsrfCookieName
                ? cookies.read(config.xsrfCookieName)
                : void 0;
            if (xsrfValue) {
              requestHeaders[config.xsrfHeaderName] = xsrfValue;
            }
          }
          if ('setRequestHeader' in request) {
            utils.forEach(requestHeaders, function setRequestHeader(val, key) {
              if (
                typeof requestData === 'undefined' &&
                key.toLowerCase() === 'content-type'
              ) {
                delete requestHeaders[key];
              } else {
                request.setRequestHeader(key, val);
              }
            });
          }
          if (!utils.isUndefined(config.withCredentials)) {
            request.withCredentials = !!config.withCredentials;
          }
          if (responseType && responseType !== 'json') {
            request.responseType = config.responseType;
          }
          if (typeof config.onDownloadProgress === 'function') {
            request.addEventListener('progress', config.onDownloadProgress);
          }
          if (typeof config.onUploadProgress === 'function' && request.upload) {
            request.upload.addEventListener(
              'progress',
              config.onUploadProgress,
            );
          }
          if (config.cancelToken || config.signal) {
            onCanceled = function (cancel) {
              if (!request) {
                return;
              }
              reject(
                !cancel || (cancel && cancel.type)
                  ? new Cancel('canceled')
                  : cancel,
              );
              request.abort();
              request = null;
            };
            config.cancelToken && config.cancelToken.subscribe(onCanceled);
            if (config.signal) {
              config.signal.aborted
                ? onCanceled()
                : config.signal.addEventListener('abort', onCanceled);
            }
          }
          if (!requestData) {
            requestData = null;
          }
          request.send(requestData);
        });
      };
    },
  });

  // node_modules/axios/lib/defaults/index.js
  var require_defaults = __commonJS({
    'node_modules/axios/lib/defaults/index.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var normalizeHeaderName = require_normalizeHeaderName();
      var enhanceError = require_enhanceError();
      var transitionalDefaults = require_transitional();
      var DEFAULT_CONTENT_TYPE = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      function setContentTypeIfUnset(headers, value) {
        if (
          !utils.isUndefined(headers) &&
          utils.isUndefined(headers['Content-Type'])
        ) {
          headers['Content-Type'] = value;
        }
      }
      function getDefaultAdapter() {
        var adapter;
        if (typeof XMLHttpRequest !== 'undefined') {
          adapter = require_xhr();
        } else if (
          typeof process !== 'undefined' &&
          Object.prototype.toString.call(process) === '[object process]'
        ) {
          adapter = require_xhr();
        }
        return adapter;
      }
      function stringifySafely(rawValue, parser, encoder) {
        if (utils.isString(rawValue)) {
          try {
            (parser || JSON.parse)(rawValue);
            return utils.trim(rawValue);
          } catch (e) {
            if (e.name !== 'SyntaxError') {
              throw e;
            }
          }
        }
        return (encoder || JSON.stringify)(rawValue);
      }
      var defaults = {
        transitional: transitionalDefaults,
        adapter: getDefaultAdapter(),
        transformRequest: [
          function transformRequest(data, headers) {
            normalizeHeaderName(headers, 'Accept');
            normalizeHeaderName(headers, 'Content-Type');
            if (
              utils.isFormData(data) ||
              utils.isArrayBuffer(data) ||
              utils.isBuffer(data) ||
              utils.isStream(data) ||
              utils.isFile(data) ||
              utils.isBlob(data)
            ) {
              return data;
            }
            if (utils.isArrayBufferView(data)) {
              return data.buffer;
            }
            if (utils.isURLSearchParams(data)) {
              setContentTypeIfUnset(
                headers,
                'application/x-www-form-urlencoded;charset=utf-8',
              );
              return data.toString();
            }
            if (
              utils.isObject(data) ||
              (headers && headers['Content-Type'] === 'application/json')
            ) {
              setContentTypeIfUnset(headers, 'application/json');
              return stringifySafely(data);
            }
            return data;
          },
        ],
        transformResponse: [
          function transformResponse(data) {
            var transitional = this.transitional || defaults.transitional;
            var silentJSONParsing =
              transitional && transitional.silentJSONParsing;
            var forcedJSONParsing =
              transitional && transitional.forcedJSONParsing;
            var strictJSONParsing =
              !silentJSONParsing && this.responseType === 'json';
            if (
              strictJSONParsing ||
              (forcedJSONParsing && utils.isString(data) && data.length)
            ) {
              try {
                return JSON.parse(data);
              } catch (e) {
                if (strictJSONParsing) {
                  if (e.name === 'SyntaxError') {
                    throw enhanceError(e, this, 'E_JSON_PARSE');
                  }
                  throw e;
                }
              }
            }
            return data;
          },
        ],
        timeout: 0,
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        maxContentLength: -1,
        maxBodyLength: -1,
        validateStatus: function validateStatus(status) {
          return status >= 200 && status < 300;
        },
        headers: {
          common: {
            Accept: 'application/json, text/plain, */*',
          },
        },
      };
      utils.forEach(
        ['delete', 'get', 'head'],
        function forEachMethodNoData(method) {
          defaults.headers[method] = {};
        },
      );
      utils.forEach(
        ['post', 'put', 'patch'],
        function forEachMethodWithData(method) {
          defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
        },
      );
      module.exports = defaults;
    },
  });

  // node_modules/axios/lib/core/transformData.js
  var require_transformData = __commonJS({
    'node_modules/axios/lib/core/transformData.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var defaults = require_defaults();
      module.exports = function transformData(data, headers, fns) {
        var context = this || defaults;
        utils.forEach(fns, function transform(fn) {
          data = fn.call(context, data, headers);
        });
        return data;
      };
    },
  });

  // node_modules/axios/lib/cancel/isCancel.js
  var require_isCancel = __commonJS({
    'node_modules/axios/lib/cancel/isCancel.js'(exports, module) {
      'use strict';
      module.exports = function isCancel(value) {
        return !!(value && value.__CANCEL__);
      };
    },
  });

  // node_modules/axios/lib/core/dispatchRequest.js
  var require_dispatchRequest = __commonJS({
    'node_modules/axios/lib/core/dispatchRequest.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var transformData = require_transformData();
      var isCancel = require_isCancel();
      var defaults = require_defaults();
      var Cancel = require_Cancel();
      function throwIfCancellationRequested(config) {
        if (config.cancelToken) {
          config.cancelToken.throwIfRequested();
        }
        if (config.signal && config.signal.aborted) {
          throw new Cancel('canceled');
        }
      }
      module.exports = function dispatchRequest(config) {
        throwIfCancellationRequested(config);
        config.headers = config.headers || {};
        config.data = transformData.call(
          config,
          config.data,
          config.headers,
          config.transformRequest,
        );
        config.headers = utils.merge(
          config.headers.common || {},
          config.headers[config.method] || {},
          config.headers,
        );
        utils.forEach(
          ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
          function cleanHeaderConfig(method) {
            delete config.headers[method];
          },
        );
        var adapter = config.adapter || defaults.adapter;
        return adapter(config).then(
          function onAdapterResolution(response) {
            throwIfCancellationRequested(config);
            response.data = transformData.call(
              config,
              response.data,
              response.headers,
              config.transformResponse,
            );
            return response;
          },
          function onAdapterRejection(reason) {
            if (!isCancel(reason)) {
              throwIfCancellationRequested(config);
              if (reason && reason.response) {
                reason.response.data = transformData.call(
                  config,
                  reason.response.data,
                  reason.response.headers,
                  config.transformResponse,
                );
              }
            }
            return Promise.reject(reason);
          },
        );
      };
    },
  });

  // node_modules/axios/lib/core/mergeConfig.js
  var require_mergeConfig = __commonJS({
    'node_modules/axios/lib/core/mergeConfig.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      module.exports = function mergeConfig(config1, config2) {
        config2 = config2 || {};
        var config = {};
        function getMergedValue(target, source) {
          if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
            return utils.merge(target, source);
          } else if (utils.isPlainObject(source)) {
            return utils.merge({}, source);
          } else if (utils.isArray(source)) {
            return source.slice();
          }
          return source;
        }
        function mergeDeepProperties(prop) {
          if (!utils.isUndefined(config2[prop])) {
            return getMergedValue(config1[prop], config2[prop]);
          } else if (!utils.isUndefined(config1[prop])) {
            return getMergedValue(void 0, config1[prop]);
          }
        }
        function valueFromConfig2(prop) {
          if (!utils.isUndefined(config2[prop])) {
            return getMergedValue(void 0, config2[prop]);
          }
        }
        function defaultToConfig2(prop) {
          if (!utils.isUndefined(config2[prop])) {
            return getMergedValue(void 0, config2[prop]);
          } else if (!utils.isUndefined(config1[prop])) {
            return getMergedValue(void 0, config1[prop]);
          }
        }
        function mergeDirectKeys(prop) {
          if (prop in config2) {
            return getMergedValue(config1[prop], config2[prop]);
          } else if (prop in config1) {
            return getMergedValue(void 0, config1[prop]);
          }
        }
        var mergeMap = {
          url: valueFromConfig2,
          method: valueFromConfig2,
          data: valueFromConfig2,
          baseURL: defaultToConfig2,
          transformRequest: defaultToConfig2,
          transformResponse: defaultToConfig2,
          paramsSerializer: defaultToConfig2,
          timeout: defaultToConfig2,
          timeoutMessage: defaultToConfig2,
          withCredentials: defaultToConfig2,
          adapter: defaultToConfig2,
          responseType: defaultToConfig2,
          xsrfCookieName: defaultToConfig2,
          xsrfHeaderName: defaultToConfig2,
          onUploadProgress: defaultToConfig2,
          onDownloadProgress: defaultToConfig2,
          decompress: defaultToConfig2,
          maxContentLength: defaultToConfig2,
          maxBodyLength: defaultToConfig2,
          transport: defaultToConfig2,
          httpAgent: defaultToConfig2,
          httpsAgent: defaultToConfig2,
          cancelToken: defaultToConfig2,
          socketPath: defaultToConfig2,
          responseEncoding: defaultToConfig2,
          validateStatus: mergeDirectKeys,
        };
        utils.forEach(
          Object.keys(config1).concat(Object.keys(config2)),
          function computeConfigValue(prop) {
            var merge = mergeMap[prop] || mergeDeepProperties;
            var configValue = merge(prop);
            (utils.isUndefined(configValue) && merge !== mergeDirectKeys) ||
              (config[prop] = configValue);
          },
        );
        return config;
      };
    },
  });

  // node_modules/axios/lib/env/data.js
  var require_data = __commonJS({
    'node_modules/axios/lib/env/data.js'(exports, module) {
      module.exports = {
        version: '0.26.1',
      };
    },
  });

  // node_modules/axios/lib/helpers/validator.js
  var require_validator = __commonJS({
    'node_modules/axios/lib/helpers/validator.js'(exports, module) {
      'use strict';
      var VERSION = require_data().version;
      var validators = {};
      ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(
        function (type, i) {
          validators[type] = function validator(thing) {
            return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
          };
        },
      );
      var deprecatedWarnings = {};
      validators.transitional = function transitional(
        validator,
        version,
        message,
      ) {
        function formatMessage(opt, desc) {
          return (
            '[Axios v' +
            VERSION +
            "] Transitional option '" +
            opt +
            "'" +
            desc +
            (message ? '. ' + message : '')
          );
        }
        return function (value, opt, opts) {
          if (validator === false) {
            throw new Error(
              formatMessage(
                opt,
                ' has been removed' + (version ? ' in ' + version : ''),
              ),
            );
          }
          if (version && !deprecatedWarnings[opt]) {
            deprecatedWarnings[opt] = true;
            console.warn(
              formatMessage(
                opt,
                ' has been deprecated since v' +
                  version +
                  ' and will be removed in the near future',
              ),
            );
          }
          return validator ? validator(value, opt, opts) : true;
        };
      };
      function assertOptions(options, schema, allowUnknown) {
        if (typeof options !== 'object') {
          throw new TypeError('options must be an object');
        }
        var keys = Object.keys(options);
        var i = keys.length;
        while (i-- > 0) {
          var opt = keys[i];
          var validator = schema[opt];
          if (validator) {
            var value = options[opt];
            var result = value === void 0 || validator(value, opt, options);
            if (result !== true) {
              throw new TypeError('option ' + opt + ' must be ' + result);
            }
            continue;
          }
          if (allowUnknown !== true) {
            throw Error('Unknown option ' + opt);
          }
        }
      }
      module.exports = {
        assertOptions,
        validators,
      };
    },
  });

  // node_modules/axios/lib/core/Axios.js
  var require_Axios = __commonJS({
    'node_modules/axios/lib/core/Axios.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var buildURL = require_buildURL();
      var InterceptorManager = require_InterceptorManager();
      var dispatchRequest = require_dispatchRequest();
      var mergeConfig = require_mergeConfig();
      var validator = require_validator();
      var validators = validator.validators;
      function Axios(instanceConfig) {
        this.defaults = instanceConfig;
        this.interceptors = {
          request: new InterceptorManager(),
          response: new InterceptorManager(),
        };
      }
      Axios.prototype.request = function request(configOrUrl, config) {
        if (typeof configOrUrl === 'string') {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }
        config = mergeConfig(this.defaults, config);
        if (config.method) {
          config.method = config.method.toLowerCase();
        } else if (this.defaults.method) {
          config.method = this.defaults.method.toLowerCase();
        } else {
          config.method = 'get';
        }
        var transitional = config.transitional;
        if (transitional !== void 0) {
          validator.assertOptions(
            transitional,
            {
              silentJSONParsing: validators.transitional(validators.boolean),
              forcedJSONParsing: validators.transitional(validators.boolean),
              clarifyTimeoutError: validators.transitional(validators.boolean),
            },
            false,
          );
        }
        var requestInterceptorChain = [];
        var synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(function unshiftRequestInterceptors(
          interceptor,
        ) {
          if (
            typeof interceptor.runWhen === 'function' &&
            interceptor.runWhen(config) === false
          ) {
            return;
          }
          synchronousRequestInterceptors =
            synchronousRequestInterceptors && interceptor.synchronous;
          requestInterceptorChain.unshift(
            interceptor.fulfilled,
            interceptor.rejected,
          );
        });
        var responseInterceptorChain = [];
        this.interceptors.response.forEach(function pushResponseInterceptors(
          interceptor,
        ) {
          responseInterceptorChain.push(
            interceptor.fulfilled,
            interceptor.rejected,
          );
        });
        var promise;
        if (!synchronousRequestInterceptors) {
          var chain = [dispatchRequest, void 0];
          Array.prototype.unshift.apply(chain, requestInterceptorChain);
          chain = chain.concat(responseInterceptorChain);
          promise = Promise.resolve(config);
          while (chain.length) {
            promise = promise.then(chain.shift(), chain.shift());
          }
          return promise;
        }
        var newConfig = config;
        while (requestInterceptorChain.length) {
          var onFulfilled = requestInterceptorChain.shift();
          var onRejected = requestInterceptorChain.shift();
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected(error);
            break;
          }
        }
        try {
          promise = dispatchRequest(newConfig);
        } catch (error) {
          return Promise.reject(error);
        }
        while (responseInterceptorChain.length) {
          promise = promise.then(
            responseInterceptorChain.shift(),
            responseInterceptorChain.shift(),
          );
        }
        return promise;
      };
      Axios.prototype.getUri = function getUri(config) {
        config = mergeConfig(this.defaults, config);
        return buildURL(
          config.url,
          config.params,
          config.paramsSerializer,
        ).replace(/^\?/, '');
      };
      utils.forEach(
        ['delete', 'get', 'head', 'options'],
        function forEachMethodNoData(method) {
          Axios.prototype[method] = function (url, config) {
            return this.request(
              mergeConfig(config || {}, {
                method,
                url,
                data: (config || {}).data,
              }),
            );
          };
        },
      );
      utils.forEach(
        ['post', 'put', 'patch'],
        function forEachMethodWithData(method) {
          Axios.prototype[method] = function (url, data, config) {
            return this.request(
              mergeConfig(config || {}, {
                method,
                url,
                data,
              }),
            );
          };
        },
      );
      module.exports = Axios;
    },
  });

  // node_modules/axios/lib/cancel/CancelToken.js
  var require_CancelToken = __commonJS({
    'node_modules/axios/lib/cancel/CancelToken.js'(exports, module) {
      'use strict';
      var Cancel = require_Cancel();
      function CancelToken(executor) {
        if (typeof executor !== 'function') {
          throw new TypeError('executor must be a function.');
        }
        var resolvePromise;
        this.promise = new Promise(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        });
        var token = this;
        this.promise.then(function (cancel) {
          if (!token._listeners) return;
          var i;
          var l = token._listeners.length;
          for (i = 0; i < l; i++) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });
        this.promise.then = function (onfulfilled) {
          var _resolve;
          var promise = new Promise(function (resolve) {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);
          promise.cancel = function reject() {
            token.unsubscribe(_resolve);
          };
          return promise;
        };
        executor(function cancel(message) {
          if (token.reason) {
            return;
          }
          token.reason = new Cancel(message);
          resolvePromise(token.reason);
        });
      }
      CancelToken.prototype.throwIfRequested = function throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      };
      CancelToken.prototype.subscribe = function subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }
        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      };
      CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        var index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      };
      CancelToken.source = function source() {
        var cancel;
        var token = new CancelToken(function executor(c) {
          cancel = c;
        });
        return {
          token,
          cancel,
        };
      };
      module.exports = CancelToken;
    },
  });

  // node_modules/axios/lib/helpers/spread.js
  var require_spread = __commonJS({
    'node_modules/axios/lib/helpers/spread.js'(exports, module) {
      'use strict';
      module.exports = function spread(callback) {
        return function wrap(arr) {
          return callback.apply(null, arr);
        };
      };
    },
  });

  // node_modules/axios/lib/helpers/isAxiosError.js
  var require_isAxiosError = __commonJS({
    'node_modules/axios/lib/helpers/isAxiosError.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      module.exports = function isAxiosError(payload) {
        return utils.isObject(payload) && payload.isAxiosError === true;
      };
    },
  });

  // node_modules/axios/lib/axios.js
  var require_axios = __commonJS({
    'node_modules/axios/lib/axios.js'(exports, module) {
      'use strict';
      var utils = require_utils();
      var bind = require_bind();
      var Axios = require_Axios();
      var mergeConfig = require_mergeConfig();
      var defaults = require_defaults();
      function createInstance(defaultConfig) {
        var context = new Axios(defaultConfig);
        var instance = bind(Axios.prototype.request, context);
        utils.extend(instance, Axios.prototype, context);
        utils.extend(instance, context);
        instance.create = function create(instanceConfig) {
          return createInstance(mergeConfig(defaultConfig, instanceConfig));
        };
        return instance;
      }
      var axios2 = createInstance(defaults);
      axios2.Axios = Axios;
      axios2.Cancel = require_Cancel();
      axios2.CancelToken = require_CancelToken();
      axios2.isCancel = require_isCancel();
      axios2.VERSION = require_data().version;
      axios2.all = function all(promises) {
        return Promise.all(promises);
      };
      axios2.spread = require_spread();
      axios2.isAxiosError = require_isAxiosError();
      module.exports = axios2;
      module.exports.default = axios2;
    },
  });

  // node_modules/axios/index.js
  var require_axios2 = __commonJS({
    'node_modules/axios/index.js'(exports, module) {
      module.exports = require_axios();
    },
  });

  // node_modules/is-retry-allowed/index.js
  var require_is_retry_allowed = __commonJS({
    'node_modules/is-retry-allowed/index.js'(exports, module) {
      'use strict';
      var denyList = new Set([
        'ENOTFOUND',
        'ENETUNREACH',
        'UNABLE_TO_GET_ISSUER_CERT',
        'UNABLE_TO_GET_CRL',
        'UNABLE_TO_DECRYPT_CERT_SIGNATURE',
        'UNABLE_TO_DECRYPT_CRL_SIGNATURE',
        'UNABLE_TO_DECODE_ISSUER_PUBLIC_KEY',
        'CERT_SIGNATURE_FAILURE',
        'CRL_SIGNATURE_FAILURE',
        'CERT_NOT_YET_VALID',
        'CERT_HAS_EXPIRED',
        'CRL_NOT_YET_VALID',
        'CRL_HAS_EXPIRED',
        'ERROR_IN_CERT_NOT_BEFORE_FIELD',
        'ERROR_IN_CERT_NOT_AFTER_FIELD',
        'ERROR_IN_CRL_LAST_UPDATE_FIELD',
        'ERROR_IN_CRL_NEXT_UPDATE_FIELD',
        'OUT_OF_MEM',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'CERT_CHAIN_TOO_LONG',
        'CERT_REVOKED',
        'INVALID_CA',
        'PATH_LENGTH_EXCEEDED',
        'INVALID_PURPOSE',
        'CERT_UNTRUSTED',
        'CERT_REJECTED',
        'HOSTNAME_MISMATCH',
      ]);
      module.exports = (error) => !denyList.has(error && error.code);
    },
  });

  // src/contracts/actions/read/balance.ts
  var balance = async (state, { input: { target } }) => {
    const balances = state.balances;
    if (typeof target !== 'string') {
      throw new ContractError('Must specify target to get balance for');
    }
    if (typeof balances[target] !== 'number') {
      throw new ContractError('Cannot get balance, target does not exist');
    }
    return {
      result: {
        target,
        balance: -1,
      },
    };
  };

  // src/contracts/actions/read/record.ts
  var record = async (state, { input: { name } }) => {
    const records = state.records;
    if (typeof name !== 'string') {
      throw new ContractError('Must specify the ArNS Name');
    }
    if (!(name in records)) {
      throw new ContractError('This name does not exist');
    }
    return {
      result: {
        name,
        tier: records[name].tier,
        contractTxId: records[name].contractTxId,
        maxSubdomains: records[name].maxSubdomains,
        minTtlSeconds: records[name].minTtlSeconds,
        endTimestamp: records[name].endTimestamp,
      },
    };
  };

  // src/constants.ts
  var MAX_YEARS = 200;
  var MAX_NAME_LENGTH = 32;
  var MAX_NOTE_LENGTH = 256;
  var TX_ID_LENGTH = 43;
  var FOUNDATION_PERCENTAGE = 10;
  var SECONDS_IN_A_YEAR = 31536e3;
  var SECONDS_IN_GRACE_PERIOD = 1814400;

  // src/contracts/actions/write/buyRecord.ts
  var buyRecord = async (
    state,
    { caller, input: { name, contractTxId, years, tier } },
  ) => {
    const balances = state.balances;
    const records = state.records;
    const fees = state.fees;
    const tiers = state.tiers;
    const foundation = state.foundation;
    const currentBlockTime = +SmartWeave.block.timestamp;
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (!Number.isInteger(years) || years > MAX_YEARS || years <= 0) {
      throw new ContractError(
        'Invalid value for "years". Must be an integer greater than zero and less than the max years',
      );
    }
    if (!Number.isInteger(tier)) {
      throw new ContractError('Invalid value for "tier". Must be an integer');
    }
    if (!tiers[tier]) {
      throw new ContractError(`Tier is not defined!`);
    }
    const maxSubdomains = tiers[tier].maxSubdomains;
    const minTtlSeconds = tiers[tier].minTtlSeconds;
    const endTimestamp = currentBlockTime + SECONDS_IN_A_YEAR * years;
    name = name.toLowerCase();
    const namePattern = new RegExp('^[a-zA-Z0-9-]+$');
    const nameRes = namePattern.test(name);
    if (
      name.charAt(0) === '-' ||
      typeof name !== 'string' ||
      name.length > MAX_NAME_LENGTH ||
      !nameRes ||
      name === 'www' ||
      name === ''
    ) {
      throw new ContractError('Invalid ArNS Record Name');
    }
    let qty = fees[name.length.toString()] * tier * years;
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to purchase this name for ${qty} token(s)!`,
      );
    }
    const txIdPattern = new RegExp('^[a-zA-Z0-9_-]{43}$');
    const txIdres = txIdPattern.test(contractTxId);
    if (
      typeof contractTxId !== 'string' ||
      contractTxId.length !== TX_ID_LENGTH ||
      !txIdres
    ) {
      throw new ContractError('Invalid ANT Smartweave Contract Address');
    }
    if (!records[name]) {
      balances[caller] -= qty;
      foundation.balance += Math.floor(qty * (FOUNDATION_PERCENTAGE / 100));
      state.rewards += Math.floor(qty * ((100 - FOUNDATION_PERCENTAGE) / 100));
      records[name] = {
        tier,
        contractTxId,
        endTimestamp,
        maxSubdomains,
        minTtlSeconds,
      };
    } else if (
      records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <
      currentBlockTime
    ) {
      balances[caller] -= qty;
      state.foundation.balance += Math.floor(
        qty * (FOUNDATION_PERCENTAGE / 100),
      );
      state.rewards += Math.floor(qty * ((100 - FOUNDATION_PERCENTAGE) / 100));
      records[name] = {
        tier,
        contractTxId,
        endTimestamp,
        maxSubdomains,
        minTtlSeconds,
      };
    } else {
      throw new ContractError('This name already exists in an active lease');
    }
    return { state };
  };

  // src/contracts/actions/write/extendRecord.ts
  var extendRecord = async (state, { caller, input: { name, years } }) => {
    const balances = state.balances;
    const records = state.records;
    const fees = state.fees;
    const currentBlockTime = +SmartWeave.block.timestamp;
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (!records[name]) {
      throw new ContractError(`No record exists with this name ${name}`);
    }
    if (!Number.isInteger(years) || years > MAX_YEARS) {
      throw new ContractError(
        `Invalid value for "years". Must be an integers and less than ${MAX_YEARS}`,
      );
    }
    if (
      records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <
      currentBlockTime
    ) {
      throw new ContractError(
        `This name's lease has expired.  It must be purchased first before being extended.`,
      );
    }
    let qty = fees[name.length.toString()] * records[name].tier * years;
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to extend this name lease for ${qty} token(s) for ${years}!`,
      );
    }
    balances[caller] -= qty;
    state.foundation.balance += Math.floor(qty * (FOUNDATION_PERCENTAGE / 100));
    state.rewards += Math.floor(qty * ((100 - FOUNDATION_PERCENTAGE) / 100));
    records[name].endTimestamp += SECONDS_IN_A_YEAR * years;
    return { state };
  };

  // src/contracts/actions/write/upgradeTier.ts
  var upgradeTier = async (state, { caller, input: { name, tier } }) => {
    const balances = state.balances;
    const records = state.records;
    const fees = state.fees;
    const tiers = state.tiers;
    const foundation = state.foundation;
    const currentBlockTime = +SmartWeave.block.timestamp;
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (!records[name]) {
      throw new ContractError(`No record exists with this name ${name}`);
    }
    if (!Number.isInteger(tier)) {
      throw new ContractError('Invalid value for "tier". Must be an integers');
    }
    if (!tiers[tier]) {
      throw new ContractError(`Tier is not defined!`);
    }
    if (tier <= records[name].tier) {
      throw new ContractError(`Tiers can only be upgraded, not lowered!`);
    }
    if (
      records[name].endTimestamp + SECONDS_IN_GRACE_PERIOD <
      currentBlockTime
    ) {
      throw new ContractError(
        `This name's lease has expired.  It must be purchased first before being extended.`,
      );
    }
    let amountOfSecondsLeft = records[name].endTimestamp - currentBlockTime;
    let amountOfYearsLeft = amountOfSecondsLeft / SECONDS_IN_A_YEAR;
    let levelsUpgraded = tier - records[name].tier;
    let qty = Math.ceil(
      fees[name.length.toString()] * levelsUpgraded * amountOfYearsLeft,
    );
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to extend this name lease for ${qty} token(s)!`,
      );
    }
    balances[caller] -= qty;
    state.foundation.balance += Math.floor(qty * (FOUNDATION_PERCENTAGE / 100));
    state.rewards += Math.floor(qty * ((100 - FOUNDATION_PERCENTAGE) / 100));
    records[name].tier = tier;
    records[name].maxSubdomains = tiers[tier].maxSubdomains;
    records[name].minTtlSeconds = tiers[tier].minTtlSeconds;
    return { state };
  };

  // src/contracts/actions/write/setTier.ts
  var setTier = async (
    state,
    { caller, input: { tier, maxSubdomains, minTtlSeconds } },
  ) => {
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError('Caller cannot change tiers');
    }
    if (
      !Number.isInteger(maxSubdomains) ||
      !Number.isInteger(tier) ||
      !Number.isInteger(minTtlSeconds)
    ) {
      throw new ContractError('Invalid tier configuration');
    }
    state.tiers[tier] = { maxSubdomains, minTtlSeconds };
    return { state };
  };

  // src/contracts/actions/write/removeRecord.ts
  var removeRecord = async (state, { caller, input: { name } }) => {
    const owner = state.owner;
    const records = state.records;
    if (caller !== owner) {
      throw new ContractError(`Caller is not the owner of the ArNS!`);
    }
    name = name.toLowerCase();
    if (name in records) {
      delete records[name];
    } else {
      throw new ContractError(`Name does not exist in the ArNS!`);
    }
    return { state };
  };

  // src/contracts/actions/write/addANTSourceCodeTx.ts
  var addANTSourceCodeTx = async (
    state,
    { caller, input: { contractTxId } },
  ) => {
    const owner = state.owner;
    const approvedANTSourceCodeTxs = state.approvedANTSourceCodeTxs;
    if (caller !== owner) {
      throw new ContractError('Caller cannot add ANT Source Code Transactions');
    }
    const txIdPattern = new RegExp('^[a-zA-Z0-9_-]{43}$');
    const txIdres = txIdPattern.test(contractTxId);
    if (
      typeof contractTxId !== 'string' ||
      contractTxId.length !== TX_ID_LENGTH ||
      !txIdres
    ) {
      throw new ContractError('Invalid ANT Source Code Transaction ID');
    }
    if (approvedANTSourceCodeTxs.indexOf(contractTxId) > -1) {
      throw new ContractError(
        'This ANT Source Code Transaction ID is already allowed.',
      );
    } else {
      state.approvedANTSourceCodeTxs.push(contractTxId);
    }
    return { state };
  };

  // src/contracts/actions/write/removeANTSourceCodeTx.ts
  var removeANTSourceCodeTx = async (
    state,
    { caller, input: { contractTxId } },
  ) => {
    const owner = state.owner;
    const approvedANTSourceCodeTxs = state.approvedANTSourceCodeTxs;
    if (caller !== owner) {
      throw new ContractError(
        'Caller cannot add ANT Source Code Transaction IDs',
      );
    }
    const txIdPattern = new RegExp('^[a-zA-Z0-9_-]{43}$');
    const txIdres = txIdPattern.test(contractTxId);
    if (
      typeof contractTxId !== 'string' ||
      contractTxId.length !== TX_ID_LENGTH ||
      !txIdres
    ) {
      throw new ContractError('Invalid ANT Source Code Transaction ID');
    }
    if (approvedANTSourceCodeTxs.indexOf(contractTxId) > -1) {
      state.approvedANTSourceCodeTxs.splice(
        approvedANTSourceCodeTxs.indexOf(contractTxId),
      );
    } else {
      throw new ContractError(
        'This ANT Source Code Transaction ID not in the list.',
      );
    }
    return { state };
  };

  // src/contracts/actions/write/evolve.ts
  var evolve = async (state, { caller, input: { value, version } }) => {
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError('Caller cannot evolve the contract');
    }
    if (version) {
      if (typeof version === 'string' && version.length <= 32) {
        state.version = version;
      } else {
        throw new ContractError('Invalid version provided');
      }
    }
    state.evolve = value.toString();
    return { state };
  };

  // src/contracts/actions/write/mintTokens.ts
  var mintTokens = async (state, { caller, input: { qty } }) => {
    const balances = state.balances;
    const owner = state.owner;
    if (qty <= 0) {
      throw new ContractError('Invalid token mint');
    }
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (caller !== owner) {
      throw new ContractError('Caller cannot mint tokes');
    }
    balances[caller] ? (balances[caller] += qty) : (balances[caller] = qty);
    return { state };
  };

  // src/contracts/actions/write/lock.ts
  var lock = async (state, { caller, input: { qty, lockLength } }) => {
    const balances = state.balances;
    const settings = state.settings;
    const vaults = state.vaults;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ContractError('Quantity must be a positive integer.');
    }
    if (
      !Number.isInteger(lockLength) ||
      lockLength < settings['lockMinLength'] ||
      lockLength > settings['lockMaxLength']
    ) {
      throw new ContractError(
        `lockLength is out of range. lockLength must be between ${settings['lockMinLength']} - ${settings['lockMaxLength']}.`,
      );
    }
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to send ${qty} token(s)!`,
      );
    }
    const start = +SmartWeave.block.height;
    const end = start + lockLength;
    state.balances[caller] -= qty;
    if (caller in vaults) {
      state.vaults[caller].push({
        balance: qty,
        end,
        start,
      });
    } else {
      state.vaults[caller] = [
        {
          balance: qty,
          end,
          start,
        },
      ];
    }
    return { state };
  };

  // src/contracts/actions/write/unlock.ts
  var unlock = async (state, { caller, input: { id } }) => {
    const vaults = state.vaults;
    const balances = state.balances;
    if (!(caller in vaults && vaults[caller].length)) {
      throw new ContractError('No vaults to unlock');
    }
    if (
      id &&
      (typeof id !== 'number' || (id >= vaults[caller].length && id < 0))
    ) {
      throw new ContractError('Invalid vault index provided');
    }
    if (typeof id === 'number' && id < vaults[caller].length && id >= 0) {
      const locked = vaults[caller][id];
      if (+SmartWeave.block.height >= locked.end) {
        if (caller in balances && typeof balances[caller] === 'number') {
          state.balances[caller] += locked.balance;
        } else {
          state.balances[caller] = locked.balance;
        }
        state.vaults[caller].splice(id, 1);
      }
    } else {
      let i = vaults[caller].length;
      while (i--) {
        const locked = vaults[caller][i];
        if (+SmartWeave.block.height >= locked.end) {
          if (caller in balances && typeof balances[caller] === 'number') {
            state.balances[caller] += locked.balance;
          } else {
            state.balances[caller] = locked.balance;
          }
          state.vaults[caller].splice(i, 1);
        }
      }
    }
    return { state };
  };

  // src/contracts/actions/write/increaseVaultLength.ts
  var increaseVaultLength = async (
    state,
    { caller, input: { id, lockLength } },
  ) => {
    const settings = state.settings;
    const vaults = state.vaults;
    if (
      !Number.isInteger(lockLength) ||
      lockLength < settings['lockMinLength'] ||
      lockLength > settings['lockMaxLength']
    ) {
      throw new ContractError(
        `lockLength is out of range. lockLength must be between ${settings['lockMinLength']} - ${settings['lockMaxLength']}.`,
      );
    }
    if (!Number.isInteger(id)) {
      throw new ContractError('Invalid ID.  Must be an integer.');
    }
    if (caller in vaults) {
      if (!vaults[caller][id]) {
        throw new ContractError('Invalid vault ID.');
      }
    } else {
      throw new ContractError('Caller does not have a vault.');
    }
    if (+SmartWeave.block.height >= vaults[caller][id].end) {
      throw new ContractError('This vault has ended.');
    }
    state.vaults[caller][id].end = +SmartWeave.block.height + lockLength;
    return { state };
  };

  // src/contracts/actions/write/setFees.ts
  var setFees = async (state, { caller, input: { fees } }) => {
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError('Caller cannot change fees');
    }
    if (Object.keys(fees).length !== MAX_NAME_LENGTH) {
      throw new ContractError(
        'Invalid number of fees being set. There must be fees set for all %s characters that can be purchased',
        MAX_NAME_LENGTH,
      );
    }
    for (let i = 1; i <= MAX_NAME_LENGTH; i++) {
      if (!Number.isInteger(fees[i.toString()]) || fees[i.toString()] <= 0) {
        throw new ContractError(
          'Invalid value for fee %s. Must be an integer greater than 0',
          i,
        );
      }
    }
    state.fees = fees;
    return { state };
  };

  // src/contracts/actions/write/transferTokens.ts
  var transferTokens = async (state, { caller, input: { target, qty } }) => {
    const balances = state.balances;
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (!target) {
      throw new ContractError('No target specified');
    }
    if (qty <= 0 || caller === target) {
      throw new ContractError('Invalid token transfer');
    }
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to send ${qty} token(s)!`,
      );
    }
    balances[caller] -= qty;
    if (target in balances) {
      balances[`${target}`] += qty;
    } else {
      balances[`${target}`] = qty;
    }
    return { state };
  };

  // src/contracts/utilities.ts
  var import_axios = __toModule(require_axios2());

  // node_modules/axios-retry/lib/esm/index.js
  var import_is_retry_allowed = __toModule(require_is_retry_allowed());
  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }
    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }
  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
        args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);
        function _next(value) {
          asyncGeneratorStep(
            gen,
            resolve,
            reject,
            _next,
            _throw,
            'next',
            value,
          );
        }
        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'throw', err);
        }
        _next(void 0);
      });
    };
  }
  function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);
      if (enumerableOnly) {
        symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
      }
      keys.push.apply(keys, symbols);
    }
    return keys;
  }
  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      if (i % 2) {
        ownKeys(Object(source), true).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(
          target,
          Object.getOwnPropertyDescriptors(source),
        );
      } else {
        ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(
            target,
            key,
            Object.getOwnPropertyDescriptor(source, key),
          );
        });
      }
    }
    return target;
  }
  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  var namespace = 'axios-retry';
  function isNetworkError(error) {
    return (
      !error.response &&
      Boolean(error.code) &&
      error.code !== 'ECONNABORTED' &&
      (0, import_is_retry_allowed.default)(error)
    );
  }
  var SAFE_HTTP_METHODS = ['get', 'head', 'options'];
  var IDEMPOTENT_HTTP_METHODS = SAFE_HTTP_METHODS.concat(['put', 'delete']);
  function isRetryableError(error) {
    return (
      error.code !== 'ECONNABORTED' &&
      (!error.response ||
        (error.response.status >= 500 && error.response.status <= 599))
    );
  }
  function isSafeRequestError(error) {
    if (!error.config) {
      return false;
    }
    return (
      isRetryableError(error) &&
      SAFE_HTTP_METHODS.indexOf(error.config.method) !== -1
    );
  }
  function isIdempotentRequestError(error) {
    if (!error.config) {
      return false;
    }
    return (
      isRetryableError(error) &&
      IDEMPOTENT_HTTP_METHODS.indexOf(error.config.method) !== -1
    );
  }
  function isNetworkOrIdempotentRequestError(error) {
    return isNetworkError(error) || isIdempotentRequestError(error);
  }
  function noDelay() {
    return 0;
  }
  function exponentialDelay() {
    var retryNumber =
      arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
    var delay = Math.pow(2, retryNumber) * 100;
    var randomSum = delay * 0.2 * Math.random();
    return delay + randomSum;
  }
  function getCurrentState(config) {
    var currentState = config[namespace] || {};
    currentState.retryCount = currentState.retryCount || 0;
    config[namespace] = currentState;
    return currentState;
  }
  function getRequestOptions(config, defaultOptions) {
    return _objectSpread(_objectSpread({}, defaultOptions), config[namespace]);
  }
  function fixConfig(axios2, config) {
    if (axios2.defaults.agent === config.agent) {
      delete config.agent;
    }
    if (axios2.defaults.httpAgent === config.httpAgent) {
      delete config.httpAgent;
    }
    if (axios2.defaults.httpsAgent === config.httpsAgent) {
      delete config.httpsAgent;
    }
  }
  function shouldRetry(_x, _x2, _x3, _x4) {
    return _shouldRetry.apply(this, arguments);
  }
  function _shouldRetry() {
    _shouldRetry = _asyncToGenerator(function* (
      retries,
      retryCondition,
      currentState,
      error,
    ) {
      var shouldRetryOrPromise =
        currentState.retryCount < retries && retryCondition(error);
      if (typeof shouldRetryOrPromise === 'object') {
        try {
          var shouldRetryPromiseResult = yield shouldRetryOrPromise;
          return shouldRetryPromiseResult !== false;
        } catch (_err) {
          return false;
        }
      }
      return shouldRetryOrPromise;
    });
    return _shouldRetry.apply(this, arguments);
  }
  function axiosRetry(axios2, defaultOptions) {
    axios2.interceptors.request.use((config) => {
      var currentState = getCurrentState(config);
      currentState.lastRequestTime = Date.now();
      return config;
    });
    axios2.interceptors.response.use(
      null,
      /* @__PURE__ */ (function () {
        var _ref = _asyncToGenerator(function* (error) {
          var { config } = error;
          if (!config) {
            return Promise.reject(error);
          }
          var {
            retries = 3,
            retryCondition = isNetworkOrIdempotentRequestError,
            retryDelay = noDelay,
            shouldResetTimeout = false,
            onRetry = () => {},
          } = getRequestOptions(config, defaultOptions);
          var currentState = getCurrentState(config);
          if (yield shouldRetry(retries, retryCondition, currentState, error)) {
            currentState.retryCount += 1;
            var delay = retryDelay(currentState.retryCount, error);
            fixConfig(axios2, config);
            if (
              !shouldResetTimeout &&
              config.timeout &&
              currentState.lastRequestTime
            ) {
              var lastRequestDuration =
                Date.now() - currentState.lastRequestTime;
              config.timeout = Math.max(
                config.timeout - lastRequestDuration - delay,
                1,
              );
            }
            config.transformRequest = [(data) => data];
            onRetry(currentState.retryCount, error, config);
            return new Promise((resolve) =>
              setTimeout(() => resolve(axios2(config)), delay),
            );
          }
          return Promise.reject(error);
        });
        return function (_x5) {
          return _ref.apply(this, arguments);
        };
      })(),
    );
  }
  axiosRetry.isNetworkError = isNetworkError;
  axiosRetry.isSafeRequestError = isSafeRequestError;
  axiosRetry.isIdempotentRequestError = isIdempotentRequestError;
  axiosRetry.isNetworkOrIdempotentRequestError =
    isNetworkOrIdempotentRequestError;
  axiosRetry.exponentialDelay = exponentialDelay;
  axiosRetry.isRetryableError = isRetryableError;

  // src/contracts/utilities.ts
  function isArweaveAddress(address) {
    const trimmedAddress = address.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(trimmedAddress)) {
      throw new ContractError('Invalid Arweave address.');
    }
    return trimmedAddress;
  }
  function isipV4Address(ipV4Address) {
    if (
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipV4Address,
      )
    ) {
      return true;
    }
    alert('You have entered an invalid IP address!');
    return false;
  }

  // src/contracts/actions/write/transferTokensLocked.ts
  var transferTokensLocked = async (
    state,
    { caller, input: { target, qty, lockLength } },
  ) => {
    target = isArweaveAddress(target);
    const balances = state.balances;
    const settings = state.settings;
    const vaults = state.vaults;
    if (!Number.isInteger(qty)) {
      throw new ContractError('Invalid value for "qty". Must be an integer');
    }
    if (!target) {
      throw new ContractError('No target specified');
    }
    if (qty <= 0 || caller === target) {
      throw new ContractError('Invalid token transfer');
    }
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to send ${qty} locked token(s)!`,
      );
    }
    if (
      !Number.isInteger(lockLength) ||
      lockLength < settings['lockMinLength'] ||
      lockLength > settings['lockMaxLength']
    ) {
      throw new ContractError(
        `lockLength is out of range. lockLength must be between ${settings['lockMinLength']} - ${settings['lockMaxLength']}.`,
      );
    }
    const start = +SmartWeave.block.height;
    const end = start + lockLength;
    balances[caller] -= qty;
    if (target in vaults) {
      state.vaults[target].push({
        balance: qty,
        end,
        start,
      });
    } else {
      state.vaults[target] = [
        {
          balance: qty,
          end,
          start,
        },
      ];
    }
    return { state };
  };

  // src/contracts/actions/write/initiateFoundationAction.ts
  var initiateFoundationAction = async (
    state,
    {
      caller,
      input: { type, note, recipient, qty, lockLength, value, target },
    },
  ) => {
    const foundation = state.foundation;
    const settings = state.settings;
    let foundationAction;
    if (!foundation.addresses.includes(caller)) {
      throw new ContractError(
        'Caller needs to be in the foundation wallet list.',
      );
    }
    if (typeof note !== 'string') {
      throw new ContractError('Note format not recognized.');
    }
    if (typeof type !== 'string') {
      throw new ContractError('Type format not recognized.');
    }
    if (type === 'transfer') {
      recipient = isArweaveAddress(recipient);
      if (!recipient || typeof recipient !== 'string') {
        throw new ContractError('No recipient specified');
      }
      if (!Number.isInteger(qty) || qty <= 0 || qty > foundation.balance) {
        throw new ContractError(
          'Invalid value for "qty". Must be a positive integer and must not be greater than the total balance available.',
        );
      }
      if (lockLength) {
        if (
          !Number.isInteger(lockLength) ||
          lockLength < settings['lockMinLength'] ||
          lockLength > settings['lockMaxLength']
        ) {
          throw new ContractError(
            `lockLength is out of range. lockLength must be between ${settings['lockMinLength']} - ${settings['lockMaxLength']}.`,
          );
        }
      }
    } else if (type === 'addAddress') {
      target = isArweaveAddress(target);
      if (!target || typeof target !== 'string') {
        throw new ContractError('No valid target specified');
      }
      if (target in foundation.addresses) {
        throw new ContractError(
          'Target is already added as a Foundation address',
        );
      }
    } else if (type === 'removeAddress') {
      target = isArweaveAddress(target);
      if (!target || typeof target !== 'string') {
        throw new ContractError('No valid target specified');
      }
      if (!foundation.addresses.includes(target)) {
        throw new ContractError(
          'Target is not in the list of Foundation addresses',
        );
      }
    } else if (type === 'setMinSignatures') {
      if (
        !Number.isInteger(value) ||
        value <= 0 ||
        value > foundation.addresses.length
      ) {
        throw new ContractError(
          'Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation.',
        );
      }
    } else if (type === 'setActionPeriod') {
      if (!Number.isInteger(value) || value <= 0) {
        throw new ContractError(
          'Invalid value for transfer period. Must be a positive integer',
        );
      }
    } else {
      throw new ContractError('Invalid vote type.');
    }
    foundationAction = {
      id: foundation.actions.length,
      type,
      status: 'active',
      note,
      totalSignatures: 0,
      signed: [],
      recipient,
      target,
      qty,
      lockLength,
      value,
      start: +SmartWeave.block.height,
    };
    state.foundation.actions.push(foundationAction);
    return { state };
  };

  // src/contracts/actions/write/approveFoundationAction.ts
  var approveFoundationAction = async (state, { caller, input: { id } }) => {
    const foundation = state.foundation;
    if (!Number.isInteger(id)) {
      throw new ContractError('Invalid value for "id". Must be an integer.');
    }
    if (!foundation.addresses.includes(caller)) {
      throw new ContractError(
        'Caller needs to be in the foundation wallet list.',
      );
    }
    const action = foundation.actions[id];
    if (action.signed.includes(caller)) {
      throw new ContractError('Caller has already signed this action.');
    }
    if (
      +SmartWeave.block.height >= action.start + foundation.actionPeriod &&
      action.status === 'active'
    ) {
      state.foundation.actions[id].status = 'failed';
      return { state };
    }
    if (action.status !== 'active') {
      throw new ContractError('This action is not active.');
    }
    state.foundation.actions[id].totalSignatures += 1;
    state.foundation.actions[id].signed.push(caller);
    if (
      state.foundation.actions[id].totalSignatures >= foundation.minSignatures
    ) {
      if (state.foundation.actions[id].type === 'transfer') {
        const recipient = state.foundation.actions[id].recipient;
        const qty = state.foundation.actions[id].qty;
        if (state.foundation.actions[id].lockLength) {
          const start = +SmartWeave.block.height;
          const end = start + action.lockLength;
          if (recipient in state.vaults) {
            state.vaults[recipient].push({
              balance: qty,
              end,
              start,
            });
          } else {
            state.vaults[recipient] = [
              {
                balance: qty,
                end,
                start,
              },
            ];
          }
        } else {
          if (recipient in state.balances) {
            state.balances[recipient] += qty;
          } else {
            state.balances[recipient] = qty;
          }
        }
        state.foundation.balance -= state.foundation.actions[id].qty;
        state.foundation.actions[id].status = 'passed';
      } else if (state.foundation.actions[id].type === 'addAddress') {
        const target = isArweaveAddress(state.foundation.actions[id].target);
        if (!target || typeof target !== 'string') {
          throw new ContractError('No valid target specified');
        }
        if (target in foundation.addresses) {
          throw new ContractError(
            'Target is already added as a Foundation address',
          );
        }
        state.foundation.addresses.push(target);
        state.foundation.actions[id].status = 'passed';
      } else if (state.foundation.actions[id].type === 'removeAddress') {
        const target = isArweaveAddress(state.foundation.actions[id].target);
        if (!target || typeof target !== 'string') {
          throw new ContractError('No valid target specified');
        }
        if (!foundation.addresses.includes(target)) {
          throw new ContractError(
            'Target is not in the list of Foundation addresses',
          );
        }
        const index = foundation.addresses.indexOf(target);
        state.foundation.addresses.splice(index, 1);
        state.foundation.actions[id].status = 'passed';
      } else if (state.foundation.actions[id].type === 'setMinSignatures') {
        const value = state.foundation.actions[id].value;
        if (
          !Number.isInteger(value) ||
          value <= 0 ||
          value > foundation.addresses.length
        ) {
          throw new ContractError(
            'Invalid value for minSignatures. Must be a positive integer and must not be greater than the total number of addresses in the foundation.',
          );
        }
        state.foundation.minSignatures = +value;
        state.foundation.actions[id].status = 'passed';
      } else if (state.foundation.actions[id].type === 'setActionPeriod') {
        const value = state.foundation.actions[id].value;
        if (!Number.isInteger(value) || value <= 0) {
          throw new ContractError(
            'Invalid value for transfer period. Must be a positive integer',
          );
        }
        state.foundation.actionPeriod = +value;
        state.foundation.actions[id].status = 'passed';
      } else {
        throw new ContractError('Invalid vote type.');
      }
    }
    return { state };
  };

  // src/contracts/actions/write/fixState.ts
  var fixState = async (state, { caller, input: {} }) => {
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError('Caller cannot evolve the contract');
    }
    if (state.tiers === void 0) {
      state = {
        ...state,
        ...{
          tiers: {},
        },
      };
    }
    if (state.vaults === void 0) {
      state = {
        ...state,
        ...{
          vaults: {},
        },
      };
    }
    if (state.version === void 0) {
      state = {
        ...state,
        ...{
          version: '0.0.1',
        },
      };
    }
    if (state.foundation === void 0) {
      state = {
        ...state,
        ...{
          foundation: {
            balance: 0,
            actionPeriod: 720,
            minSignatures: 2,
            addresses: [
              'QGWqtJdLLgm2ehFWiiPzMaoFLD50CnGuzZIPEdoDRGQ',
              '31LPFYoow2G7j-eSSsrIh8OlNaARZ84-80J-8ba68d8',
              'NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g',
            ],
            actions: [],
          },
        },
      };
    }
    if (state.settings === void 0) {
      state = {
        ...state,
        ...{
          settings: {
            lockMinLength: 5,
            lockMaxLength: 1e4,
            minGatewayStakeAmount: 5e3,
            minDelegatedStakeAmount: 100,
            gatewayJoinLength: 720,
            gatewayLeaveLength: 10080,
            delegatedStakeWithdrawLength: 10080,
            operatorStakeWithdrawLength: 10080,
          },
        },
      };
    }
    if (state.gateways === void 0) {
      state = {
        ...state,
        ...{
          gateways: {},
        },
      };
    }
    if (state.votes === void 0) {
      state = {
        ...state,
        ...{
          votes: [],
        },
      };
    }
    if (state.rewards === void 0) {
      state = {
        ...state,
        ...{
          rewards: 0,
        },
      };
    }
    for (const key of Object.keys(state.records)) {
      if (state.records[key].contractTxId === void 0) {
        const endTimestamp = +SmartWeave.block.timestamp;
        +SECONDS_IN_A_YEAR * 1;
        state.records[key] = {
          contractTxId: state.records[key].toString(),
          endTimestamp,
          maxSubdomains: 100,
          minTtlSeconds: 3600,
          tier: 1,
        };
      }
    }
    return { state };
  };

  // src/contracts/actions/write/joinNetwork.ts
  var joinNetwork = async (
    state,
    {
      caller,
      input: {
        qty,
        label,
        sslFingerprint,
        ipV4Address,
        url,
        port,
        protocol,
        openDelegation,
        delegateAllowList,
        note,
      },
    },
  ) => {
    const balances = state.balances;
    const settings = state.settings;
    const gateways = state.gateways;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ContractError('Quantity must be a positive integer.');
    }
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to stake ${qty} token(s)!`,
      );
    }
    if (qty < settings.minGatewayStakeAmount) {
      throw new ContractError(
        'Quantity must be greater than or equal to the minimum gateway stake amount.',
      );
    }
    if (typeof label !== 'string') {
      throw new ContractError('Label format not recognized.');
    }
    if (!Number.isInteger(port) || port > 65535) {
      throw new ContractError('Invalid port number.');
    }
    if (!(protocol === 'http' || protocol === 'https')) {
      throw new ContractError('Invalid protocol, must be http or https.');
    }
    if (protocol === 'https' && sslFingerprint === void 0) {
      throw new ContractError(
        'Please provide an SSL Fingerprint for the certificate used for this HTTPS url.',
      );
    }
    if (ipV4Address === void 0 && url === void 0) {
      throw new ContractError(
        'Please provide an IP address or URL to access this gateway',
      );
    }
    if (ipV4Address && !isipV4Address(ipV4Address)) {
      throw new ContractError('Not a valid ipv4 address.');
    }
    if (note) {
      if (typeof note !== 'string') {
        throw new ContractError('Note format not recognized.');
      }
      if (note.length > MAX_NOTE_LENGTH) {
        throw new ContractError('Note is too long.');
      }
    }
    if (openDelegation) {
      if (typeof openDelegation !== 'boolean') {
        throw new ContractError('Open Delegation must be true or false.');
      }
    } else {
      openDelegation = true;
    }
    if (delegateAllowList) {
      if (!Array.isArray(delegateAllowList)) {
        throw new ContractError(
          'Delegate allow list must contain arweave addresses.',
        );
      }
    } else {
      delegateAllowList = [];
    }
    if (caller in gateways) {
      throw new ContractError("This Gateway's wallet is already registered");
    } else {
      state.balances[caller] -= qty;
      state.gateways[caller] = {
        operatorStake: qty,
        delegatedStake: 0,
        vaults: [
          {
            balance: qty,
            start: +SmartWeave.block.height,
            end: 0,
          },
        ],
        settings: {
          label,
          sslFingerprint,
          ipV4Address,
          url,
          port,
          openDelegation,
          delegateAllowList,
          protocol,
        },
        delegates: {},
      };
    }
    return { state };
  };

  // src/contracts/actions/write/leaveNetwork.ts
  var leaveNetwork = async (state, { caller }) => {
    const settings = state.settings;
    const gateways = state.gateways;
    if (!(caller in gateways)) {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    if (
      state.gateways[caller].vaults[0].start + settings.gatewayJoinLength >
      +SmartWeave.block.height
    ) {
      throw new ContractError('This Gateway has not been joined long enough');
    }
    if (state.gateways[caller].settings.url !== '') {
      for (let i = 0; i < state.gateways[caller].vaults.length; i++) {
        state.gateways[caller].vaults[i].end =
          +SmartWeave.block.height + settings.gatewayLeaveLength;
      }
      state.gateways[caller].settings.url = '';
      state.gateways[caller].settings.ipV4Address = '';
    } else if (
      state.gateways[caller].settings.url === '' &&
      state.gateways[caller].vaults[0].end <= +SmartWeave.block.height
    ) {
      for (let i = 0; i < state.gateways[caller].vaults.length; i++) {
        if (caller in state.balances) {
          state.balances[caller] += state.gateways[caller].vaults[i].balance;
        } else {
          state.gateways[caller].operatorStake -=
            state.gateways[caller].vaults[i].balance;
        }
        state.gateways[caller].operatorStake -=
          state.gateways[caller].vaults[i].balance;
        state.gateways[caller].vaults[i].balance = 0;
      }
      for (const key of Object.keys(state.gateways[caller].delegates)) {
        for (let i = 0; i < state.gateways[caller].delegates[key].length; i++) {
          if (key in state.balances) {
            state.balances[key] +=
              state.gateways[caller].delegates[key][i].balance;
          } else {
            state.balances[key] =
              state.gateways[caller].delegates[key][i].balance;
          }
          state.gateways[caller].delegatedStake -=
            state.gateways[caller].delegates[key][i].balance;
          state.gateways[caller].delegates[key][i].balance = 0;
        }
      }
      delete state.gateways[caller];
    } else {
      throw new ContractError('This Gateway can not leave the network yet');
    }
    return { state };
  };

  // src/contracts/actions/write/delegateStake.ts
  var delegateStake = async (state, { caller, input: { qty, target } }) => {
    const balances = state.balances;
    const gateways = state.gateways;
    const settings = state.settings;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ContractError('Quantity must be a positive integer.');
    }
    if (caller === target) {
      throw new ContractError('Gateways cannot delegate tokens to themselves');
    }
    if (!target) {
      throw new ContractError('No target specified');
    }
    if (qty < settings.minDelegatedStakeAmount) {
      throw new ContractError(
        'Quantity is not about the minimum delegated stake',
      );
    }
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to stake ${qty} token(s)!`,
      );
    }
    if (target in gateways) {
      if (state.gateways[target].settings.openDelegation === false) {
        if (
          state.gateways[target].settings.delegateAllowList.indexOf(caller) <=
          -1
        ) {
          throw new ContractError(
            'This Gateway is not accepting non-allowed, community delegates',
          );
        }
      }
      if (caller in state.gateways[target].delegates) {
        state.balances[caller] -= qty;
        state.gateways[target].delegatedStake += qty;
        state.gateways[target].delegates[caller].push({
          balance: qty,
          start: +SmartWeave.block.height,
          end: 0,
        });
      } else {
        state.balances[caller] -= qty;
        state.gateways[target].delegatedStake += qty;
        state.gateways[target].delegates[caller] = [
          {
            balance: qty,
            start: +SmartWeave.block.height,
            end: 0,
          },
        ];
      }
    } else {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    return { state };
  };

  // src/contracts/actions/write/undelegateStake.ts
  var undelegateStake = async (state, { caller, input: { id, target } }) => {
    const settings = state.settings;
    const gateways = state.gateways;
    if (!(target in gateways)) {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    if (
      !(
        caller in gateways[target].delegates &&
        gateways[target].delegates[caller].length
      )
    ) {
      throw new ContractError('No stake to undelegate');
    }
    if (
      id &&
      (typeof id !== 'number' ||
        (id >= gateways[target].delegates[caller].length && id < 0))
    ) {
      throw new ContractError('Invalid vault index provided');
    }
    if (
      typeof id === 'number' &&
      id < gateways[target].delegates[caller].length &&
      id >= 0
    ) {
      if (gateways[target].delegates[caller][id].end === 0) {
        state.gateways[target].delegates[caller][id].end =
          +SmartWeave.block.height + settings.delegatedStakeWithdrawLength;
      } else if (
        gateways[target].delegates[caller][id].end <= +SmartWeave.block.height
      ) {
        if (caller in state.balances) {
          state.balances[caller] +=
            gateways[target].delegates[caller][id].balance;
        } else {
          state.balances[caller] =
            gateways[target].delegates[caller][id].balance;
        }
        state.gateways[target].delegatedStake -=
          state.gateways[target].delegates[caller][id].balance;
        state.gateways[target].delegates[caller][id].balance = 0;
      } else {
        throw new ContractError('This stake cannot be undelegated yet');
      }
    } else {
      for (let i = 0; i < gateways[target].delegates[caller].length; i++) {
        if (gateways[target].delegates[caller][i].end === 0) {
          state.gateways[target].delegates[caller][i].end =
            +SmartWeave.block.height + settings.delegatedStakeWithdrawLength;
        } else if (
          gateways[target].delegates[caller][i].end <= +SmartWeave.block.height
        ) {
          if (caller in state.balances) {
            state.balances[caller] +=
              gateways[target].delegates[caller][i].balance;
          } else {
            state.balances[caller] =
              gateways[target].delegates[caller][i].balance;
          }
          state.gateways[target].delegatedStake -=
            state.gateways[target].delegates[caller][i].balance;
          state.gateways[target].delegates[caller][i].balance = 0;
        } else {
          throw new ContractError('This stake cannot be undelegated yet');
        }
      }
    }
    return { state };
  };

  // src/contracts/actions/write/increaseOperatorStake.ts
  var increaseOperatorStake = async (state, { caller, input: { qty } }) => {
    const balances = state.balances;
    const gateways = state.gateways;
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ContractError('Quantity must be a positive integer.');
    }
    if (
      !balances[caller] ||
      balances[caller] == void 0 ||
      balances[caller] == null ||
      isNaN(balances[caller])
    ) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(
        `Caller balance not high enough to stake ${qty} token(s)!`,
      );
    }
    if (caller in gateways) {
      state.balances[caller] -= qty;
      state.gateways[caller].operatorStake += qty;
      state.gateways[caller].vaults.push({
        balance: qty,
        start: +SmartWeave.block.height,
        end: 0,
      });
    } else {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    return { state };
  };

  // src/contracts/actions/write/decreaseOperatorStake.ts
  var decreaseOperatorStake = async (state, { caller, input: { id } }) => {
    const settings = state.settings;
    const gateways = state.gateways;
    if (!(caller in gateways)) {
      throw new ContractError("This Gateway's wallet is not registered");
    }
    if (
      id &&
      (typeof id !== 'number' ||
        (id >= gateways[caller].vaults.length && id < 0))
    ) {
      throw new ContractError('Invalid vault index provided');
    }
    if (
      gateways[caller].operatorStake - gateways[caller].vaults[id].balance <
      settings.minGatewayStakeAmount
    ) {
      throw new ContractError(
        'Not enough operator stake to maintain the minimum',
      );
    }
    if (gateways[caller].vaults[id].end === 0) {
      state.gateways[caller].vaults[id].end =
        +SmartWeave.block.height + settings.operatorStakeWithdrawLength;
    } else if (gateways[caller].vaults[id].end <= +SmartWeave.block.height) {
      if (caller in state.balances) {
        state.balances[caller] += gateways[caller].vaults[id].balance;
      } else {
        state.balances[caller] = gateways[caller].vaults[id].balance;
      }
      state.gateways[caller].operatorStake -=
        state.gateways[caller].vaults[id].balance;
      state.gateways[caller].vaults[id].balance = 0;
    } else {
      throw new ContractError('This stake cannot be decreased yet yet');
    }
    return { state };
  };

  // src/contracts/actions/write/proposeGatewaySlash.ts
  var proposeGatewaySlash = async (
    state,
    { caller, input: { target, penalty } },
  ) => {
    const settings = state.settings;
    const gateways = state.gateways;
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError(`Caller is not the owner of the ArNS!`);
    }
    if (!Number.isInteger(penalty) || penalty > 75 || penalty <= 0) {
      throw new ContractError(
        'Penalty must be a positive integer, between 1 and 75',
      );
    }
    if (!target) {
      throw new ContractError('No target specified');
    }
    const penaltyPercentage = penalty / 100;
    if (target in gateways) {
      for (let i = 0; i < state.gateways[target].vaults.length; i++) {
        const newBalance = Math.floor(
          state.gateways[target].vaults[i].balance * penaltyPercentage,
        );
        state.gateways[target].vaults[i].balance -= newBalance;
        state.gateways[target].operatorStake -= newBalance;
      }
      for (const key of Object.keys(state.gateways[target].delegates)) {
        for (let i = 0; i < state.gateways[target].delegates[key].length; i++) {
          const newBalance = Math.floor(
            state.gateways[target].delegates[key][i].balance *
              penaltyPercentage,
          );
          state.gateways[target].delegates[key][i].balance -= newBalance;
          state.gateways[target].delegatedStake -= newBalance;
        }
      }
    } else {
      throw new ContractError('This target is not a registered gateway.');
    }
    if (state.gateways[target].operatorStake < settings.minGatewayStakeAmount) {
      for (let i = 0; i < state.gateways[target].vaults.length; i++) {
        if (target in state.balances) {
          state.balances[target] += state.gateways[target].vaults[i].balance;
        } else {
          state.balances[target] = state.gateways[target].vaults[i].balance;
        }
        state.gateways[target].operatorStake -=
          state.gateways[target].vaults[i].balance;
        state.gateways[target].vaults[i].balance = 0;
      }
      for (const key of Object.keys(state.gateways[target].delegates)) {
        for (let i = 0; i < state.gateways[target].delegates[key].length; i++) {
          if (key in state.balances) {
            state.balances[key] +=
              state.gateways[target].delegates[key][i].balance;
          } else {
            state.balances[key] =
              state.gateways[target].delegates[key][i].balance;
          }
          state.gateways[target].delegatedStake -=
            state.gateways[target].delegates[key][i].balance;
          state.gateways[target].delegates[key][i].balance = 0;
        }
      }
      delete state.gateways[target];
    }
    return { state };
  };

  // src/contracts/actions/write/updateGatewaySettings.ts
  var updateGatewaySettings = async (
    state,
    {
      caller,
      input: {
        label,
        sslFingerprint,
        ipV4Address,
        url,
        port,
        protocol,
        openDelegation,
        delegateAllowList,
        note,
      },
    },
  ) => {
    const gateways = state.gateways;
    if (caller in gateways) {
      if (port) {
        if (!Number.isInteger(port) || port > 65535) {
          throw new ContractError('Invalid port number.');
        } else {
          state.gateways[caller].settings.port = port;
        }
      }
      if (protocol) {
        if (!(protocol === 'http' || protocol === 'https')) {
          throw new ContractError('Invalid protocol, must be http or https.');
        } else if (protocol === 'https' && sslFingerprint === void 0) {
          throw new ContractError(
            'Please provide an SSL Fingerprint for the certificate used for this HTTPS url.',
          );
        } else {
          state.gateways[caller].settings.protocol = protocol;
        }
      }
      if (sslFingerprint) {
        if (protocol !== 'https') {
          throw new ContractError(
            'This gateway must be set to HTTPS protocol first',
          );
        } else {
          state.gateways[caller].settings.sslFingerprint = sslFingerprint;
        }
      }
      if (ipV4Address) {
        if (isipV4Address(ipV4Address)) {
          state.gateways[caller].settings.ipV4Address = ipV4Address;
        } else {
          throw new ContractError('Not a valid ipv4 address.');
        }
      }
      if (url) {
        if (typeof url !== 'string') {
          throw new ContractError('Label format not recognized.');
        } else {
          state.gateways[caller].settings.url = url;
        }
      }
      if (label) {
        if (typeof label !== 'string') {
          throw new ContractError('Label format not recognized.');
        } else {
          state.gateways[caller].settings.label = label;
        }
      }
      if (note) {
        if (typeof note !== 'string') {
          throw new ContractError('Note format not recognized.');
        }
        if (note.length > MAX_NOTE_LENGTH) {
          throw new ContractError('Note is too long.');
        }
        state.gateways[caller].settings.note = note;
      }
      if (openDelegation) {
        if (typeof openDelegation !== 'boolean') {
          throw new ContractError('Open Delegation must be true or false.');
        } else {
          state.gateways[caller].settings.openDelegation = openDelegation;
        }
      }
      if (delegateAllowList) {
        if (!Array.isArray(delegateAllowList)) {
          throw new ContractError(
            'Delegate allow list must contain arweave addresses.',
          );
        } else {
          state.gateways[caller].settings.delegateAllowList = delegateAllowList;
        }
      }
    } else {
      throw new ContractError('This Gateway is not joined to the network');
    }
    return { state };
  };

  // src/contracts/actions/write/setSettings.ts
  var setSettings = async (state, { caller, input: { settings } }) => {
    const owner = state.owner;
    if (caller !== owner) {
      throw new ContractError('Caller cannot change settings');
    }
    state.settings = settings;
    return { state };
  };

  // src/contracts/contract.ts
  async function handle(state, action) {
    const input = action.input;
    switch (input.function) {
      case 'transfer':
        return await transferTokens(state, action);
      case 'transferLocked':
        return await transferTokensLocked(state, action);
      case 'approveFoundationAction':
        return await approveFoundationAction(state, action);
      case 'initiateFoundationAction':
        return await initiateFoundationAction(state, action);
      case 'lock':
        return await lock(state, action);
      case 'unlock':
        return await unlock(state, action);
      case 'increaseVaultLength':
        return await increaseVaultLength(state, action);
      case 'mint':
        return await mintTokens(state, action);
      case 'setFees':
        return await setFees(state, action);
      case 'buyRecord':
        return await buyRecord(state, action);
      case 'extendRecord':
        return await extendRecord(state, action);
      case 'upgradeTier':
        return await upgradeTier(state, action);
      case 'setTier':
        return await setTier(state, action);
      case 'removeRecord':
        return await removeRecord(state, action);
      case 'evolve':
        return await evolve(state, action);
      case 'addANTSourceCodeTx':
        return await addANTSourceCodeTx(state, action);
      case 'removeANTSourceCodeTx':
        return await removeANTSourceCodeTx(state, action);
      case 'balance':
        return await balance(state, action);
      case 'record':
        return await record(state, action);
      case 'fixState':
        return await fixState(state, action);
      case 'joinNetwork':
        return await joinNetwork(state, action);
      case 'leaveNetwork':
        return await leaveNetwork(state, action);
      case 'delegateStake':
        return await delegateStake(state, action);
      case 'undelegateStake':
        return await undelegateStake(state, action);
      case 'increaseOperatorStake':
        return await increaseOperatorStake(state, action);
      case 'decreaseOperatorStake':
        return await decreaseOperatorStake(state, action);
      case 'proposeGatewaySlash':
        return await proposeGatewaySlash(state, action);
      case 'updateGatewaySettings':
        return await updateGatewaySettings(state, action);
      case 'setSettings':
        return await setSettings(state, action);
      default:
        throw new ContractError(
          `No function supplied or function not recognised: "${input.function}"`,
        );
    }
  }
})();
