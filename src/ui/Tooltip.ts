import {Container, Graphics} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Entity} from '../world/Entity.js';
import {TooltipType} from '../world/EntityAttribute.js';
import {Tile, World} from '../world/World.js';
import {Input} from './Input.js';
import MultilineText from './MultilineText.js';
import uiUtil from './uiUtil.js';

class Selection {
	readonly tile: Tile<Entity>;
	selected = false;

	constructor(tile: Tile<Entity>) {
		this.tile = tile;
	}
}

export default class Tooltip {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;
	private readonly multilineText: MultilineText;
	private readonly selectionRect = new Container();
	private selection: Selection | null = null;

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;
		this.multilineText = new MultilineText(painter);
		painter.uiContainer.addChild(this.selectionRect);
	}

	private get createInputSelection(): Selection | null {
		let canvasPosition = this.input.mousePosition.scale(new Vector(1 / this.painter.minCanvasSize));
		let worldPosition = this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
		let tile = [
			this.world.planning,
			this.world.queue,
			this.world.live,
			this.world.terrain,
		]
			.map(worldLayer => worldLayer.getTile(worldPosition))
			.find(tile => tile?.tileable.selectable);
		return tile ? new Selection(tile) : null;
	}

	toggleSelect() {
		if (uiUtil.mouseInContainer(this.input.mousePosition, this.multilineText.textContainer)) return;
		let selection = this.createInputSelection;
		if (!selection || !this.selection || this.selection.tile !== selection.tile)
			this.selection = selection;
		if (this.selection)
			this.selection.selected = !this.selection.selected;
	}

	unselect() {
		if (this.selection)
			this.selection.selected = false;
	}

	hover() {
		if (this.selection?.selected) return;
		this.selection = this.createInputSelection;
	}

	tick() {
		this.selectionRect.removeChildren();
		if (!this.selection) {
			this.multilineText.lines = [];
			this.multilineText.tick();
			return;
		}

		let topLeft = this.camera.worldToCanvas(this.selection.tile.position.scale(this.world.size.invert()));
		let bottomRight = this.camera.worldToCanvas(this.selection.tile.position.add(this.selection.tile.tileable.size).scale(this.world.size.invert()));
		let bottomRightShift = bottomRight.add(new Vector(3 / 1000));
		let size = bottomRight.subtract(topLeft);

		this.multilineText.position = bottomRightShift;
		this.multilineText.lines = this.selection.tile.tileable.tooltip(this.input.shiftDown ? TooltipType.PLACER : TooltipType.WORLD);
		this.multilineText.tick();

		this.selectionRect.addChild(new Graphics()
			.rect(topLeft.x, topLeft.y, size.x, size.y)
			.stroke({width: (this.selection.selected ? 3 : 1) / this.painter.minCanvasSize, color: this.selection.selected ? Color.SELECTED_RECT_OUTLINE : Color.RECT_OUTLINE}));
	}
}
