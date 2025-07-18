import {Container} from 'pixi.js';

class Painter {
	readonly canvasWidth: number;
	readonly foregroundContainer: Container = new Container();
	readonly uiContainer: Container = new Container();

	constructor(canvasWidth: number, container: Container) {
		this.canvasWidth = canvasWidth;
		this.foregroundContainer.scale = canvasWidth;
		this.uiContainer.scale = canvasWidth;
		container.addChild(this.foregroundContainer);
		container.addChild(this.uiContainer);
	}
}

export default Painter;
