import {Container, Text} from 'pixi.js';
import Camera from './Camera.js';
import {Input} from './Input.js';
import Painter from './Painter.js';
import Vector from './Vector.js';
import {WorldLayer} from './World.js';

class Tooltip {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly worldLayer: WorldLayer;
	private worldPosition = new Vector();
	private readonly container = new Container();
	private readonly texts: Text[] = [];

	constructor(painter: Painter, camera: Camera, input: Input, worldLayer: WorldLayer) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.worldLayer = worldLayer;
		painter.textUiContainer.addChild(this.container);
		// this.text = new Text({
		// 	style: {
		// 		fontFamily: 'Arial',
		// 		fontSize: 16,
		// 		fill: '#ffffff',
		// 	},
		// });
		// painter.textUiContainer.addChild(this.text);
	}

	reposition() {
		let canvasPosition = this.input.mousePosition.copy.scale(new Vector(1 / this.painter.canvasWidth));
		let worldPosition = this.camera.canvasToWorld(canvasPosition.copy)
			.scale(this.worldLayer.size).floor();
		if (!this.worldPosition.equals(worldPosition)) {
			this.worldPosition = worldPosition;
			this.container.removeChildren();
			let entity = this.worldLayer.getEntity(this.worldPosition);
			let y = 0;
			(entity?.tooltip || [])
				.map(tooltipLine => new Text({
					text: tooltipLine.string,
					style: {
						fontFamily: 'Arial',
						fontSize: tooltipLine.size,
						fill: tooltipLine.color,
					},
				}))
				.forEach(text => {
					text.y = y;
					y += text.height;
					this.container.addChild(text);
				});

			// this.text.text = entity?.tooltip.join('\n') || '';
		}

		this.container.position = canvasPosition
			.scale(new Vector(1000))
			.add(new Vector(10, 0));
	}
}

export default Tooltip;
