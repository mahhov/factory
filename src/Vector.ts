import util from './util.js';

class Vector {
	x: number;
	y: number;

	constructor(x: number = 0, y: number = x) {
		this.x = x;
		this.y = y;
	}

	get copy() {
		return new Vector(this.x, this.y);
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

	scale(s: number) {
		this.x *= s;
		this.y *= s;
		return this;
	}

	clamp(min: Vector, max: Vector) {
		this.x = util.clamp(this.x, min.x, max.x);
		this.y = util.clamp(this.y, min.y, max.y);
		return this;
	}
}

export default Vector;
