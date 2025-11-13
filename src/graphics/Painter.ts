import {Container} from 'pixi.js';
import Vector from '../util/Vector.js';

export default class Painter {
	// todo make canvasWidth private and make users use an alternative that doesn't get stale
	minCanvasSize!: number;
	readonly foregroundContainer: Container = new Container(); // (0,0) is the top-left of the word; (1,1) is the bottom-right of the world
	readonly uiContainer: Container = new Container(); // (0,0) is the top-left of the canvas; (1,1) is the bottom-right of the canvas
	readonly textUiContainer: Container = new Container(); // (0,0) is the top-left of the canvas; (1000,1000) is the bottom-right of the canvas

	constructor(container: Container) {
		this.foregroundContainer.eventMode = 'none';
		this.textUiContainer.eventMode = 'none';
		container.addChild(this.foregroundContainer);
		container.addChild(this.uiContainer);
		container.addChild(this.textUiContainer);
	}

	resize(canvasSize: Vector) {
		this.minCanvasSize = Math.min(canvasSize.x, canvasSize.y);
		this.foregroundContainer.scale = this.minCanvasSize;
		this.uiContainer.scale = this.minCanvasSize;
		this.textUiContainer.scale = this.minCanvasSize / 1000;
	}
}
