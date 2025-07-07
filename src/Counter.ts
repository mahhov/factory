class Counter {
	private readonly n: number;
	private i = 0;

	constructor(n: number) {
		if (n < 1)
			console.error('Counter n must be at least 1:', n);
		this.n = n;
	}

	reset() {
		this.i = 0;
	}

	tick(): boolean {
		this.i = (this.i + 1) % this.n;
		return !this.i;
	}
}

export default Counter;
