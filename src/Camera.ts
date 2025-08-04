import {Container} from 'pixi.js';
import Painter from './graphics/Painter.js';
import util from './util/util.js';
import Vector from './util/Vector.js';

export default class Camera {
	private targetLeftTop: Vector = new Vector();
	private targetWidth: number = 1;
	private leftTop: Vector = new Vector();
	private width: number = 1;
	readonly container: Container = new Container();

	constructor(painter: Painter) {
		painter.foregroundContainer.addChild(this.container);
	}

	move(delta: Vector) {
		this.targetLeftTop.add(delta.scale(new Vector(this.targetWidth)));
		// todo clamp
	}

	zoom(delta: number) {
		let centerWorld = this.canvasToWorld(new Vector(.5));
		this.targetWidth = util.clamp(this.targetWidth + delta, .1, 1.5);
		this.targetLeftTop = centerWorld.subtract(new Vector(this.targetWidth / 2));
	}

	worldToCanvas(world: Vector) {
		return world
			.subtract(this.leftTop)
			.scale(new Vector(1 / this.width));
	}

	canvasToWorld(canvas: Vector) {
		return canvas
			.scale(new Vector(this.width))
			.add(this.leftTop);
	}

	tick() {
		let lazy = .85;
		this.width = this.width * lazy + this.targetWidth * (1 - lazy);
		this.leftTop = this.leftTop
			.scale(new Vector(lazy))
			.add(this.targetLeftTop.copy.scale(new Vector(1 - lazy)));

		this.container.scale = 1 / this.width;
		this.container.position = this.worldToCanvas(new Vector());
	}
}
