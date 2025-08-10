import {Container, Graphics, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Entity} from '../world/Entity.js';
import {WorldLayer} from '../world/World.js';
import {Input} from './Input.js';
import TooltipLine from './TooltipLine.js';
import uiUtil from './uiUtil.js';
import mouseInContainer = uiUtil.mouseInContainer;

class Selection {
	readonly worldPosition: Vector;
	readonly entity: Entity;
	selected = false;

	constructor(worldPosition: Vector, entity: Entity) {
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
		if (mouseInContainer(this.input.mousePosition, this.textContainer)) return;
		let selection = this.createInputSelection;
		if (!selection || !this.selection || !this.selection.worldPosition.equals(selection.worldPosition))
			this.selection = selection;
		if (this.selection)
			this.selection.selected = !this.selection.selected;
	}

	unselect() {
		this.selection = null;
	}

	hover() {
		if (this.selection?.selected) return;
		this.selection = this.createInputSelection;
	}

	tick() {
		this.selectionRect.removeChildren();
		if (!this.selection) {
			this.textContainer.removeChildren();
			return;
		}

		let y = 0;
		util.replace<TooltipLine, Text>(this.textContainer.children as Text[], this.selection.entity.tooltip,
			(i: number, tooltipLines: TooltipLine[]) => {
				let text = new Text({eventMode: 'static'});
				this.textContainer.addChild(text);
				text.on('pointertap', tooltipLines[i].callback);
			},
			(text: Text, i: number, tooltipLine: TooltipLine) => {
				text.text = tooltipLine.string;
				text.style = {
					fontFamily: 'Arial',
					fontSize: tooltipLine.size,
					fill: tooltipLine.color,
				};
				text.y = y;
				y += text.height;
			},
			() =>
				this.textContainer.removeChildAt(this.textContainer.children.length - 1));

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
