import {Container} from 'pixi.js';
import Painter from './graphics/Painter.js';
import util from './util/util.js';
import Vector2 from './util/Vector2.js';

let padding = .25;

export default class Camera {
	private targetLeftTop: Vector2 = new Vector2();
	private targetWidth: number = 1;
	private leftTop: Vector2 = new Vector2();
	private width: number = 1;
	readonly container: Container = new Container();

	constructor(painter: Painter) {
		painter.foregroundContainer.addChild(this.container);
	}

	move(delta: Vector2) {
		this.targetLeftTop = this.targetLeftTop.add(delta.scale(new Vector2(this.targetWidth)));
		this.clamp();
	}

	zoom(delta: number) {
		let centerWorld = this.canvasToWorld(new Vector2(.5));
		this.targetWidth = util.clamp(this.targetWidth + delta, .1, 1 + padding * 2);
		this.targetLeftTop = centerWorld.subtract(new Vector2(this.targetWidth / 2));
		this.clamp();
	}

	clamp() {
		this.targetLeftTop = this.targetLeftTop.clamp(new Vector2(-padding), new Vector2(1 + padding).subtract(new Vector2(this.targetWidth)));
	}

	worldToCanvas(world: Vector2) {
		return world
			.subtract(this.leftTop)
			.scale(new Vector2(1 / this.width));
	}

	canvasToWorld(canvas: Vector2) {
		return canvas
			.scale(new Vector2(this.width))
			.add(this.leftTop);
	}

	tick() {
		let lazy = .85;
		this.width = this.width * lazy + this.targetWidth * (1 - lazy);
		this.leftTop = this.leftTop
			.scale(new Vector2(lazy))
			.add(this.targetLeftTop.scale(new Vector2(1 - lazy)));

		this.container.scale = 1 / this.width;
		this.container.position = this.worldToCanvas(new Vector2());
	}
}
