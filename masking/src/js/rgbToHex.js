// http://stackoverflow.com/questions/6735470/get-pixel-color-from-canvas-on-mouseover
rgbToHex = function (r, g, b) {
    if (r > 255 || g > 255 || b > 255) {
      throw 'Invalid color component';
    }
    return ((r << 16) | (g << 8) | b).toString(16);
};