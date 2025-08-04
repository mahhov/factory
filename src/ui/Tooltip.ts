import {Container, Graphics, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Entity} from '../world/Entity.js';
import {WorldLayer} from '../world/World.js';
import {Input} from './Input.js';

class Selection {
	readonly worldPosition: Vector;
	readonly entity: Entity | null;
	selected = false;

	constructor(worldPosition: Vector, entity: Entity | null) {
		this.worldPosition = worldPosition;
		this.entity = entity;
	}
}

export default class Tooltip {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly worldLayer: WorldLayer;

	private readonly textContainer = new Container();
	private readonly selectionRect = new Container();

	private selection: Selection | null = null;

	constructor(painter: Painter, camera: Camera, input: Input, worldLayer: WorldLayer) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.worldLayer = worldLayer;
		painter.textUiContainer.addChild(this.textContainer);
		painter.uiContainer.addChild(this.selectionRect);
	}

	private get createInputSelection(): Selection | null {
		let canvasPosition = this.input.mousePosition.copy.scale(new Vector(1 / this.painter.canvasWidth));
		let worldPosition = this.camera.canvasToWorld(canvasPosition.copy)
			.scale(this.worldLayer.size).floor();
		let entity = this.worldLayer.getEntity(worldPosition);
		if (!entity?.selectable)
			return null;
		return new Selection(worldPosition, entity);
	}

	toggleSelect() {
		let selection = this.createInputSelection;
		if (!selection || !this.selection || !this.selection.worldPosition.equals(selection.worldPosition))
			this.selection = selection;
		if (this.selection)
			this.selection.selected = !this.selection.selected;
		this.update();
	}

	hover() {
		if (this.selection?.selected) return;
		this.selection = this.createInputSelection;
		this.update();
	}

	update() {
		this.textContainer.removeChildren();
		if (!this.selection?.entity) return;

		let y = 0;
		this.selection.entity.tooltip
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
				this.textContainer.addChild(text);
			});
	}

	tick() {
		this.selectionRect.removeChildren();
		if (!this.selection) return;

		let topLeft = this.camera.worldToCanvas(this.selection.worldPosition.copy.scale(this.worldLayer.size.invert()));
		let bottomRight = this.camera.worldToCanvas(this.selection.worldPosition.copy.add(new Vector(1)).scale(this.worldLayer.size.invert()));
		let size = bottomRight.copy.subtract(topLeft);

		this.textContainer.position =
			bottomRight
				.scale(new Vector(1000))
				.add(new Vector(3));

		this.selectionRect.addChild(new Graphics()
			.rect(topLeft.x, topLeft.y, size.x, size.y)
			.stroke({width: (this.selection.selected ? 3 : 1) / this.painter.canvasWidth, color: this.selection.selected ? Color.SELECTED_RECT_OUTLINE : Color.RECT_OUTLINE}));
	}
}
