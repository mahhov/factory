import {Container, Graphics} from 'pixi.js';
import Camera from '../Camera.js';
import uiColors from '../graphics/uiColors.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Entity} from '../world/Entity.js';
import {TooltipType} from '../world/EntityAttribute.js';
import {SpriteHolder, Tile, World} from '../world/World.js';
import {Input} from './Input.js';
import MultilineText from './MultilineText.js';
import uiUtil from './uiUtil.js';

class Selection {
	readonly tile: Tile<SpriteHolder | Entity>;
	readonly selected: boolean;

	constructor(tile: Tile<SpriteHolder | Entity>, selected: boolean) {
		this.tile = tile;
		this.selected = selected;
	}
}

export default class WorldTooltip {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;
	private readonly multilineText: MultilineText;
	private readonly container = new Container();
	private cachedSelection: Selection | null = null;
	private selection: Selection | null = null;

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;
		this.multilineText = new MultilineText(painter);
		painter.uiContainer.addChild(this.container);
		painter.addListener('resize', () => this.dirty());
	}

	private get inputTile(): Tile<SpriteHolder | Entity> | null {
		let worldPosition = this.camera.canvasToWorld(this.input.mouseCanvasPosition).multiply(this.world.size).floor;
		return [
			this.world.planning,
			this.world.queue,
			this.world.live,
			this.world.terrain,
		]
			.map(worldLayer => worldLayer.getTileBounded(worldPosition))
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

	hide() {
		this.selection = null;
	}

	dirty() {
		this.cachedSelection = null;
	}

	tick() {
		// todo are we calling tick too often
		if (!this.selection) {
			this.container.removeChildren();
			this.multilineText.lines = [];
			this.multilineText.tick();
			return;
		}

		let outline = this.tileToCanvas(this.selection.tile.position, this.selection.tile.tileable.size);

		this.multilineText.position = outline.bottomRight.add(new Vector(3 / 1000));
		this.multilineText.lines = this.selection.tile.tileable.tooltip(this.input.shiftDown ? TooltipType.PLACER : TooltipType.WORLD);
		this.multilineText.tick();

		if (this.cachedSelection !== this.selection) {
			this.cachedSelection = this.selection;
			this.container.removeChildren();
			this.container.addChild(new Graphics()
				.rect(outline.topLeft.x, outline.topLeft.y, outline.size.x, outline.size.y)
				.stroke({width: (this.selection.selected ? 3 : 1) / this.painter.minCanvasSize, color: this.selection.selected ? uiColors.SELECTED_RECT_OUTLINE : uiColors.RECT_OUTLINE}));
			let range = this.selection.tile.tileable.tooltipRange;
			if (range) {
				let rangeV = new Vector(range);
				let rangeCircle = this.tileToCanvas(this.selection.tile.position.add(this.selection.tile.tileable.size.scale(.5)), rangeV);
				this.container.addChild(new Graphics()
					.circle(rangeCircle.topLeft.x, rangeCircle.topLeft.y, rangeCircle.size.x)
					.stroke({width: 1 / this.painter.minCanvasSize, color: uiColors.RECT_OUTLINE}));
			}
		}
	}

	tileToCanvas(position: Vector, size: Vector) {
		let topLeft = this.camera.worldToCanvas(position.multiply(this.world.size.invert));
		let bottomRight = this.camera.worldToCanvas(position.add(size).multiply(this.world.size.invert));
		return {topLeft, bottomRight, size: bottomRight.subtract(topLeft)};
	}
}
