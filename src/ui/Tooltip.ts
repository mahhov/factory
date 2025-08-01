import {Container, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Entity} from '../world/Entity.js';
import {WorldLayer} from '../world/World.js';
import {Input} from './Input.js';

class Selection {
	readonly canvasPosition: Vector;
	readonly worldPosition: Vector;
	readonly entity: Entity | null;

	constructor(canvasPosition: Vector, worldPosition: Vector, entity: Entity | null) {
		this.canvasPosition = canvasPosition;
		this.worldPosition = worldPosition;
		this.entity = entity;
	}
}

export default class Tooltip {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly worldLayer: WorldLayer;
	private readonly container = new Container();

	private entityClassRect = new Container();

	private selection: Selection | null = null;

	constructor(painter: Painter, camera: Camera, input: Input, worldLayer: WorldLayer) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.worldLayer = worldLayer;
		painter.textUiContainer.addChild(this.container);
	}

	private get inputSelection(): Selection {
		let canvasPosition = this.input.mousePosition.copy.scale(new Vector(1 / this.painter.canvasWidth));
		let worldPosition = this.camera.canvasToWorld(canvasPosition.copy)
			.scale(this.worldLayer.size).floor();
		let entity = this.worldLayer.getEntity(worldPosition);
		return new Selection(canvasPosition, worldPosition, entity);
	}

	toggleSelect() {
		let selection = this.inputSelection;
		this.selection =
			!this.selection?.worldPosition.equals(selection.worldPosition) && selection.entity ?
				selection :
				null;
		this.update(this.selection);
	}

	hover() {
		if (this.selection) return;
		this.update(this.inputSelection);
	}

	update(selection: Selection | null) {
		this.container.removeChildren();
		if (selection?.entity) {
			let y = 0;
			selection.entity.tooltip
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

			this.container.position = selection.canvasPosition
				.scale(new Vector(1000))
				.add(new Vector(10, 0));
		}
	}
}

// todo selection rect
// todo hide during placer active
