angular.module('bragBag')
  .directive('ytUpload', function (ytImageGenerator) {
    var directiveDefinitionObject = {
      restrict: 'A',
      scope: false,
      link: function (scope, iElement, iAttrs) {
        iElement.on('change', function (e) {
          var file = this.files[0];
          var reader = new FileReader();
          reader.onload = function (e) {
            // Load SVG and prepare canvas
            ytImageGenerator.setSvgData(e.target.result);
          };
          reader.readAsText(file);
        });
      }
    };

    return directiveDefinitionObject;
  });