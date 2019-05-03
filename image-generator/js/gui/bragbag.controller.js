var BragBagController = function ($scope, $timeout, ytImageGenerator) {
  var vm = this;

  vm.params = {
    fill: '#3e3e3e',
    bgFill: '#3e3e3e',
    bgTextColor: '#3e3e3e'
  };

  vm.generateImage = function () {
    // Update params
    angular.forEach(vm.params, function (value, key) {
      ytImageGenerator.params[key] = value;
    });
    // Update collection items
    angular.forEach(vm.collections, function (collection, type) {
      collection.forEach(function (layer, index) {
        angular.forEach(layer, function (value, key) {
          ytImageGenerator.setCollectionItemValue(type, index, key, value);
        });
      });
    });

    ytImageGenerator.params['canvasTarget'] = '.js-canvas-target';
    ytImageGenerator.generateImage();
  };

  $scope.$on('ytImageGenerator:ready', function (e, obj) {
    $timeout(function () {
      vm.collections = obj.getCollections();
    }, 0);
  });
};

angular.module('bragBag')
  .controller('BragBagController', BragBagController);
