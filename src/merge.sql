create or replace function graphql_pg_merge(arg_json jsonb) returns jsonb as
$x$
  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

  var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

  function findIndex(arr, predicate){
    if (arr == null) {
      throw new TypeError('findIndex called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(arr);
    var length = list.length >>> 0;
    var thisArg = arguments[2];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return i;
      }
    }
    return -1;
  }



  var SPLIT = "@@";

  var merge = function merge() {
    var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


    var mergeArr = function mergeArr(arrA, arrB) {
      var res = [].concat(_toConsumableArray(arrA));

      arrB.forEach(function (b) {
        var idx = findIndex(res, function (a) {
          return "" + a.id + a.type === "" + b.id + b.type;
        });
        if (idx === -1) {
          res = [].concat(_toConsumableArray(res), [b]);
        } else {
          res[idx] = merge(res[idx], b);
        }
      });

      return res;
    };

    var res = Object.keys(a).reduce(function (memo, key) {
      return _extends({}, memo, _defineProperty({}, key.split(SPLIT)[0], a[key]));
    }, {});

    Object.keys(b).forEach(function (key) {
      if (b[key] !== undefined) {

        var mergeKey = key.split(SPLIT)[0];

        if (_typeof(b[key]) === "object") {
          if (Array.isArray(b[key])) {
            res[mergeKey] = res[mergeKey] ? mergeArr(res[mergeKey], b[key]) : [].concat(_toConsumableArray(b[key]));
          } else {
            res[mergeKey] = res[mergeKey] ? merge(res[mergeKey], b[key]) : _extends({}, b[key]);

            // no {} empty objects
            if (Object.keys(res[mergeKey]).length === 0) res[mergeKey] = null;
          }
        } else {
          res[mergeKey] = b[key];
        }
      }
    });

    return Object.keys(res).length > 0 ? res : null;
  };

  return merge(arg_json, arg_json);
$x$ language plv8 immutable strict;
