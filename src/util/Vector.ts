import util from './util.js';

export default class Vector {
	static readonly V0 = new Vector(0);
	static readonly V1 = new Vector(1);
	readonly x: number;
	readonly y: number;
	private magnitude2_?: number;
	private magnitude_?: number;
	private floor_?: Vector;
	private ceil_?: Vector;
	private abs_?: Vector;
	private sign_?: Vector;
	private invert_?: Vector;

	constructor(x: number, y: number = x) {
		this.x = x;
		this.y = y;
	}

	static fromObj({x, y}: { x: number, y: number }) {
		return new Vector(x, y);
	}

	static fromAngle(degrees: number) {
		return new Vector(util.cos(degrees), util.sin(degrees));
	}

	static rand(min: number, max: number) {
		return new Vector(util.rand(min, max), util.rand(min, max));
	}

	get magnitude2() {
		return this.magnitude2_ ??= this.x ** 2 + this.y ** 2;
	}

	get magnitude() {
		return this.magnitude_ ??= this.magnitude2 ** .5;
	}

	get floor() {
		return this.floor_ ??= new Vector(Math.floor(this.x), Math.floor(this.y));
	}

	get ceil() {
		return this.ceil_ ??= new Vector(Math.ceil(this.x), Math.ceil(this.y));
	}

	get abs() {
		return this.abs_ ??= new Vector(Math.abs(this.x), Math.abs(this.y));
	}

	get sign() {
		return this.sign_ ??= new Vector(Math.sign(this.x), Math.sign(this.y));
	}

	get invert() {
		return this.invert_ ??= new Vector(1 / this.x, 1 / this.y);
	}

	get angle() {
		return Math.atan2(this.y, this.x);
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

	atMost(v: Vector) {
		return this.x <= v.x && this.y <= v.y;
	}

	boundBy(minInclusive: Vector, maxExclusive: Vector) {
		return this.atLeast(minInclusive) && this.lessThan(maxExclusive);
	}

	min(v: Vector) {
		return new Vector(Math.min(this.x, v.x), Math.min(this.y, v.y));
	}

	max(v: Vector) {
		return new Vector(Math.max(this.x, v.x), Math.max(this.y, v.y));
	}

	iterate(delta: Vector) {
		return util.arr(delta.x).flatMap(x =>
			util.arr(delta.y).flatMap(y =>
				new Vector(x, y).add(this)));
	}

	setMagnitude(magnitude: number) {
		return this.magnitude2 ?
			this.scale(magnitude / this.magnitude) :
			new Vector(magnitude, 0);
	}

	add(v: Vector) {
		return new Vector(this.x + v.x, this.y + v.y);
	}

	subtract(v: Vector) {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	scale(n: number) {
		return new Vector(this.x * n, this.y * n);
	}

	multiply(v: Vector) {
		return new Vector(this.x * v.x, this.y * v.y);
	}

	clamp(min: Vector, max: Vector) {
		return new Vector(util.clamp(this.x, min.x, max.x), util.clamp(this.y, min.y, max.y));
	}

	rotateCounter(degrees: number) {
		let cos = util.cos(degrees);
		let sin = util.sin(degrees);
		let x = this.x * cos - this.y * sin;
		let y = this.x * sin + this.y * cos;
		return new Vector(x, y);
	}
}
