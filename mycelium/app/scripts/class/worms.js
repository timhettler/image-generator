var worms = [];
var gCanvas;
var srcImg;
var srcImgCanvas;
var srcImgCtx;
var srcImgData;

var time = 0;
var mStr = "YOUTUBE IS SO COOL!!!"
var strCounter =0;

// how many worms to start with
var initialNumWorms = 10;
// Maximum worms
var maxWorms = 100;

var scoreToFavour = 255;

var counter = 0;

// the context we're writing to 
var globalCtx;
// controls when a worm will branch
var branchThreshold = 230 * 4;

var lifetime = 100000;
var justBranched = 0;

var paused = false;

var once = true;
var width = 100;
var height = 100;

var pause = function(value) {
	if (value) {
		//$("#pauseButton").attr('value', 'Pause');
	} else {
		setTimeout(draw, 5); counter++;
		//$('#pauseButton').attr('value', 'Paused');
	}
	paused = value;
}

// Main loop
var draw = function () {
	var ctx = globalCtx;
	
    ctx.textAlign = 'center';
    
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;
    time++;

	// draw all the worms
	for (var i = 0; i < worms.length; i++) {
		var w = worms[i];

		if (w.dead == false) {
			/*ctx.beginPath();
			// what color is this worm?
			
			ctx.fillStyle = ;

			ctx.arc(w.x, w.y, 1, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();*/

			// text instead.
			//if (time%5 === 0) {
				var score = getColor(w.x, w.y, srcImgData);
				ctx.font = score.score/40+'pt Calibri';
				ctx.fillStyle = "rgba( " + score.r + "," + score.g + "," + score.b + ", " + w.food / (4 * 255) + ")";
				ctx.save();
				ctx.translate(w.x, w.y);
				ctx.rotate(w.vector);
				var str = mStr[time % mStr.length]
				ctx.fillText(str, 0, 0);
				ctx.restore();
				strCounter++;
			//}

			// move all the worms
			w.x += (Math.cos(w.vector) * w.speed);
			w.y += (Math.sin(w.vector) * w.speed);

			worms[i] = updateDirection(worms[i]);

			// Wrap the worms around the canvas
			if (w.x > srcImgData.width) w.x = 0;
			if (w.x < 0) w.x = srcImgData.width;
			if (w.y > srcImgData.height) w.y = 0;
            if (w.y < 0) w.y = srcImgData.height;
		} else {
			// regenerate an available worm at a random slot
			// remove this to generate cleaner images.
			var tx = Math.floor(Math.random() * srcImgData.width);
			var ty = Math.floor(Math.random() * srcImgData.height);

			// assign a random vector to begin with
			var angle = Math.random() * 2 * Math.PI;

			// x and y and a vector (direction).
			// Unit circle is the cos(0), sin(0)
			// To convert radians to degree, divide by 2*PI and multiply by 360 or ( * Math.PI/180)
			worms[i] = newWorm(i, tx, ty, angle);
		}
	}

	// Should we stop?
	if (paused) {
		log("paused");
	} else {
		setTimeout(draw, 5); counter++;
	}
};

var h2d = function (val) { return parseInt(val, 16);};

// Create a new worm, use random colors if directed
var newWorm = function (pi, px, py, pv, color) {
	
    /*pr = Math.floor(Math.random() * 255);
    pg = Math.floor(Math.random() * 255);
    pb = Math.floor(Math.random() * 255);*/
    pr = Math.floor(0);
    pg = Math.floor(0);
    pb = Math.floor(0);

    if (color) {
    	pr = color.r;
    	pg = color.g;
    	pb = color.b;
    }
    var w = { id: pi, x: px, y: py, vector: pv,
        food: 100, dead: false,
        speed: 1,
        r: pr,
        g: pg,
        b: pb
    };
    return w;
};

var log = function (msg) {    
    // disable logging, goes a bit faster.
    return; 
    if (window.console != undefined) {
        console.log(msg);
    }
};

var updateDirection = function(w) {
	// we know the current location
	// we know the vector
	// calculate a few variations between -30 degrees and +30 degree
	// and get their colors
	// whichever is brightest, that where we go to.

	var thirtyDegrees = Math.PI / 4;
	var angle = 0;
	var bestAngle = 0;
	var bestScoreSoFar = { r: 0, g: 0, b: 0, a: 0, score: 9999999999 };

	// look for the best place to go
	for (var i = 0; i < 3; i++) {
		angle = w.vector - ( Math.random() * thirtyDegrees ) + ( Math.random() * thirtyDegrees );

		// calculate a new direction
		var tx = w.x + (Math.cos(angle) * 5 * w.speed);
		var ty = w.y + (Math.sin(angle) * 5 * w.speed); // 5 makes it look further out

		// test the source image
		var score = getColor(tx, ty, srcImgData);

		// swap > for <
		if (score.score < bestScoreSoFar.score - 20) {
			bestAngle = angle;
			// Object assignment
			bestScoreSoFar = score;
		};
	};

	justBranched--;

	// If the score is SO good, we should branch (unless maximum warms have been reached)
	if(bestScoreSoFar.score > branchThreshold) {
		if (justBranched <= 0) {
			// assign a new vector, close to the original
			var startAngle = w.vector + (Math.random() * thirtyDegrees);
			w.vector -= 0.37;

			if (worms.length < maxWorms) {
				// new worm
				worms[worms.length] = newWorm(worms.length, w.x, w.y, startAngle, bestScoreSoFar);

				// we don't want everything branching at once
				justBranched = 500;

				log("branching, num worms =" + worms.length);
			} else {
				log("wanted to brance byut counldn't, too MANY warms");

				// maybe we can find a dead-worm and re-use him
				for (var i=0; i<worms.length; i++) {
					if(worms[i].dead == true) {
						worms[i] = newWorm(i, w.x, w.y, startAngle, bestScoreSoFar);

						log("Re-used a worm spot");
						break;
					}
				}
			} 
		} else {
			log("wanted to branch but couldn't, too recent since last branch");
		}
	}

	w.vector = bestAngle;

	w.food--;

	// favour the dark
	if (bestScoreSoFar.score < 355) {
		w.food = 200;
	}

	if (w.food === 0) {
		w.dead = true;
		log("worm " + w.id + " died, lack of food");
	}

	return w;
};

var loadImg = function () {
	// Load the reference image
	$('#srcImg').attr('src', 'images/bjork.png').load( function () {

	});
}

var getColor = function (tX, tY, src) {
	tX = Math.floor(tX);
	tY = Math.floor(tY);

	var index = (tX * 4) + (tY * 4) * src.width

	var tr = src.data[index];
	var tg = src.data[1 + index];
	var tb = src.data[2 + index];
	var ta = src.data[3 + index];
	// score this
    var ts = tr + tg + tb + ta;
    return { r: tr, g: tg, b: tb, a: ta, score: ts };
}

var initWorms = function (numberOfWorms, maxWidth, maxHeight) {
	for (var i = 0; i < numberOfWorms; i++) {
		var tx = Math.floor(Math.random() * maxWidth);
		var ty = Math.floor(Math.random() * maxHeight);

		// assign a random vector to begin with
		var angle = Math.random() * 2 * Math.PI;

		// x and y and a vector (direction).
		// Unit circle is the cos(0), sin(0)
		// To convert radians to degrees, divide by 2*PI and multiply by 360 or ( * Math.PI/180)
		worms[i] = newWorm(i, tx, ty, angle);
	}
};

var restart = function (config) {
	initialNumWorms = config.numOfWorms;
	maxWorms = config.maxNumOfWorms;

	gCanvas.id = "outputCanvas";
    gCanvas.width = width;
    gCanvas.height = height;
    gCanvas.setAttribute('width', width);
    gCanvas.setAttribute('height', height);

    // Setup the source Image for reference in drawing
    srcImg = document.getElementById('imageContainer');

    srcImgCanvas = document.createElement("canvas");
    srcImgCanvas.setAttribute('width', width);
    srcImgCanvas.setAttribute('height', height);

    srcImgCtx = srcImgCanvas.getContext("2d");

    // draw the image to the canvas
    srcImgCtx.drawImage(srcImg, 0, 0);

    // get and store the source image data for reference later
    srcImgData = srcImgCtx.getImageData(0, 0, srcImg.width, srcImg.height);

    initWorms(initialNumWorms, gCanvas.width, gCanvas.height);

    globalCtx = gCanvas.getContext("2d");
    globalCtx.drawImage(srcImg, 0, 0);

   // Draw a rectangle on canvas for some contrast 
    globalCtx.fillStyle = config.backgroundColor;
    globalCtx.fillRect(0, 0, srcImgData.width, srcImgData.height);

    setTimeout(draw, 1);
    $('#output').html('');
    $('#output').append(gCanvas);
};

// return the object back to the chained call flow
var goWorms = function (config) {

	gCanvas = document.createElement('canvas');

	if (gCanvas.getContext) { // canvas is supported
		
		$("#imageContainer").one('load', function() {
			//alert( "Load was performed." );
			width = this.width;
			height = this.height;
			//restart();

	    }).each(function() {
	    	if(this.complete) $(this).load();
	    });

		// load the source image into an img tag

	}
}