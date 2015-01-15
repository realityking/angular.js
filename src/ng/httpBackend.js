'use strict';

function createXhr() {
    return new window.XMLHttpRequest();
}

/**
 * @ngdoc service
 * @name $httpBackend
 * @requires $browser
 *
 * @description
 * HTTP backend used by the {@link ng.$http service} that delegates to
 * XMLHttpRequest object or JSONP and deals with browser incompatibilities.
 *
 * You should never need to use this service directly, instead use the higher-level abstractions:
 * {@link ng.$http $http} or {@link ngResource.$resource $resource}.
 *
 * During testing this implementation is swapped with {@link ngMock.$httpBackend mock
 * $httpBackend} which can be trained with responses.
 */
function $HttpBackendProvider() {
  this.$get = ['$browser', function($browser) {
    return createHttpBackend($browser, createXhr, $browser.defer);
  }];
}

function createHttpBackend($browser, createXhr, $browserDefer) {
  // TODO(vojta): fix the signature
  function httpRequest(method, url, post, callback, headers, timeout, withCredentials, responseType) {
    $browser.$$incOutstandingRequestCount();
    url = url || $browser.url();

    var xhr = createXhr();

    xhr.open(method, url, true);
    forEach(headers, function(value, key) {
      if (isDefined(value)) {
        xhr.setRequestHeader(key, value);
      }
    });

    xhr.onload = function requestLoaded() {
      var statusText = xhr.statusText || '';

      // responseText is the old-school way of retrieving response (supported by IE8 & 9)
      // response/responseType properties were introduced in XHR Level2 spec (supported by IE10)
      var response = ('response' in xhr) ? xhr.response : xhr.responseText;

      // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
      var status = xhr.status === 1223 ? 204 : xhr.status;

      // fix status code when it is 0 (0 status is undocumented).
      // Occurs when accessing file resources or on Android 4.1 stock browser
      // while retrieving files from application cache.
      if (status === 0) {
        status = response ? 200 : urlResolve(url).protocol == 'file' ? 404 : 0;
      }

      completeRequest(callback,
        status,
        response,
        xhr.getAllResponseHeaders(),
        statusText);
    };

    function requestError() {
      // The response is always empty
      // See https://xhr.spec.whatwg.org/#request-error-steps and https://fetch.spec.whatwg.org/#concept-network-error
      completeRequest(callback, -1, null, null, '');
    };

    xhr.onerror = requestError;
    xhr.onabort = requestError;

    if (withCredentials) {
      xhr.withCredentials = true;
    }

    if (responseType) {
      try {
        xhr.responseType = responseType;
      } catch (e) {
        // WebKit added support for the json responseType value on 09/03/2013
        // https://bugs.webkit.org/show_bug.cgi?id=73648. Versions of Safari prior to 7 are
        // known to throw when setting the value "json" as the response type. Other older
        // browsers implementing the responseType
        //
        // The json response type can be ignored if not supported, because JSON payloads are
        // parsed on the client-side regardless.
        if (responseType !== 'json') {
          throw e;
        }
      }
    }

    xhr.send(post || null);

    if (timeout > 0) {
      var timeoutId = $browserDefer(timeoutRequest, timeout);
    } else if (isPromiseLike(timeout)) {
      timeout.then(timeoutRequest);
    }


    function timeoutRequest() {
      xhr && xhr.abort();
    }

    function completeRequest(callback, status, response, headersString, statusText) {
      // cancel timeout and subsequent timeout promise resolution
      if (timeoutId !== undefined) {
        $browserDefer.cancel(timeoutId);
      }
      xhr = null;

      callback(status, response, headersString, statusText);
      $browser.$$completeOutstandingRequest(noop);
    }
  }
  
  return {
    request: httpRequest
  };
}
