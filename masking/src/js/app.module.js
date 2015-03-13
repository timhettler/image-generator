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
      currentLayer = 0,
      canvasData,
      ctx,
      text,
      pointData = [],
      layerData = [
        {
          id: 'shadow',
          fill: '#111111',
          color: '#000000',
          size: '12',
          mask: false
        },
        {
          id: 'bicep',
          fill: '#111111',
          color: '#666666',
          size: '20',
          mask: true
        },
        {
          id: 'forearm-left',
          fill: '#111111',
          color: '#666666',
          size: '20',
          mask: true
        },
        {
          id: 'forearm-right',
          fill: '#111111',
          color: '#666666',
          size: '20',
          mask: true
        },
        {
          id: 'hair',
          fill: '#111111',
          color: '#666666',
          size: '30',
          mask: true
        },
        {
          id: 'face-red',
          fill: '#111111',
          color: '#E42125',
          size: '12',
          mask: false
        },
        {
          id: 'bg-red',
          fill: '#111111',
          color: '#E42125',
          size: '12',
          mask: false
        },
        {
          id: 'forearm-right-red',
          fill: '#111111',
          color: '#E42125',
          size: '20',
          mask: 'forearm-right'
        },
        {
          id: 'face-midgray',
          fill: '#111111',
          color: '#5B5B5B',
          size: '12',
          mask: false
        },
        {
          id: 'forearm-left-midgray',
          fill: '#111111',
          color: '#5B5B5B',
          size: '20',
          mask: 'forearm-left'
        },
        {
          id: 'chest-midgray',
          fill: '#111111',
          color: '#5B5B5B',
          size: '12',
          mask: false
        },
        {
          id: 'forearm-right-midgray',
          fill: '#111111',
          color: '#5B5B5B',
          size: '20',
          mask: 'forearm-right'
        },
        {
          id: 'bicep-midgray',
          fill: '#111111',
          color: '#5B5B5B',
          size: '20',
          mask: 'bicep'
        },
        {
          id: 'face-lightgray',
          fill: '#111111',
          color: '#BEBEBE',
          size: '12',
          mask: false
        },
        {
          id: 'face-black',
          fill: '#111111',
          color: '#000000',
          size: '12',
          mask: false
        },
        {
          id: 'face-gray',
          fill: '#111111',
          color: '#262626',
          size: '12',
          mask: false
        },
        {
          id: 'face-white',
          fill: '#111111',
          color: '#FFFFFF',
          size: '12',
          mask: false
        },
        {
          id: 'bicep-white',
          fill: '#111111',
          color: '#FFFFFF',
          size: '20',
          mask: 'bicep'
        },
        {
          id: 'forearm-white',
          fill: '#111111',
          color: '#FFFFFF',
          size: '20',
          mask: 'forearm-left'
        }
      ];

  var _defaults = {
    canvasTarget: document.body,
    scale: 1,
    lineHeight: 1,
    fontFamily: 'Open Sans',
    bgData: {
      fill: '#ffffff',
      color: '#aaaaaa',
      size: 8
    }
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

  _self.generateImage = function () {
    readyPromise.then(function () {
      getAllPointData();
      resetCanvas();
      drawBackground();
      drawLayers();
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
    var fillColor = _self.params.bgData.fill;

    ctx.beginPath();
    ctx.rect(0, 0, xcanvas.canvas.width, xcanvas.canvas.height);
    ctx.fillStyle = fillColor;
    ctx.fill();
  };

  /**
   * Execute all {@link canvasData} commands.
   *
   * @param {function} onPathEnd - Callback function to be executed when end of path is reached.
   */
  var loopThroughLayers = function (onPathEnd) {
    currentLayer = 0;

    for (var i = 0; i < canvasData.length; i++) {
      switch (canvasData[i].fn) {
        case 'fill':
          onPathEnd.call(this);
          currentLayer++;
          break;
        case 'stroke':
          break;
        default:
          ctx[canvasData[i].fn].apply(ctx, canvasData[i].args);
          break;
      }
    }
  };

  /**
   * Draw all layers to canvas.
   *
   */
  var drawLayers = function () {
    console.info('generating image...');
    var onPathEnd = function () {
      if (layerData[currentLayer]) {
        ctx.clip();
        applyTextToLayer(layerData[currentLayer]);
        ctx.restore();
        ctx.save();
      }
    };

    ctx.save();
    loopThroughLayers(onPathEnd);
  };

  /**
   * Get point data for all masking layers.
   * @todo This can be described better.
   */
  var getAllPointData = function () {
    console.info('getting point datat...');
    var onPathEnd = function () {
      if (layerData[currentLayer] && layerData[currentLayer].mask === true) {
        ctx.save();
        getPointData(getLineHeight(layerData[currentLayer].size));
        ctx.restore();
        resetCanvas();
      }
    };

    loopThroughLayers(onPathEnd);
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
  var getPointData = function (lineHeight) {
    var pointFill = '#ff0000',
        y = 0,
        yIncrement = lineHeight,
        yMax = xcanvas.canvas.height,
        yData = [];
    
    ctx.fillStyle = pointFill;
    ctx.fill();

    while(y < yMax) {
      var x = 0,
          xMax = xcanvas.canvas.width,
          xData = [];

      while(x < xMax) {
        var data = ctx.getImageData(x, y, 1, 1).data;
        var hex = '#' + ('000000' + rgbToHex(data[0], data[1], data[2])).slice(-6).toLowerCase();
        if (hex !== _self.params.bgData.fill) {
          xData.push(x);
        }
        x++;
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

    pointData[currentLayer] = yData;
  };

  /**
   * Draw background text layer.
   *
   */
  var drawBackground = function () {
    ctx.beginPath();
    ctx.fillStyle = _self.params.bgData.color;
    ctx.font = [getTextWeight(false), _self.params.bgData.size+'px', _self.params.fontFamily].join(' ');
    ctx.textBaseline = 'top';
    _self.wrapFullText(_self.params.bgData.size);
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
   * @param {string} id - The id of the {@link layerData} object.
   *
   * @returns {Object} The requested object.
   */
  var getLayerIndexById = function (id) {
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
  var applyTextToLayer = function (data) {
    var command;
    var weight = getTextWeight(layerData[currentLayer].mask);
    var args = [];

    if (layerData[currentLayer].mask === true) {
      command = 'wrapMaskingText';
    } else if (typeof layerData[currentLayer].mask === 'string') {
      command = 'wrapMaskingText';
      args = [getLayerIndexById(layerData[currentLayer].mask)];
    } else {
      command = 'wrapFullText';
      args = [data.size];
    }

    ctx.fillStyle = data.fill;
    ctx.fill();
    ctx.fillStyle = data.color;
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
        token = data.start || 0,
        width = data.width || xcanvas.canvas.width;

    while (true) {
      var testLine = line + words[token % words.length];
      var metrics = ctx.measureText(testLine);
      var testWidth = metrics.width;
      token++;

      if (testWidth > width) {
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

  var removeAllButLast = function (string, token) {
      var parts = string.split(token);
      return parts.slice(0,-1).join('') + token + parts.slice(-1);
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
   * @param {Number} pointIndex - index of the {@link pointData} object to use.
   */
  _self.wrapMaskingText = function (pointIndex) {
    var index = pointIndex || currentLayer;
    var wordToken = 0;
    var words = getWordArray(text);
    var n = 0;


    for(var p = 0; p < pointData[index].length; p++) {
      var pData = pointData[index][p];
      var textObj = getLineOfText({
        words: words,
        start: wordToken,
        width: pData.w
      });

      ctx.fillText(textObj.line, pData.x, pData.y);
      wordToken = textObj.end;
    }
  };

  init();

};