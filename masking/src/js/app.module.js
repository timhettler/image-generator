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
      _layerData = [
        {
          id: 'flow',
          size: 13,
          mask: true
        },
        {
          size: 51
        },
        {
          size: 38
        },
        {
          size: 31
        },
        {
          size: 13
        },
        {
          size: 13,
          mask: 'flow'
        },
        {
          size: 22
        },
        {
          size: 13,
          mask: 'flow'
        },
        {
          size: 51
        },
        {
          size: 22
        },
        {
          size: 31
        }
      ],
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
    scale: 1,
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

          _ctx.setTransform(1, 0, 0, 1, 0, 0);
          _ctx.scale(_self.params.scale, _self.params.scale);

          resetCanvas();
          console.info('svg loaded', _self.svgUrl);
          generateObjects();
          $('body').triggerHandler('bragBag:ready', [_self]);
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
      console.time('d');
      console.time('p');
      setAllMaskDimensions();
      console.timeEnd('p');
      resetCanvas();
      drawBackground();
      drawAllLayers();
      console.timeEnd('d');
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
    var fillColor = _self.params.bgFill;

    _ctx.beginPath();
    _ctx.rect(0, 0, _xcanvas.canvas.width, _xcanvas.canvas.height);
    _ctx.fillStyle = fillColor;
    _ctx.fill();
  };

  var getEmptyCollectionObject = function () {
    return {
      commands: []
    };
  };

  var generateObjects = function () {
    console.info('generating layer objects...');
    var currentObject = getEmptyCollectionObject(),
        currentFillColor = '';

    for (var i = 0; i < _canvasData.length; i++) {
      switch (_canvasData[i].fn) {
        case 'fill':
          if (currentFillColor === 'rgba(0,0,0,0)' || currentFillColor === 'transparent' || currentFillColor === '') {
            currentObject.size = _self.params.maskFontSize;
            _collection.mask.push(currentObject);
          } else {
            currentObject.fill = currentFillColor;
            currentObject.size = _fillDefaults[currentFillColor] || 0;
            _collection.text.push(currentObject);
          }
          currentObject = getEmptyCollectionObject();
          break;
        case 'set':
          if (_canvasData[i].set === 'fillStyle') {
            currentFillColor = _canvasData[i].value.toLowerCase();
          }
          break;
        case 'scale':
        case 'save':
        case 'restore':
        case 'stroke':
          break;
        default:
          currentObject.commands.push({fn:_canvasData[i].fn, args:_canvasData[i].args});
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
      onPathEnd.apply(_self, [x]);
    }
  };

  /**
   * Draw all layers to canvas.
   *
   */
  var drawAllLayers = function () {
    console.info('generating image...');
    var onPathEnd = function (index) {
      _ctx.clip();
      applyTextToLayer(_collection.text[index], _layerData[index + _collection.mask.length]);
      _ctx.restore();
      _ctx.save();
    };

    _ctx.save();
    executeCommands(_collection.text, onPathEnd);
  };

  /**
   * Get point data for all masking layers.
   * @todo This can be described better.
   */
  var setAllMaskDimensions = function () {
    console.info('getting point data...');
    var onPathEnd = function (index) {
      setMaskDimensions(index, getLineHeight(_layerData[index].size));
      resetCanvas();
    };

    executeCommands(_collection.mask, onPathEnd);
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
  var setMaskDimensions = function (index, lineHeight) {
    var pointFill = '#ff0000',
        xMax = _xcanvas.canvas.width,
        yMax = _xcanvas.canvas.height,
        quickXIncrement = Math.ceil((_xcanvas.canvas.width/30) * _self.params.scale),
        quickYIncrement = Math.ceil((_xcanvas.canvas.height/30) * _self.params.scale),
        y = 0,
        yIncrement = quickYIncrement,
        yData = [],
        yMatchFound = false,
        yFirstMatch = false;
    
    _ctx.fillStyle = pointFill;
    _ctx.fill();

    while(y < yMax) {
      var x = 0,
          xIncrement = quickXIncrement,
          xData = [],
          xFirstMatch = false;

      while(x < xMax) {
        var data = _ctx.getImageData(x, y, 1, 1).data;
        var hex = '#' + ('000000' + rgbToHex(data[0], data[1], data[2])).slice(-6).toLowerCase();
        if (hex !== _self.params.bgFill) { //match found
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
        yIncrement = lineHeight;
      } else if (yFirstMatch && yIncrement === quickYIncrement) { // on fuzzy match, go back to last point and begin slower search
        if (y !== 0) {
          y -= yIncrement;
        }
        yIncrement = 1;
      }

      y += yIncrement;
    }

    _collection.mask[index].dimensions = yData;
  };

  /**
   * Draw background text layer.
   *
   */
  var drawBackground = function () {
    _ctx.beginPath();
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
   * Find _layerData object by given id.
   *
   * @param {string} id - The id of the {@link _collection.mask} object.
   *
   * @returns {Object} The requested object.
   */
  var getMaskIndexById = function (id) {
    var objIndex;

    _layerData.some(function (element, index) {
      if(element.id === id) {
        objIndex = index;
        return true;
      }
    });

    return objIndex;
  };

  /**
   * Applies text to canvas.
   *
   * @param {Object} data - The {@link _layerData} object of the layer to have text applied to.
   */
  var applyTextToLayer = function (textObj, data) {
    var command;
    var weight = getTextWeight(data.mask);
    var args = [];

    if (!data.mask) {
      command = 'wrapFullText';
      args = [data.size];
    } else {
      command = 'wrapMaskingText';
      args = [getMaskIndexById(data.mask)];
    }

    _ctx.fillStyle = _self.params.fill;
    _ctx.fill();
    _ctx.fillStyle = textObj.fill;
    _ctx.font = [weight, data.size+'px', _self.params.fontFamily].join(' ');
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

  /**
   * Get a line of text that fits in the specified width. Final words are allowed to go beyond width limit,
   * to avoid awkward spacing.
   * @todo Hypenation?
   *
   * @param {Object} data - The {@link _layerData} object of the layer to have text applied to.
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
   * @param {Number} maskIndex - index of the {@link _collection.mask} object to use.
   */
  _self.wrapMaskingText = function (maskIndex) {
    var wordToken = 0;
    var words = getWordArray(_self.params.text);
    var n = 0;

    for(var p = 0; p < _collection.mask[maskIndex].dimensions.length; p++) {
      var pData = _collection.mask[maskIndex].dimensions[p];
      var textObj = getLineOfText({
        words: words,
        start: wordToken,
        width: pData.w,
        widthThreshold: 0.98
      });

      _ctx.fillText(textObj.line, pData.x, pData.y);
      wordToken = textObj.end;
    }
  };

  init();

};