import util from './util.js';

export default class Vector {
	x!: number;
	y!: number;

	constructor(x: number = 0, y: number = x) {
		this.set(x, y);
	}

	static fromObj({x, y}: { x: number, y: number }) {
		return new Vector(x, y);
	}

	get copy() {
		return new Vector(this.x, this.y);
	}

	get magnitude2() {
		return this.x ** 2 + this.y ** 2;
	}

	equals(v: Vector) {
		return this.x === v.x && this.y === v.y;
	}

	atLeast(v: Vector) {
		return this.x >= v.x && this.y >= v.y;
	}

	lessThan(v: Vector) {
		return this.x < v.x && this.y < v.y;
	}

	set(x: number, y: number) {
		this.x = x;
		this.y = y;
		return this;
	}

	floor() {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	}

	add(v: Vector) {
		this.x += v.x;
		this.y += v.y;
		return this;
	}

	subtract(v: Vector) {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	}

	scale(v: Vector) {
		this.x *= v.x;
		this.y *= v.y;
		return this;
	}

	invert() {
		this.x = 1 / this.x;
		this.y = 1 / this.y;
		return this;
	}

	clamp(min: Vector, max: Vector) {
		this.x = util.clamp(this.x, min.x, max.x);
		this.y = util.clamp(this.y, min.y, max.y);
		return this;
	}
}
