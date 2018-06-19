
let grid;
let threshold = 0.1;

function buildGrid() {
	grid.points = new Float32Array(grid.size * grid.sampleSize * 2);
	for(let i=0; i<grid.size; i++) {
		for(let j=0; j<grid.sampleSize; j++) {
			let k = i * grid.sampleSize + j;
			let a = j * 2 * Math.PI * grid.steps[i] / 44100;
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
	for(let i=0; i<data.length; i++) {
		let t = i / data.length;
		data[i] = data[i] * Math.sin(i * Math.PI / data.length);
	}
	for(let i = 0; i < grid.size; i++) {
		let a = 0;
		let b = 0;
		for(let j=0; j<data.length; j++) {
			let k = (i * grid.sampleSize + j) * 2;
			a += points[k] * data[j];
			b += points[k + 1] * data[j];
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