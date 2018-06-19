
var times = 0;
var init = false;
var on = false;
var grid = {
	size: 300,
	timeSpan: 600,
	start: 100,
	end: 5000,
	sampleSize: 4096
};
var canvas = document.querySelector("canvas");
var context = canvas.getContext("2d");

var TEST = false;

function buildGrid(grid) {
	var minv = 12 * Math.log(grid.start / 440) / Math.log(2);
  	var maxv = 12 * Math.log(grid.end / 440) / Math.log(2);
	var length = maxv - minv;
	grid.steps = new Float32Array(grid.size);
	for(var i = 0; i < grid.size; i++) {
		var t = i / grid.size;
		t = 440 * Math.pow(2, (minv + t * length) / 12);
		grid.steps[i] = t;
	}
	console.log(grid.steps);
}

function initCanvas() {
	grid.timeSpan = Math.min(grid.timeSpan, window.innerWidth)
	canvas.width = grid.timeSpan;
	canvas.height = grid.size;

	context.fillStyle = "#000";
	context.fillRect(0, 0, canvas.width, canvas.height);
}

function process(event) {
	if(!on) {
		return;
	}
	times++;

	if(TEST) {
		var data = new Float32Array(4096);
		for(let i=0; i<4096; i++) {
			data[i] = Math.sin(2 * Math.PI * grid.steps[times * 10] * i / 44100) + Math.sin(2 * Math.PI * grid.steps[290] * i / 44100);
		}
	} else {
		var inputBuffer = event.inputBuffer;
		var data = event.inputBuffer.getChannelData(0);
	}
	
	worker.postMessage({ message: 'sound', data: data });
}

buildGrid(grid);
initCanvas();

var worker = new Worker('worker.js');

worker.postMessage({ message: 'grid', data: grid });

worker.onmessage = function(data) {
	data = data.data;
	addLine(data);
}

console.log(grid);

setInterval(function() {
	document.title = times;
	times = 0;
}, 1000);

function addLine(histogram) {
	context.drawImage(canvas, -1, 0);

	var imgData = context.createImageData(1, grid.size);
	var data = imgData.data;
	var l = histogram.length - 1;
	for(var i=0; i<histogram.length; i++) {
		var j = i * 4;
		data[j] = histogram[l - i] * histogram[l - i] * 255 | 0;
		data[j + 1] = histogram[l - i] * 255 | 0;
		data[j + 2] = Math.sqrt(histogram[l - i]) * 255 | 0;
		data[j + 3] = 255;
	}
	context.putImageData(imgData, canvas.width - 1, 0);
}

function go1() {
	var h = [];
	for(var j = 0; j<grid.size; j++) {
		h[j] = Math.random();
	}
	addLine(h);
	setTimeout(go1, 1000 / 11);
}

function start() {
	if(!init) {
		if(TEST) {
			init = true;
			on = true;
			setInterval(process, 200);
		} else {
			navigator.mediaDevices.getUserMedia({ video: false, audio: true })
				.then(function(stream) {
					var audioContext = new AudioContext();
					var microphone = audioContext.createMediaStreamSource(stream);
					window.source = microphone; // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=934512
					var scriptProcessor = audioContext.createScriptProcessor(grid.sampleSize, 1, 1);

					scriptProcessor.connect(audioContext.destination);
					microphone.connect(scriptProcessor);

					init = true;
					on = true;
					scriptProcessor.onaudioprocess = process;
				})
				.catch(function(err) {
					console.log(err);
				});
		}		
	} else {
		on = true;
	}
}

function stop() {
	on = false;
}