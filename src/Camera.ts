import {Application, Container} from 'pixi.js';
import util from './util.js';
import Vector from './Vector.js';

class Camera {
	private readonly canvasWidth: number;
	private targetLeftTop: Vector = new Vector();
	private targetWidth: number = 1;
	private leftTop: Vector = new Vector();
	private width: number = 1;
	container: Container = new Container();

	constructor(app: Application) {
		this.canvasWidth = app.renderer.width;
		app.stage.addChild(this.container);
	}

	move(delta: Vector) {
		this.targetLeftTop.add(delta.scale(this.targetWidth));
		// todo clamp
	}

	zoom(delta: number) {
		let centerWorld = this.canvasToWorld(new Vector(this.canvasWidth / 2, this.canvasWidth / 2));
		this.targetWidth = util.clamp(this.targetWidth + delta, .1, 1.5);
		this.targetLeftTop = centerWorld.subtract(new Vector(this.targetWidth / 2));
	}

	// world [0, 1]; canvas [0, 1400px]
	private worldToCanvas(world: Vector) {
		return world
			.subtract(this.leftTop)
			.scale(1 / this.width * this.canvasWidth);
	}

	canvasToWorld(canvas: Vector) {
		return canvas
			.scale(1 / this.canvasWidth * this.width)
			.add(this.leftTop);
	}

	tick() {
		let lazy = .85;
		this.width = this.width * lazy + this.targetWidth * (1 - lazy);
		this.leftTop = this.leftTop.scale(lazy).add(this.targetLeftTop.copy.scale(1 - lazy));

		this.container.scale = this.canvasWidth / this.width;
		this.container.position = this.worldToCanvas(new Vector());
	}
}

export default Camera;
