'use strict';

/**
 * @ngdoc module
 * @name ngJsonp
 */

angular.module('ngJsonp', ['ng'])
  .config(['$provide', function($provide) {
    $provide.decorator('$http', ['$delegate', function ($delegate) {
      /**
       * @ngdoc method
       * @name $http#jsonp
       *
       * @description
       * Shortcut method to perform `JSONP` request.
       *
       * @param {string} url Relative or absolute URL specifying the destination of the request.
       *                     The name of the callback should be the string `JSON_CALLBACK`.
       * @param {Object=} config Optional configuration object
       * @returns {HttpPromise} Future object
       */
      $delegate.jsonp = function(url, config) {
        return $delegate(angular.extend(config || {}, {
          method: 'jsonp',
          url: url
        }));
      };
    }]);
    
    $provide.decorator('$httpBackend', ['$delegate', '$browser', '$window', '$document', 
        function ($delegate, $browser, $window, $document) {
       $delegate.jsonpRequest = return createJsonpBackend($browser, $browser.defer, $window.angular.callbacks, $document[0]);
    }]);
  }])
  .provider('$jsonpBackend', $JsonpBackendProvider);

function createJsonpBackend($browser, $browserDefer, callbacks, rawDocument) {
  // TODO(vojta): fix the signature
  return function(method, url, post, callback, headers, timeout, withCredentials, responseType) {
    $browser.$$incOutstandingRequestCount();
    url = url || $browser.url();

    var callbackId = '_' + (callbacks.counter++).toString(36);
    callbacks[callbackId] = function(data) {
      callbacks[callbackId].data = data;
      callbacks[callbackId].called = true;
    };

    var jsonpDone = jsonpReq(url.replace('JSON_CALLBACK', 'angular.callbacks.' + callbackId),
        callbackId, function(status, text) {
      completeRequest(callback, status, callbacks[callbackId].data, "", text);
      callbacks[callbackId] = noop;
    });

    if (timeout > 0) {
      var timeoutId = $browserDefer(timeoutRequest, timeout);
    } else if (isPromiseLike(timeout)) {
      timeout.then(timeoutRequest);
    }


    function timeoutRequest() {
      jsonpDone && jsonpDone();
    }

    function completeRequest(callback, status, response, headersString, statusText) {
      // cancel timeout and subsequent timeout promise resolution
      if (timeoutId !== undefined) {
        $browserDefer.cancel(timeoutId);
      }
      jsonpDone = null;

      callback(status, response, headersString, statusText);
      $browser.$$completeOutstandingRequest(noop);
    }
  };

  function jsonpReq(url, callbackId, done) {
    // we can't use jQuery/jqLite here because jQuery does crazy shit with script elements, e.g.:
    // - fetches local scripts via XHR and evals them
    // - adds and immediately removes script elements from the document
    var script = rawDocument.createElement('script'), callback = null;
    script.type = "text/javascript";
    script.src = url;
    script.async = true;

    callback = function(event) {
      removeEventListenerFn(script, "load", callback);
      removeEventListenerFn(script, "error", callback);
      rawDocument.body.removeChild(script);
      script = null;
      var status = -1;
      var text = "unknown";

      if (event) {
        if (event.type === "load" && !callbacks[callbackId].called) {
          event = { type: "error" };
        }
        text = event.type;
        status = event.type === "error" ? 404 : 200;
      }

      if (done) {
        done(status, text);
      }
    };

    addEventListenerFn(script, "load", callback);
    addEventListenerFn(script, "error", callback);
    rawDocument.body.appendChild(script);
    return callback;
  }
}
