/**
 * Creates a BragBag Layer.
 *
 * @constructor
 */
var BragBagLayer = function (params) {
  var _self = this;
  var _mask;

  var _defaults = {
    mask: false,
    commands: []
  };

  Object.defineProperty(_self, 'mask', {
    get: function() { return _mask; },
    set: function (value) {
      if (value) {
        _mask = value;
      } else {
        _mask = false;
      }
    }
  });

  Object.keys(params).forEach(function (key) {
    _self[key] = params[key];
  });

};