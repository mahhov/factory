import {Container} from 'pixi.js';

export default class Painter {
	readonly canvasWidth: number;
	readonly foregroundContainer: Container = new Container();
	readonly uiContainer: Container = new Container();
	readonly textUiContainer: Container = new Container();

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
