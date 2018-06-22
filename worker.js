
let grid;
let threshold = 0.1;
let mask;

function Buffer(topRange, leap) {
	this.buffer = null;
	this.end = null;
	this.leap = leap;
	this.range = topRange;
	this.mask = new Float32Array(this.leap);
}

Buffer.prototype.init = function (size) {
	this.buffer = new Float32Array(size);
	this.end = 0;
}

Buffer.prototype.push = function (data) {
	if(this.leap == 1) {
		this.buffer.set(data, 0);
		return;
	}
	this.buffer.copyWithin(0, this.buffer.length / this.leap, this.buffer.length);
	let start = this.buffer.length - this.buffer.length / this.leap;
	for(let i=0; i<data.length-this.leap; i+=this.leap) {
		this.buffer[start] = data[i];
		start++;
	}
}

Buffer.prototype.get = function (i) {
	return this.buffer[(i + this.end) % this.buffer.length];
}

let buffers = [
	//(new Buffer(60, 4)),
	//(new Buffer(120, 8)),
	//(new Buffer(400, 2)),
	(new Buffer(20000, 4)),
];

function blur(data) {
	for(let i=1; i<data.length-1; i++) {
		data[i] = (data[i - 1] + data[i] + data[i + 1]) / 3;
	}
}

function buildGrid() {
	buffers.forEach(x => { x.init(grid.sampleSize) });
	mask = new Float32Array(grid.sampleSize);
	for(let i=0; i<mask.length; i++) {
		mask[i] = Math.sin(i * Math.PI / mask.length);
	}
	grid.points = new Float32Array(grid.size * grid.sampleSize * 2);
	for(let i=0; i<grid.size; i++) {
		let leap = buffers.find(x => x.range > grid.steps[i]).leap;
		for(let j=0; j<grid.sampleSize; j++) {
			let k = i * grid.sampleSize + j;
			let a = j * 2 * Math.PI * grid.steps[i] * leap / 44100;
			grid.points[k * 2] = Math.sin(a);
			grid.points[k * 2 + 1] = Math.cos(a);
		}
	}
	console.log("Grid has been built");
}

onmessage = function (message) {
	message = message.data;
	switch(message.message) {
		case 'grid': 
			grid = message.data;
			buildGrid();
		break;

		case 'sound':
			let frequencies = fourier(message.data);
			postMessage(frequencies);
		break;

		case 'threshold':
			threshold = message.threshold;
		break;
	}
}

function fourier(data) {
	const output = new Float32Array(grid.size);
	const points = grid.points;
	let mean = 0;
	let max = 0;
	/*for(let i=0; i<data.length; i++) {
		let t = i / data.length;
		data[i] = data[i] * Math.sin(i * Math.PI / data.length);
	}*/
	buffers.forEach(x => {
		x.push(data);
		//blur(data);
	});

	for(let i = 0; i < grid.size; i++) {
		let a = 0;
		let b = 0;
		let buffer = buffers.find(x => x.range > grid.steps[i]);
		let d = buffer.buffer;
		for(let j=0; j<d.length; j++) {
			let k = (i * grid.sampleSize + j) * 2;
			let m = mask[j];
			a += points[k] * d[j] * m;
			b += points[k + 1] * d[j] * m;
		}
		a = a * a + b * b;
		max = a > max ? a : max;
		output[i] = a;
		mean += a;
	}
	mean /= grid.size;
	max = Math.max(max, threshold);
	for(let i=0; i<output.length; i++) {
		output[i] = output[i] / max;
	}
	return output;
}