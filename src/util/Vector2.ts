import util from './util.js';

export default class Vector2 {
	readonly x: number;
	readonly y: number;

	constructor(x: number = 0, y: number = x) {
		this.x = x;
		this.y = y;
	}

	static fromObj({x, y}: { x: number, y: number }) {
		return new Vector2(x, y);
	}

	// get copy() {
	// 	return new Vector2(this.x, this.y);
	// }

	get magnitude2() {
		return this.x ** 2 + this.y ** 2;
	}

	equals(v: Vector2) {
		return this.x === v.x && this.y === v.y;
	}

	atLeast(v: Vector2) {
		return this.x >= v.x && this.y >= v.y;
	}

	lessThan(v: Vector2) {
		return this.x < v.x && this.y < v.y;
	}

	boundBy(minInclusive: Vector2, maxExclusive: Vector2) {
		return this.atLeast(minInclusive) && this.lessThan(maxExclusive);
	}

	iterate(delta: Vector2) {
		return util.arr(delta.x).flatMap(x =>
			util.arr(delta.y).flatMap(y =>
				new Vector2(x, y).add(this)));
	}

	setMagnitude2(magnitude2: number) {
		return this.magnitude2 ?
			this.scale(new Vector2(Math.sqrt(magnitude2 / this.magnitude2))) :
			new Vector2(Math.sqrt(magnitude2), 0);
	}

	floor() {
		return new Vector2(Math.floor(this.x), Math.floor(this.y));
	}

	abs() {
		return new Vector2(Math.abs(this.x), Math.abs(this.y));
	}

	add(v: Vector2) {
		return new Vector2(this.x + v.x, this.y + v.y);
	}

	subtract(v: Vector2) {
		return new Vector2(this.x - v.x, this.y - v.y);
	}

	scale(v: Vector2) {
		return new Vector2(this.x * v.x, this.y * v.y);
	}

	invert() {
		return new Vector2(1 / this.x, 1 / this.y);
	}

	clamp(min: Vector2, max: Vector2) {
		return new Vector2(util.clamp(this.x, min.x, max.x), util.clamp(this.y, min.y, max.y));
	}
}
