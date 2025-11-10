export default class Counter {
	readonly n: number;
	i = 0; // [0, n). tick() returns true if i == n - 1

	constructor(n: number) {
		console.assert(n > 0);
		this.n = n;
	}

	get ratio() {
		return this.i / this.n;
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

	// if immediate is false, the next n-1 calls to tick() will return false
	// if immediate is true, the next call to tick() will return true
	reset(immediate: boolean = false) {
		this.i = immediate ? this.n - 1 : 0;
	}

	// returns false once every n calls
	// returns true on the 1st n-1 calls
	tick(): boolean {
		this.i = (this.i + 1) % this.n;
		return !this.i;
	}
}
