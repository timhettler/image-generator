/**
 * Creates an instance of BragBag.
 *
 * @constructor
 * @param {string} svgUrl The Url of the SVG file to be parsed.
 * @param {Object} [params] Overrides to default options.
 */
var BragBag = function (svgUrl, params) {
  // private variables
  var _self = this,
      _loadedPromise,
      _xcanvas,
      _canvasData,
      _ctx,
      _text,
      _collection = {
        mask: [],
        text: []
      },
      _fillDefaults = {
        '#000000': 51,
        '#383838': 35,
        '#616161': 31,
        '#ea1b22': 31,
        '#e9e9e9': 13,
        '#ffffff': 22
      };

  var _defaults = {
    canvasTarget: document.body,
    scale: 3.1,
    fontFamily: 'Open Sans',
    fill: '#252525',
    bgFill: '#d6d6d6',
    bgTextColor: '#b6b6b6',
    bgFontSize: 10,
    maskFontSize: 13
  };

  _self.svgUrl = svgUrl;
  _self.params = $.extend(_defaults, params || {});

  Object.defineProperty(_self.params, 'text', {
    get: function() { return _text; },
    set: function (value) {
      _text = formatText(value);
    }
  });

  /** @constructs BragBag */
  var init = function () {

    // Create dummy canvas and hide it
    _xcanvas = new jsCanvas ('vector');
    _xcanvas.canvas.style.display = 'none';

    _loadedPromise = new Promise (function (resolve, reject) {
      var $canvas = $('<canvas/>');

      _self.fetchSvg(_self.svgUrl).then(function (svg) {
        // Convert SVG data to canvas data
        _xcanvas.compile (svg, function () {

          // Array of canvas commands
          _canvasData = _xcanvas.export();

          // Prepare the display canvas
          $canvas.attr({
              'width': _xcanvas.canvas.width * _self.params.scale,
              'height': _xcanvas.canvas.height * _self.params.scale
            })
            .appendTo(_self.params.canvasTarget);

          _ctx = $canvas[0].getContext('2d');

          resetCanvas();
          console.info('svg loaded', _self.svgUrl);
          generateObjects();
          $('body').triggerHandler('bragBag:ready', [_self]);
          console.info('app ready');
          resolve();
        });
      });
    });

    return _loadedPromise;
  };

  _self.getCollections = function () {
    return _collection;
  };

  _self.setCollectionItemValue = function (type, index, property, value) {
    if (_collection[type] && _collection[type][index]) {
      _collection[type][index][property] = value;
    }
  };

  _self.generateImage = function () {
    _loadedPromise.then(function () {
      _ctx.setTransform(1, 0, 0, 1, 0, 0);
      setAllMaskDimensions();
      resetCanvas();
      _ctx.scale(_self.params.scale, _self.params.scale);
      drawBackground();
      drawAllLayers();
    });
  };

  /**
   * Make text uppercase, remove extra whitespace & line-breaks from text, and add soft-hyphens.
   *
   * @param {string} newText
   */
  var formatText = function (text) {
    // Uppercase format
    var formattedText = text.toUpperCase();
    // remove extra whitespace
    formattedText = formattedText.trim();
    // flatten whitespace
    formattedText = formattedText.replace(/\s+/g, ' ');
    // remove line breaks
    formattedText = formattedText.replace(/\n+/g, '');
    // add soft-hypens (external library)
    formattedText = window['Hypher']['languages']['en-us'].hyphenateText(formattedText);

    return formattedText;
  };

  /**
   * Get SVG data from a Url.
   *
   * @param {string} url
   */
  _self.fetchSvg = function (url) {
    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('GET', url, true);

      request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
          resolve(request.responseText);
        }
      };

      request.send();
    });
  };

  /**
   * Determine a text's line-height. Larger font-sizes get a smaller line-height.
   *
   * @param {Number} size - The pixel size of the text
   */
  var getLineHeight = function (size) {
    var lineHeight = (size > 20) ? 0.9 : 1;
    return size * lineHeight;
  };

  /**
   * Remove all painted layers from canvas. Effectively clears the canvas.
   *
   */
  var resetCanvas = function () {
    _ctx.clearRect(0, 0, _xcanvas.canvas.width * _self.params.scale, _xcanvas.canvas.height * _self.params.scale);
  };

  var getEmptyCollectionObject = function () {
    return {
      path: new Path2D()
    };
  };

  var generateObjects = function () {
    console.info('generating layer objects...');
    var currentObject,
        currentFillColor = '';

    for (var i = 0; i < _canvasData.length; i++) {
      switch (_canvasData[i].fn) {
        case 'fill':
          if (currentFillColor === 'rgba(0,0,0,0)' || currentFillColor === 'transparent' || currentFillColor === '') {
            type = 'mask';
            currentObject.size = _self.params.maskFontSize;
          } else {
            type = 'text';
            currentObject.fill = currentFillColor;
            currentObject.size = _fillDefaults[currentFillColor] || 0;
          }
          _collection[type].push(currentObject);
          break;
        case 'set':
          if (_canvasData[i].set === 'fillStyle') {
            currentFillColor = _canvasData[i].value.toLowerCase();
          }
          break;
        case 'translate':
        case 'scale':
        case 'save':
        case 'restore':
        case 'stroke':
          break;
        case 'beginPath':
          currentObject = getEmptyCollectionObject();
          break;
        default:
          currentObject.path[_canvasData[i].fn].apply(currentObject.path, _canvasData[i].args);
          break;
      }
    }
  };

  /**
   * Execute all {@link _canvasData} commands.
   *
   * @param {function} onPathEnd - Callback function to be executed when end of path is reached.
   */
  var executeCommands = function (collection, onPathEnd) {

    for (var x = 0; x < collection.length; x++) {
      for (var y = 0; y < collection[x].commands.length; y++) {
        _ctx[collection[x].commands[y].fn].apply(_ctx, collection[x].commands[y].args);
      }
      onPathEnd.apply(collection[x], [x]);
    }
  };

  /**
   * Get point data for all masking layers.
   * @todo This can be described better.
   */
  var setAllMaskDimensions = function () {
    console.info('getting point data...');
    console.time('p');

    _ctx.save();
    _collection.mask.forEach(function (maskObj, index) {
      setMaskDimensions(maskObj, index);
    });
    _ctx.restore();

    console.timeEnd('p');
  };

  /**
   * Get point data for single masking layer. This is accomplished by inspecting each pixel 
   * of the canvas to determine where the layer starts and ends. This data is used to
   * contain text within the masking layer.
   * @todo This process is very slow. Is there a better way?
   * @todo Once we find first X value, can we increase x-increment?
   *
   * @param {Number} lineHeight - The line height of the layer.
   */
  var setMaskDimensions = function (maskObj, index) {
    var pointFill = '#bada55',
        lineHeight = getLineHeight(maskObj.size),
        xMax = _xcanvas.canvas.width,
        yMax = _xcanvas.canvas.height,
        quickXIncrement = Math.ceil(_xcanvas.canvas.width/30),
        quickYIncrement = Math.ceil(_xcanvas.canvas.height/30),
        y = 0,
        yIncrement = quickYIncrement,
        yData = [],
        yMatchFound = false,
        yFirstMatch = false;
    
    _ctx.fillStyle = pointFill;
    _ctx.fill(maskObj.path);

    while(y < yMax) {
      var x = 0,
          xFalse = 0,
          xIncrement = quickXIncrement,
          xData = [],
          xFirstMatch = false;

      while(x < xMax) {
        var data = _ctx.getImageData(x, y, 1, 1).data;
        var hex = '#' + ('000000' + rgbToHex(data[0], data[1], data[2])).slice(-6).toLowerCase();
        if (hex === pointFill) { //match found
          if (!yFirstMatch) { // if first match ("fuzzy match") on y axis, exit loop and begin slower search
            yFirstMatch = true;
            break;
          } else if (yFirstMatch && !yMatchFound) { // if second match ("real match") found, increase y rate to line-height
            yMatchFound = true;
          }
          if (!xFirstMatch) { // if first match ("fuzzy match") on x axis, do not record match
            xFirstMatch = true;
          } else {
            xData.push(x);
          }
        } else if (xData.length > 0) { 
          if (xFalse > 40) { // exit if 20 pixels aren't matchs after th efirst is found
            break;
          }
          xFalse++;
        }

        if (xFirstMatch && xIncrement === quickXIncrement) { // on fuzzy match, go back to last point and begin slower search
          if (x !== 0) {
            x -= xIncrement;
          }
          xIncrement = 1;
        }

        x += xIncrement;
      }

      if (xData.length > 1) {
        yData.push({
          y: y,
          x: xData[0],
          w: xData[xData.length-1] - xData[0]
        });
      }

      if (yMatchFound && yIncrement === 1) { // if real match found, increase y rate to line-height
        //console.log('real');
        yIncrement = lineHeight;
      } else if (yFirstMatch && yIncrement === quickYIncrement) { // on fuzzy match, go back to last point and begin slower search
        //console.log('fuzzy');
        if (y !== 0) {
          y -= yIncrement;
        }
        yIncrement = 1;
      }

      //console.log(y);
      y += yIncrement;
    }

    _collection.mask[index].dimensions = yData;
  };

  /**
   * Draw background text layer.
   *
   */
  var drawBackground = function () {
    _ctx.fillStyle = _self.params.bgTextColor;
    if (_self.params.bgTextColor !== _self.params.bgFill) {
      _ctx.font = [getTextWeight(false), _self.params.bgFontSize+'px', _self.params.fontFamily].join(' ');
      _ctx.textBaseline = 'top';
      _self.wrapFullText(_self.params.bgFontSize);
    }
  };

  /**
   * Get font weight for given text type.
   *
   * @param {Boolean|string} id - The `mask` value of the layer.
   *
   * @returns {string} The font weight.
   */
  var getTextWeight = function (isMaskingLayer) {
    return (isMaskingLayer) ? '600' : '800';
  };

  /**
   * Find {@link _collection.mask} object by given id.
   *
   * @param {string} id
   *
   * @returns {Object} The requested object.
   */
  var getMaskById = function (id) {
    var obj;

    _collection.mask.some(function (element, index) {
      if(element.id === id) {
        obj = element;
        return true;
      }
    });

    return obj;
  };

  /**
   * Draw all layers to canvas.
   *
   */
  var drawAllLayers = function () {
    console.info('generating image...');
    console.time('d');

    _ctx.save();
    _collection.text.forEach(function (textObj, index) {
      drawLayer(textObj, index);
      _ctx.restore();
      _ctx.save();
    });
    _ctx.restore();

    console.timeEnd('d');
  };

  var drawLayer = function (textObj, index) {
    _ctx.fillStyle = _self.params.fill;
    _ctx.fill(textObj.path);
    _ctx.clip(textObj.path);
    if(textObj.size !== 0 && textObj.fill !== _self.params.fill) {
      applyTextToLayer(textObj);
    }
  };

  /**
   * Applies text to canvas.
   *
   * @param {Object} textObj - The {@link _collection.text} object to have text applied to.
   */
  var applyTextToLayer = function (textObj) {
    var command;
    var args = [];
    var weight;

    if (!textObj.mask || textObj.mask === '') {
      command = 'wrapFullText';
      args = [textObj.size];
      weight = getTextWeight(false);
    } else {
      command = 'wrapMaskingText';
      var maskObj = getMaskById(textObj.mask);
      textObj.size = maskObj.size;
      args = [maskObj];
      weight = getTextWeight(true);
    }

    _ctx.fillStyle = textObj.fill;
    _ctx.font = [weight, textObj.size+'px', _self.params.fontFamily].join(' ');
    _ctx.textBaseline = 'top';

    _self[command].apply(_self, args);
  };

  /**
   * Adds dashes before soft-hypens, then splits line into an array
   *
   * @param {string} text
   * @returns {Array}
   */
  var getWordArray = function (text) {
    var hypenatedText = text.replace(/\u00AD/g, '\u00AD ');
    return hypenatedText.split(/\s/);
  };

  var distributeExtraSpace = function (line, width) {
    var lineArray = line.split(' '),
        newLine,
        x = Math.round(Math.random() * width);

    while (true) {
      newLine = lineArray.join(' ');
      if (_ctx.measureText(newLine).width >= width) {
        break;
      }
      lineArray[x%lineArray.length] += ' ';
      x++;
    }

    return newLine;
  };

  /**
   * Get a line of text that fits in the specified width. Final words are allowed to go beyond width limit,
   * to avoid awkward spacing.
   * @todo Hypenation?
   *
   * @param {Object} data
   * @param {string|Array} data.words - A string or array of strings.
   * @param {Number} [data.start] - Which word to start on. 0, if ommitted.
   * @param {Number} [data.width] - Width of the line of text. {_xcanvas.canvas.width}, if omitted.
   *
   * @returns {Object} - An object containing the line of text and the ending position.
   */
  var getLineOfText = function (data) {
    var line = '',
        words = (typeof data.words === 'string') ? getWordArray(data.words) : data.words,
        widthThreshold = data.widthThreshold || 1,
        token = data.start || 0,
        width = data.width || _xcanvas.canvas.width;

    while (true) {
      var testLine = line + words[token % words.length];
      var metrics = _ctx.measureText(testLine);
      var testWidth = metrics.width;
      token++;

      if (testWidth/width > widthThreshold) {
        if(testLine.substring(testLine.length - 1) === '\u00AD') {
          line = testLine + '-';
        } else {
          line = testLine;
        }
        break;
      } else {
        if(testLine.substring(testLine.length - 1) === '\u00AD') {
          line = testLine + '';
        } else {
          line = testLine + ' ';
        }
      }
    }

    return {
      line: line,
      end: token
    };
  };

  /**
   * Write text to the page using the canvas dimensions as delimiters.
   * [Reference]{@link http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/}
   *
   * @param {Number} size - The pixel size of the text.
   */
  _self.wrapFullText = function (size) {
    var wordToken = 0;
    var words = getWordArray(_self.params.text);
    var lineHeight = getLineHeight(size);
    var totalLines = Math.ceil(_xcanvas.canvas.height/lineHeight);

    for(var l = 0; l < totalLines; l++) {
      var textObj = getLineOfText({
        words: words,
        start: wordToken,
        width: _xcanvas.canvas.width
      });

      _ctx.fillText(textObj.line, 0, l*lineHeight);
      wordToken = textObj.end;
    }
  };

  /**
   * Write text to the page using a {@link pointData} object as the delimiter.
   * [Reference]{@link http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/}
   *
   * @param {Object} mask - The {@link _collection.mask} object to use.
   */
  _self.wrapMaskingText = function (mask) {
    var wordToken = 0;
    var words = getWordArray(_self.params.text);
    var n = 0;

    for(var p = 0; p < mask.dimensions.length; p++) {
      var pData = mask.dimensions[p];
      var pDataNext = mask.dimensions[p+1] || {x:0};
      var xOffset = (pData.x - pDataNext.x) / 2;
      var wOffset = (pData.w - pDataNext.w) / 2;
      var newX = pData.x - xOffset;
      var newW = pData.w + xOffset;
      var textObj = getLineOfText({
        words: words,
        start: wordToken,
        width: newW,
        widthThreshold: 0.98
      });

      _ctx.fillText(textObj.line, newX, pData.y);
      wordToken = textObj.end;
    }
  };

  init();

};