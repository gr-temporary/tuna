
var times = 0;
var init = false;
var on = false;
var grid = {
	size: 300,
	start: 20,
	end: 3300,
	sampleSize: 4096
};
var canvas = document.querySelector("canvas");
var context = canvas.getContext("2d");

function buildGrid(grid) {
	var minv = Math.log(grid.start);
  	var maxv = Math.log(grid.end);
	var length = maxv - minv;
	grid.steps = new Float32Array(grid.size);
	for(var i = 0; i < grid.size; i++) {
		var t = i / grid.size;
		t = Math.exp(minv + length * t);
		grid.steps[i] = t;
	}
}

function initCanvas() {
	canvas.width = Math.min(600, window.innerWidth);
	canvas.height = grid.size;

	context.fillStyle = "#000";
	context.fillRect(0, 0, canvas.width, canvas.height);
}

function process(event) {
	if(!on) {
		return;
	}
	times++;

	var inputBuffer = event.inputBuffer;
	//if(times == 1) {
		const data = event.inputBuffer.getChannelData(0);
		worker.postMessage({ message: 'sound', data: data });
		// data.sort((a, b) => a - b);
		// console.log(data[0], data[data.length - 1]);
	//}
}

buildGrid(grid);
initCanvas();

var worker = new Worker('worker.js');

worker.postMessage({ message: 'grid', data: grid });

worker.onmessage = function(data) {
	data = data.data;
	addLine(data);
	/*data.sort((a, b) => a - b);
	console.log(data[0], data[data.length - 1]);*/
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
	for(var i=0; i<histogram.length; i++) {
		var j = i * 4;
		data[j] = histogram[i] * histogram[i] * 255 | 0;
		data[j + 1] = histogram[i] * 255 | 0;
		data[j + 2] = Math.sqrt(histogram[i]) * 255 | 0;
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
	} else {
		on = true;
	}
}

function stop() {
	on = false;
}