/**
 * Creates an instance of BragBag.
 *
 * @constructor
 * @param {string} svgUrl The Url of the SVG file to be parsed.
 * @param {Object} [params] Overrides to default options.
 */
var BragBag = function (svgUrl, params) {
  var _self = this,
      readyPromise,
      xcanvas,
      $canvas = $('<canvas/>'),
      currentFillColor,
      currentLayer = 0,
      canvasData,
      ctx,
      text,
      maskCollection = [],
      textCollection = [],
      layerData = [
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
      ];

  var _defaults = {
    canvasTarget: document.body,
    scale: 1,
    lineHeight: 1,
    fontFamily: 'Open Sans',
    fill: '#252525',
    bgFill: '#d6d6d6',
    bgTextColor: '#b6b6b6',
    bgFontSize: 10,
  };

  _self.svgUrl = svgUrl;
  _self.params = $.extend(_defaults, params || {});

  /** @constructs BragBag */
  var init = function () {

    // Create dummy canvas and hide it
    xcanvas = new jsCanvas ('vector');
    xcanvas.canvas.style.display = 'none';

    readyPromise = new Promise (function (resolve, reject) {
      _self.fetchSvg(_self.svgUrl).then(function (svg) {
        // Convert SVG data to canvas data
        xcanvas.compile (svg, function () {

          // Array of canvas commands
          canvasData = xcanvas.export();

          // Prepare the display canvas
          $canvas.attr({
              'width': xcanvas.canvas.width * _self.params.scale,
              'height': xcanvas.canvas.height * _self.params.scale
            })
            .appendTo(_self.params.canvasTarget);

          ctx = $canvas[0].getContext('2d');

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(_self.params.scale, _self.params.scale);

          resetCanvas();
          console.info('svg loaded', _self.svgUrl);
          resolve();
        });
      });
    });
  };

  var isTextVisible = function (textColor) {
    switch (textColor) {
      case '':
      case 'none':
      case 'transparent':
      case 'rgba(0,0,0,0)':
        return false;
      default:
        return true;
    }
  };

  _self.setParam = function (name, value) {
    _self.params[name] = value;
    return _self.params[name];
  };

  _self.generateImage = function () {
    readyPromise.then(function () {
      console.time('d');
      generateObjects();
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
   * Set text to be used in visualization.
   *
   * @param {string} newText
   * @returns {string} Formatted text.
   */
  _self.setText = function (newText) {
    text = formatText(newText);
    return text;
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
   * Determine a text's line-height using the {@link _self.params.lineHeight} property.
   *
   * @param {Number} size - The pixel size of the text
   */
  var getLineHeight = function (size) {
    return size * _self.params.lineHeight;
  };

  /**
   * Remove all painted layers from canvas. Effectively clears the canvas.
   *
   */
  var resetCanvas = function () {
    var fillColor = _self.params.bgFill;

    ctx.beginPath();
    ctx.rect(0, 0, xcanvas.canvas.width, xcanvas.canvas.height);
    ctx.fillStyle = fillColor;
    ctx.fill();
  };

  var getEmptyCollectionObject = function () {
    return {
      commands: []
    };
  };

  var generateObjects = function () {
    var currentObject = getEmptyCollectionObject();

    for (var i = 0; i < canvasData.length; i++) {
      switch (canvasData[i].fn) {
        case 'fill':
          if (currentFillColor === 'rgba(0,0,0,0)' || currentFillColor === 'transparent' || currentFillColor === '') {
            maskCollection.push(currentObject);
          } else {
            currentObject.fill = currentFillColor;
            textCollection.push(currentObject);
          }
          currentObject = getEmptyCollectionObject();
          break;
        case 'set':
          if (canvasData[i].set === 'fillStyle') {
            currentFillColor = canvasData[i].value.toLowerCase();
          }
          break;
        case 'scale':
        case 'save':
        case 'restore':
        case 'stroke':
          break;
        default:
          currentObject.commands.push({fn:canvasData[i].fn, args:canvasData[i].args});
          break;
      }
    }
  };

  /**
   * Execute all {@link canvasData} commands.
   *
   * @param {function} onPathEnd - Callback function to be executed when end of path is reached.
   */
  var executeCommands = function (collection, onPathEnd) {

    for (var x = 0; x < collection.length; x++) {
      for (var y = 0; y < collection[x].commands.length; y++) {
        ctx[collection[x].commands[y].fn].apply(ctx, collection[x].commands[y].args);
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
      ctx.clip();
      applyTextToLayer(textCollection[index], layerData[index + maskCollection.length]);
      ctx.restore();
      ctx.save();
    };

    ctx.save();
    executeCommands(textCollection, onPathEnd);
  };

  /**
   * Get point data for all masking layers.
   * @todo This can be described better.
   */
  var setAllMaskDimensions = function () {
    console.info('getting point data...');
    var onPathEnd = function (index) {
      setMaskDimension(index, getLineHeight(layerData[index].size));
      resetCanvas();
    };

    executeCommands(maskCollection, onPathEnd);
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
  var setMaskDimension = function (index, lineHeight) {
    var pointFill = '#ff0000',
        quickIncrement = Math.floor(xcanvas.canvas.width/30) * _self.params.scale,
        y = 0,
        yIncrement = lineHeight,
        yMax = xcanvas.canvas.height,
        yData = [];
    
    ctx.fillStyle = pointFill;
    ctx.fill();

    while(y < yMax) {
      var x = 0,
          xMax = xcanvas.canvas.width,
          xData = [],
          matchFound = false,
          firstMatch = false;

      while(x < xMax) {
        var data = ctx.getImageData(x, y, 1, 1).data;
        var hex = '#' + ('000000' + rgbToHex(data[0], data[1], data[2])).slice(-6).toLowerCase();
        if (hex !== _self.params.bgFill) {
          if (!firstMatch && !matchFound) {
            firstMatch = true;
          } else {
            xData.push(x);
          }
        }

        if (matchFound) {
          x++;
        } else if (firstMatch) {
          firstMatch = false;
          matchFound = true;
          if (x !== 0) {
            x -= quickIncrement;
          }
        } else {
          x += quickIncrement;
        }
      }

      if (xData.length > 1) {
        yData.push({
          y: y,
          x: xData[0],
          w: xData[xData.length-1] - xData[0]
        });
      }
      y += yIncrement;
    }

    maskCollection[index].dimensions = yData;
  };

  /**
   * Draw background text layer.
   *
   */
  var drawBackground = function () {
    ctx.beginPath();
    ctx.fillStyle = _self.params.bgTextColor;
    ctx.font = [getTextWeight(false), _self.params.bgFontSize+'px', _self.params.fontFamily].join(' ');
    ctx.textBaseline = 'top';
    _self.wrapFullText(_self.params.bgFontSize);
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
   * Find layerData object by given id.
   *
   * @param {string} id - The id of the {@link maskCollection} object.
   *
   * @returns {Object} The requested object.
   */
  var getMaskIndexById = function (id) {
    var objIndex;

    layerData.some(function (element, index) {
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
   * @param {Object} data - The {@link layerData} object of the layer to have text applied to.
   */
  var applyTextToLayer = function (textObj, data) {
    var command;
    var weight = getTextWeight(data.mask);
    var args = [];

    if (!data.mask) {
      command = 'wrapFullText';
      args = [data.size];
    } else if (data.mask === true) {
      command = 'wrapMaskingText';
    } else if (typeof data.mask === 'string') {
      command = 'wrapMaskingText';
      args = [getMaskIndexById(data.mask)];
    }

    ctx.fillStyle = _self.params.fill;
    ctx.fill();
    ctx.fillStyle = textObj.fill;
    ctx.font = [weight, data.size+'px', _self.params.fontFamily].join(' ');
    ctx.textBaseline = 'top';

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
   * @param {Object} data - The {@link layerData} object of the layer to have text applied to.
   * @param {string|Array} data.words - A string or array of strings.
   * @param {Number} [data.start] - Which word to start on. 0, if ommitted.
   * @param {Number} [data.width] - Width of the line of text. {xcanvas.canvas.width}, if omitted.
   *
   * @returns {Object} - An object containing the line of text and the ending position.
   */
  var getLineOfText = function (data) {
    var line = '',
        words = (typeof data.words === 'string') ? getWordArray(data.words) : data.words,
        widthThreshold = data.widthThreshold || 1,
        token = data.start || 0,
        width = data.width || xcanvas.canvas.width;

    while (true) {
      var testLine = line + words[token % words.length];
      var metrics = ctx.measureText(testLine);
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
    var words = getWordArray(text);
    var lineHeight = getLineHeight(size);
    var totalLines = Math.ceil(xcanvas.canvas.height/lineHeight);

    for(var l = 0; l < totalLines; l++) {
      var textObj = getLineOfText({
        words: words,
        start: wordToken,
        width: xcanvas.canvas.width
      });

      ctx.fillText(textObj.line, 0, l*lineHeight);
      wordToken = textObj.end;
    }
  };

  /**
   * Write text to the page using a {@link pointData} object as the delimiter.
   * [Reference]{@link http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/}
   *
   * @param {Number} [maskIndex] - index of the {@link maskCollection} object to use.
   */
  _self.wrapMaskingText = function (maskIndex) {
    var index = (maskIndex !== undefined) ? maskIndex : currentLayer;
    var wordToken = 0;
    var words = getWordArray(text);
    var n = 0;

    for(var p = 0; p < maskCollection[index].dimensions.length; p++) {
      var pData = maskCollection[index].dimensions[p];
      var textObj = getLineOfText({
        words: words,
        start: wordToken,
        width: pData.w,
        widthThreshold: 0.98
      });

      ctx.fillText(textObj.line, pData.x, pData.y);
      wordToken = textObj.end;
    }
  };

  init();

};