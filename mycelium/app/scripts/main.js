

var Config = function () {
	this.numOfWorms = 50;
	this.maxNumOfWorms = 80;
	this.backgroundColor = "#171b24";
	this.paused = false;
	this.restart = function () {
		restart(config);
	}
};

var config = new Config();

window.onload = function () {
	
	var gui = new dat.GUI();
	gui.add(config, 'numOfWorms');
	gui.add(config, 'maxNumOfWorms');
	gui.add(config, 'backgroundColor');
	var pausedCtr = gui.add(config, 'paused');
	gui.add(config, 'restart');
	goWorms();

	pausedCtr.onChange(function(value) {
		pause(value);
	})

	restart(config);

}


