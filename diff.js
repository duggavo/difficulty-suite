/*
 * Current findings:
 * MA is equivalent to cryptonote with cut=0 lag=0
 * 
 * LWMA with a window of N gives very similar results to MA with window of N*1.4
 * but it is noticeably slower to compute, and more complex to implement (higher chance of having bugs)
 */

// n=100        estimate delay | MA-equivalent window multiplier
// LWMA delay    37 blocks     |  1.4054054054054055
// MA delay      52 blocks     |  1
// Cryptonote    55 blocks     |  0.9454545454545453
// EMA delay     29 blocks     |  1.7931034482758619


var MULTIPLIERS = {
	lwma: 1.45,
	ma: 1,
	cn: 0.85,
	ema: 2,
}
function toEquivalentWindow(win, algo) {
	console.log(parseInt(win))
	console.log(algo)
	console.log(MULTIPLIERS[algo])
	return Math.round(parseInt(win) * MULTIPLIERS[algo])
}

const algos = {
	lwma: (blocks, window) => {
		if (blocks.length > window) {
			blocks = blocks.slice(-window)
		}

		let sum = 0;
		let tot = 0;
		for (i in blocks) {
			const weight = parseInt(i) + 1;
			tot += weight
			sum += blocks[i] * weight
		}

		return sum / tot
	},
	ma: (blocks, window) => {
		if (blocks.length > window) {
			blocks = blocks.slice(-window)
		}

		const nr = blocks.length;

		let sum = 0;
		for (v of blocks) {
			sum += v
		}

		return sum / nr
	},
	cn: (blocks, window) => {
		if (blocks.length > window + DIFFICULTY_LAG) {
			blocks = blocks.slice(-(window + DIFFICULTY_LAG))
			blocks = blocks.slice(0, window)
		}

		const nr = blocks.length;

		blocks.sort((a, b) => a - b)

		if (nr > DIFFICULTY_CUT + 2) {
			blocks = blocks.slice(DIFFICULTY_CUT / 2, nr - DIFFICULTY_CUT / 2)
		}


		let sum = 0;
		for (v of blocks) {
			sum += v
		}

		return sum / blocks.length
	},
	ema: (blocks, window) => {
		if (blocks.length > window) {
			blocks = blocks.slice(-window)
		}

		let sum = 0;
		let tot = 0;
		for (i in blocks) {
			const weight = (parseInt(i + 1)) ** 2;
			tot += weight
			sum += blocks[i] * weight
		}

		return sum / tot
	},
}

const MAX_HEIGHT = 100000
const DIFFICULTY_CUT = 12 // only for cryptonote
const DIFFICULTY_LAG = 3

const situations = {
	stable: {
		getDiffAtHeight: (h) => {
			let baseDiff = 0

			baseDiff = baseDiff + Math.random()

			return baseDiff
		},
		getDiffNoNoise: (h) => {
			let baseDiff = 0
			baseDiff = baseDiff + 0.5

			return baseDiff
		}
	}, hopping: {
		getDiffAtHeight: (h) => {
			let baseDiff = 0
			if (h % 400 > 200) {
				baseDiff = 1
			}

			baseDiff = baseDiff + Math.random()

			return baseDiff
		},
		getDiffNoNoise: (h) => {
			let baseDiff = 0
			if (h % 400 > 200) {
				baseDiff = 1
			}

			baseDiff = baseDiff + 0.5

			return baseDiff
		}
	}, sine: {
		getDiffAtHeight: (h) => {
			let baseDiff = 0

			baseDiff = baseDiff + Math.sin(h/100)

			return baseDiff
		},
		getDiffNoNoise: (h) => {
			let baseDiff = 0

			baseDiff = baseDiff + Math.sin(h/100)

			return baseDiff
		}
	}
}


let labels = []
let expectDiff = []
let actualDiff = []
let calcDiff = []

function compute() {
	labels = ["",""]
	expectDiff = [0,1]
	actualDiff = [0,1]
	calcDiff = [0,1]

	const curAlgo = algos[document.getElementById("algo").value]
	const window = toEquivalentWindow(document.getElementById("window").valueAsNumber, document.getElementById("algo").value)
	console.log("window is", window)

	const situation = situations[document.getElementById("situation").value]

	let totDeviation = 0;

	for (let i = 0; i < MAX_HEIGHT; i++) {
		const d = situation.getDiffAtHeight(i)
		const kNo = situation.getDiffNoNoise(i)

		labels.push(i)
		expectDiff.push(d)
		actualDiff.push(kNo)
		const k = curAlgo(expectDiff, window)
		calcDiff.push(k)

		totDeviation += Math.sqrt(Math.abs(kNo - k))
	}

	document.getElementById("devt").innerText = totDeviation / MAX_HEIGHT * 100
	document.getElementById("actualWin").innerText = window

	drawChart()
}

let chart = null;

function drawChart() {
	const ctx = document.getElementById('myChart');

	if (chart == null) {
		chart = new Chart(ctx, {
			type: "line",
			options: {
				animation: false,
				plugins: {
					decimation: {
						enabled: true
					}
				}
			},
			scales: {
				y: {
					min: 0,
					max: 2
				}
			}
		});
	}
	chart.data = {
		labels: labels,
		datasets: [{
			label: "Computed diff",
			data: calcDiff,
			tension: 0,
			yAxisId: "y",
			pointRadius: 0,
			pointHoverRadius: 5,
			pointHitRadius: 5,
			borderWidth: 1,
		}, {
			label: 'Actual Diff',
			data: actualDiff,
			fill: false,
			tension: 0,
			yAxisId: "y",
			pointRadius: 0,
			pointHoverRadius: 5,
			pointHitRadius: 5,
			borderWidth: 1,
		}]
	}
	chart.update()
}