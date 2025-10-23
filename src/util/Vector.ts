import util from './util.js';

export default class Vector {
	static readonly V0 = new Vector(0);
	static readonly V1 = new Vector(1);
	readonly x: number;
	readonly y: number;

	constructor(x: number, y: number = x) {
		this.x = x;
		this.y = y;
	}

	static fromObj({x, y}: { x: number, y: number }) {
		return new Vector(x, y);
	}

	// get copy() {
	// 	return new Vector2(this.x, this.y);
	// }

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

	boundBy(minInclusive: Vector, maxExclusive: Vector) {
		return this.atLeast(minInclusive) && this.lessThan(maxExclusive);
	}

	iterate(delta: Vector) {
		return util.arr(delta.x).flatMap(x =>
			util.arr(delta.y).flatMap(y =>
				new Vector(x, y).add(this)));
	}
	
	setMagnitude2(magnitude2: number) {
		return this.magnitude2 ?
			this.scale(new Vector(Math.sqrt(magnitude2 / this.magnitude2))) :
			new Vector(Math.sqrt(magnitude2), 0);
	}

	floor() {
		return new Vector(Math.floor(this.x), Math.floor(this.y));
	}

	abs() {
		return new Vector(Math.abs(this.x), Math.abs(this.y));
	}

	add(v: Vector) {
		return new Vector(this.x + v.x, this.y + v.y);
	}

	subtract(v: Vector) {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	scale(v: Vector) {
		return new Vector(this.x * v.x, this.y * v.y);
	}

	invert() {
		return new Vector(1 / this.x, 1 / this.y);
	}

	clamp(min: Vector, max: Vector) {
		return new Vector(util.clamp(this.x, min.x, max.x), util.clamp(this.y, min.y, max.y));
	}
}
