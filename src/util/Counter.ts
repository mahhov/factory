export default class Counter {
	private readonly n: number;
	private i = 0; // valid values are [0, n). tick() returns true if i == n - 1

	constructor(n: number) {
		if (n < 1)
			console.error('Counter n must be at least 1:', n);
		this.n = n;
	}

	// will consume 1 tick() call if it were to return false
	prepare() {
		if (this.i < this.n - 1)
			this.i++;
		return this.isReady();
	}

	// return what the next call to tick()
	isReady() {
		return this.i === this.n - 1;
	}

	// the next n-1 calls to tick() will return false
	reset() {
		this.i = 0;
	}

	// returns true once every n calls
	// returns false on the 1st n-1 calls
	tick(): boolean {
		this.i = (this.i + 1) % this.n;
		return !this.i;
	}
}
