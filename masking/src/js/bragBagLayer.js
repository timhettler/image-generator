/**
 * Creates a BragBag Layer.
 *
 * @constructor
 */
var BragBagLayer = function (id, params) {
  var _defaults = {
    fill: '#111111',
    mask: false
  };
  
  this.params.id = id;
  this.params = $.extend(_defaults, params || {});
};

BragBagLayer.prototype.get = function (param) {
  return this.params[param];
};

BragBagLayer.prototype.set = function (param, value) {
  this.params[param] = value;
  return this.params[param];
};