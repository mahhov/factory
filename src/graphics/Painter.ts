import {Container} from 'pixi.js';

export default class Painter {
	readonly canvasWidth: number;
	readonly foregroundContainer: Container = new Container(); // (0,0) is the top-left of the word; (1,1) is the bottom-right of the world
	readonly uiContainer: Container = new Container(); // (0,0) is the  top-left of the canvas; (1,1) is the bottom-right of the canvas
	readonly textUiContainer: Container = new Container(); // (0,0) is the  top-left of the canvas; (1000,1000) is the bottom-right of the canvas

	constructor(canvasWidth: number, container: Container) {
		this.canvasWidth = canvasWidth;
		this.foregroundContainer.scale = canvasWidth;
		this.uiContainer.scale = canvasWidth;
		this.textUiContainer.scale = canvasWidth / 1000;
		container.addChild(this.foregroundContainer);
		container.addChild(this.uiContainer);
		container.addChild(this.textUiContainer);
	}
}
