
var app = new Vue({
	el: "main",
	data: {
		init: false,
		on: false,
		grid: {
			size: 300,
			timeSpan: 600,
			start: 50,
			end: 5000,
			sampleSize: 4096
		},
		ctx: null,
		worker: null,
		TEST: false
	},
	methods: {
		buildGrid: function() {
			var minv = 12 * Math.log(this.grid.start / 440) / Math.log(2);
		  	var maxv = 12 * Math.log(this.grid.end / 440) / Math.log(2);
			var length = maxv - minv;
			this.grid.steps = new Float32Array(this.grid.size);
			for(var i = 0; i < this.grid.size; i++) {
				var t = i / this.grid.size;
				t = 440 * Math.pow(2, (minv + t * length) / 12);
				this.grid.steps[i] = t;
			}
			if(this.worker) {
				this.worker.postMessage({ message: 'grid', data: this.grid });
			}
		},
		initCanvas: function() {
			const canvas = this.$refs.spectrogram;
			this.ctx = canvas.getContext("2d");
			this.grid.timeSpan = Math.min(this.grid.timeSpan, window.innerWidth)
			canvas.width = this.grid.timeSpan;
			canvas.height = this.grid.size;

			this.ctx.fillStyle = "#000";
			this.ctx.fillRect(0, 0, canvas.width, canvas.height);
		},
		process: function(event) {
			if(!this.on) {
				return;
			}

			let data;
			if(this.TEST) {
				data = new Float32Array(4096);
				for(let i=0; i<4096; i++) {
					data[i] = Math.sin(2 * Math.PI * this.grid.steps[10] * i / 44100) 
					+ Math.sin(2 * Math.PI * this.grid.steps[100] * i / 44100)
					+ Math.sin(2 * Math.PI * this.grid.steps[200] * i / 44100)
					+ Math.sin(2 * Math.PI * this.grid.steps[290] * i / 44100);
				}
			} else {
				const inputBuffer = event.inputBuffer;
				data = event.inputBuffer.getChannelData(0);
			}
			
			this.worker.postMessage({ message: 'sound', data: data });
		},
		addLine: function(histogram) {
			const canvas = this.$refs.spectrogram;

			this.ctx.drawImage(canvas, -1, 0);

			let imgData = this.ctx.createImageData(1, this.grid.size);
			let data = imgData.data;
			let l = histogram.length - 1;
			for(let i=0; i<histogram.length; i++) {
				let j = i * 4;
				let c = histogram[l - i];
				data[j] = c * c * 255 | 0;
				data[j + 1] = c * 255 | 0;
				data[j + 2] = c * 0.5 * 255 | 0;
				data[j + 3] = 255;
			}
			this.ctx.putImageData(imgData, canvas.width - 1, 0);
		},
		start: function() {
			if(this.TEST) {
				this.on = !this.on;
				if(!this.init) {
					this.init = true;
					setInterval(() => { this.process() }, 120);
				}
				return;
			}

			if(this.init) {
				this.on = !this.on;
			} else {
				navigator.mediaDevices.getUserMedia({ video: false, audio: true })
					.then((stream) => {
						let audioContext = new AudioContext();
						let microphone = audioContext.createMediaStreamSource(stream);
						window.source = microphone; // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=934512
						let scriptProcessor = audioContext.createScriptProcessor(this.grid.sampleSize, 1, 1);

						scriptProcessor.connect(audioContext.destination);
						microphone.connect(scriptProcessor);

						this.init = true;
						this.on = true;
						scriptProcessor.onaudioprocess = (event) => {
							this.process(event);
						};
					})
					.catch((err) => {
						console.log(err);
					});
			}
		}
	},
	mounted: function() {
		this.worker = new Worker('worker.js');

		this.buildGrid();
		this.initCanvas();

		this.worker.onmessage = (data) => {
			data = data.data;
			this.addLine(data);
		}
	}
});
