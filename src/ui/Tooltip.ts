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
	readonly selected: boolean;

	constructor(tile: Tile<Entity>, selected: boolean) {
		this.tile = tile;
		this.selected = selected;
	}
}

export default class Tooltip {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;
	private readonly multilineText: MultilineText;
	private readonly selectionRect = new Container();
	private cachedSelection: Selection | null = null;
	private selection: Selection | null = null;

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;
		this.multilineText = new MultilineText(painter);
		painter.uiContainer.addChild(this.selectionRect);
		painter.addListener('resize', () => this.dirty());
	}

	private get inputTile(): Tile<Entity> | null {
		let canvasPosition = this.input.mousePosition.scale(new Vector(1 / this.painter.minCanvasSize));
		let worldPosition = this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
		return [
			this.world.planning,
			this.world.queue,
			this.world.live,
			this.world.terrain,
		]
			.map(worldLayer => worldLayer.getTile(worldPosition))
			.find(tile => tile?.tileable.selectable) || null;
	}

	toggleSelect() {
		if (uiUtil.mouseInContainer(this.input.mousePosition, this.multilineText.textContainer)) return;
		let tile = this.inputTile;
		if (!tile)
			this.selection = null;
		else if (this.selection?.tile === tile)
			this.selection = new Selection(tile, !this.selection.selected);
		else
			this.selection = new Selection(tile, true);
	}

	unselect() {
		if (this.selection?.selected)
			this.selection = new Selection(this.selection.tile, false);
	}

	hover() {
		if (this.selection?.selected) return;
		let tile = this.inputTile;
		if (!tile)
			this.selection = null;
		else if (this.selection?.tile !== tile)
			this.selection = new Selection(tile, false);
	}

	dirty() {
		this.cachedSelection = null;
	}

	tick() {
		if (!this.selection) {
			this.selectionRect.removeChildren();
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

		if (this.cachedSelection !== this.selection) {
			this.cachedSelection = this.selection;
			this.selectionRect.removeChildren();
			this.selectionRect.addChild(new Graphics()
				.rect(topLeft.x, topLeft.y, size.x, size.y)
				.stroke({width: (this.selection.selected ? 3 : 1) / this.painter.minCanvasSize, color: this.selection.selected ? Color.SELECTED_RECT_OUTLINE : Color.RECT_OUTLINE}));
		}
	}
}
