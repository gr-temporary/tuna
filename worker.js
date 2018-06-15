
var grid;

onmessage = function (message) {
	switch(message.message) {
		case 'grid': 
			grid = message.data;
		break;

		case 'sound':
			let frequencies = fourier(message.data);
			postMessage(frequencies);
		break;
	}
}

function fourier(data) {

}