import {Container} from 'pixi.js';
import Painter from './graphics/Painter.js';
import Emitter from './util/Emitter.js';
import util from './util/util.js';
import Vector from './util/Vector.js';

let padding = .25;

export default class Camera extends Emitter<{ change: void }> {
	private targetLeftTop: Vector = new Vector(.4);
	private targetWidth: number = .2;
	private leftTop: Vector = new Vector(.4);
	private width: number = .2;
	readonly container: Container = new Container();

	constructor(painter: Painter) {
		super();
		painter.foregroundContainer.addChild(this.container);
		this.updateContainer();
	}

	private updateContainer() {
		this.container.scale = 1 / this.width;
		this.container.position = this.worldToCanvas(Vector.V0);
	}

	move(delta: Vector) {
		this.targetLeftTop = this.targetLeftTop.add(delta.scale(new Vector(this.targetWidth)));
		this.clamp();
	}

	zoom(delta: number, centerCanvas: Vector) {
		let centerWorld = this.canvasToWorld(centerCanvas);
		this.targetWidth = util.clamp(this.targetWidth + delta, .1, 1 + padding * 2);
		this.targetLeftTop = centerWorld.subtract(centerCanvas.scale(new Vector(this.targetWidth)));
		this.clamp();
	}

	clamp() {
		this.targetLeftTop = this.targetLeftTop.clamp(new Vector(-padding), new Vector(1 + padding).subtract(new Vector(this.targetWidth)));
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
		if (this.width === this.targetWidth && this.leftTop.equals(this.targetLeftTop))
			return;

		let lazy = .75;
		let e = .0001;

		if (Math.abs(this.width - this.targetWidth) < e)
			this.width = this.targetWidth;
		else
			this.width = this.width * lazy + this.targetWidth * (1 - lazy);

		if (this.leftTop.subtract(this.targetLeftTop).magnitude2 < e ** 2)
			this.leftTop = this.targetLeftTop;
		else
			this.leftTop = this.leftTop
				.scale(new Vector(lazy))
				.add(this.targetLeftTop.scale(new Vector(1 - lazy)));

		this.updateContainer();
		this.emit('change');
	}
}
