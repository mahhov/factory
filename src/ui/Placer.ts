import {Container, Graphics, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Painter from '../graphics/Painter.js';
import uiColors from '../graphics/uiColors.js';
import Emitter from '../util/Emitter.js';
import {toTitleCase} from '../util/stringCase.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty} from '../world/Entity.js';
import {EntityNameAttribute, TooltipType} from '../world/EntityAttribute.js';
import {Rotation, RotationUtils} from '../world/Rotation.js';
import {SpriteHolder, World} from '../world/World.js';
import EntityCreator, {Tool} from './EntityCreator.js';
import {Input} from './Input.js';
import MultilineText, {Anchor} from './MultilineText.js';
import TextLine from './TextLine.js';

export enum PlacerState {
	EMPTY, ENTITY_SELECTED, STARTED
}

let toolTree = {
	extractors: [Tool.EXTRACTOR, Tool.REINFORCED_EXTRACTOR, Tool.QUADRATIC_EXTRACTOR, Tool.LASER_EXTRACTOR],
	transport: [Tool.CONVEYOR, Tool.HIGH_SPEED_CONVEYOR, Tool.DISTRIBUTOR, Tool.JUNCTION, Tool.PACKED_CONVEYOR, Tool.STORAGE, Tool.DISPENSER],
	factories: [Tool.STEEL_SMELTER, Tool.METAGLASS_FOUNDRY, Tool.PLASTEEL_MIXER, Tool.THERMITE_FORGE, Tool.EXIDIUM_CATALYST],
	power: [Tool.THERMAL_GENERATOR, Tool.SOLAR_ARRAY, Tool.METHANE_BURNER, Tool.GRAPHITE_BURNER, Tool.THERMITE_REACTOR, Tool.CONDUCTOR, Tool.BATTERY],
	vents: [Tool.AIR_VENT, Tool.WATER_VENT, Tool.METHANE_VENT],
	liquidExtractors: [Tool.PUMP, Tool.POWERED_PUMP, Tool.WELL],
	liquidTransport: [Tool.PIPE, Tool.PIPE_BRIDGE, Tool.PIPE_DISTRIBUTOR, Tool.PIPE_JUNCTION, Tool.TANK],
	walls: [Tool.STEEL_WALL, Tool.TITANIUM_WALL],
	turrets: [Tool.SHRAPNEL_TURRET /*, Tool.PIERCING_TURRET, Tool.ARC_TURRET, Tool.SIEGE_TURRET, Tool.LASER_TURRET*/],
};
type ToolGroup = keyof typeof toolTree;

export default class Placer extends Emitter<{ toolChanged: void }> {
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;
	private readonly toolGroupIconContainer = new Container();
	private readonly toolGroupTextContainer = new Container();
	private readonly toolGroupSelectionRect = new Graphics();
	private readonly toolIconContainer = new Container();
	private readonly toolTextContainer = new Container();
	private readonly toolSelectionRect = new Graphics();
	private readonly multilineText;
	private started = false;
	private rotation = Rotation.UP;
	private toolGroup!: ToolGroup;
	private tool!: Tool;
	private startPosition = Vector.V0;
	private endPosition = Vector.V0;
	private spriteHolders: SpriteHolder[] = [];

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		super();
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;

		painter.uiContainer.addChild(this.toolGroupIconContainer);
		painter.textUiContainer.addChild(this.toolGroupTextContainer);
		this.toolGroupIconContainer.addChild(this.toolGroupSelectionRect);
		painter.uiContainer.addChild(this.toolIconContainer);
		painter.textUiContainer.addChild(this.toolTextContainer);
		this.toolIconContainer.addChild(this.toolSelectionRect);

		painter.addListener('resize', () => {
			this.toolGroupSelectionRect
				.clear()
				.rect(0, 0, ...Placer.toolUiCoordinates(true, 0)[1])
				.stroke({width: 3 / painter.minCanvasSize, color: uiColors.SELECTED_RECT_OUTLINE, alignment: -.5});
			this.toolSelectionRect
				.clear()
				.rect(0, 0, ...Placer.toolUiCoordinates(false, 0)[1])
				.stroke({width: 3 / painter.minCanvasSize, color: uiColors.SELECTED_RECT_OUTLINE, alignment: -.5});
		});

		this.multilineText = new MultilineText(painter);
		this.multilineText.anchor = Anchor.BOTTOM_LEFT;

		this.setToolGroupAndTool(Object.keys(toolTree)[0] as ToolGroup, Tool.EMPTY);
	}

	private static toolUiCoordinates(group: boolean, index: number): [number, number][] {
		let toolGroupSize = .02, toolSize = .035, margin = .005;
		let size = group ? toolGroupSize : toolSize;
		let y = 1 - margin - toolSize;
		if (group)
			y = y - margin - toolGroupSize;
		let x = margin + index * (size + margin);
		return [[x, y], [size, size]];
	}

	private get position(): Vector {
		return this.camera.canvasToWorld(this.input.mouseCanvasPosition).multiply(this.world.size).floor;
	}

	setToolGroupIndex(index: number) {
		let toolGroup = Object.keys(toolTree)[index] as ToolGroup;
		if (toolGroup === undefined) return;
		let tool = toolTree[toolGroup][0];
		this.setToolGroupAndTool(toolGroup, tool);
	}

	toggleToolIndex(index: number) {
		let tool = toolTree[this.toolGroup][index];
		if (tool === undefined) return;
		if (tool === this.tool)
			tool = Tool.EMPTY;
		this.setToolGroupAndTool(this.toolGroup, tool);
	}

	clearTool() {
		this.setToolGroupAndTool(this.toolGroup, Tool.CLEAR);
	}

	pick() {
		let tile = this.world.queue.getTileBounded(this.position);
		if (tile?.tileable instanceof Empty)
			tile = this.world.live.getTileUnchecked(this.position);
		let tool: Tool = tile ?
			util.enumValues(Tool).find(tool =>
				EntityCreator.cachedToolEntities[tool].getAttribute(EntityNameAttribute)?.name ===
				tile.tileable.getAttribute(EntityNameAttribute)?.name) || Tool.EMPTY
			: Tool.EMPTY;

		let toolGroup = tool !== Tool.EMPTY ?
			Object.entries(toolTree).find(([_, tools]) => tools.includes(tool))?.[0] as ToolGroup | undefined :
			this.toolGroup;
		if (toolGroup)
			this.setToolGroupAndTool(toolGroup, tool);
	}

	private setToolGroupAndTool(toolGroup: ToolGroup, tool: Tool) {
		console.assert(tool === Tool.EMPTY || tool === Tool.CLEAR || toolTree[toolGroup].includes(tool));

		if (this.toolGroupIconContainer.children.length === 1) {
			// redraw top row
			Object.values(toolTree).forEach((tools, i) => {
				let coordinates = Placer.toolUiCoordinates(true, i);
				let spriteContainer = EntityCreator.createToolEntity(tools[0]).container;
				this.addToolUiButton(coordinates, this.toolGroupIconContainer, spriteContainer!, this.toolGroupTextContainer, '^' + (i + 1));
				spriteContainer!.eventMode = 'static';
				spriteContainer!.onclick = () => this.setToolGroupIndex(i);
				spriteContainer!.onmouseenter = () => this.showToolGroupTooltip(i);
				spriteContainer!.onmouseleave = () => this.hideTooltip();
			});
		}

		if (this.toolGroup !== toolGroup) {
			this.toolGroup = toolGroup;
			// redraw top row selection
			let index = Object.keys(toolTree).indexOf(toolGroup);
			[this.toolGroupSelectionRect.x, this.toolGroupSelectionRect.y] = Placer.toolUiCoordinates(true, index)[0];
			// redraw bottom row
			this.toolIconContainer.removeChildren();
			this.toolTextContainer.removeChildren();
			toolTree[toolGroup].forEach((tool, i) => {
				let coordinates = Placer.toolUiCoordinates(false, i);
				this.addToolUiButton(coordinates, this.toolIconContainer, EntityCreator.cachedToolEntities[tool].container!, this.toolTextContainer, String(i + 1));
				EntityCreator.cachedToolEntities[tool].container!.eventMode = 'static';
				EntityCreator.cachedToolEntities[tool].container!.onclick = () => this.toggleToolIndex(i);
				EntityCreator.cachedToolEntities[tool].container!.onmouseenter = () => this.showToolTooltip(i);
				EntityCreator.cachedToolEntities[tool].container!.onmouseleave = () => this.hideTooltip();
			});
		}

		if (this.tool !== tool) {
			this.tool = tool;
			// redraw bottom selection
			let index = toolTree[this.toolGroup].indexOf(tool);
			if (tool === Tool.EMPTY || tool === Tool.CLEAR)
				this.toolIconContainer.removeChild(this.toolSelectionRect);
			else {
				[this.toolSelectionRect.x, this.toolSelectionRect.y] = Placer.toolUiCoordinates(false, index)[0];
				this.toolIconContainer.addChild(this.toolSelectionRect);
			}
			// redraw planned entities
			if (this.state !== PlacerState.EMPTY || this.started)
				this.place(this.world, true, false);
			else
				this.world.planning.clearAllEntities();
			this.emit('toolChanged');
		}
	}

	private addToolUiButton(coordinates: [number, number][], iconContainer: Container, spriteContainer: Container, textContainer: Container, text: string) {
		[spriteContainer.x, spriteContainer.y] = coordinates[0];
		[spriteContainer.width, spriteContainer.height] = coordinates[1];
		iconContainer.addChild(spriteContainer);
		textContainer.addChild(new Text({
			text,
			style: {
				fontFamily: 'Arial',
				fontSize: 10,
				fill: uiColors.DEFAULT_TEXT,
			},
			x: coordinates[0][0] * 1000 + 1,
			y: coordinates[0][1] * 1000 - 1,
		}));
	}

	rotate(delta: number) {
		this.rotation = (this.rotation + delta + 4) % 4;
		this.place(this.world, true, false);
	}

	start() {
		if (this.started) {
			this.started = false;
			this.world.planning.clearAllEntities();
			if (this.tool === Tool.CLEAR)
				this.tool = Tool.EMPTY;
		} else {
			this.started = true;
			this.endPosition = this.startPosition = this.position;
		}
	}

	move() {
		let position = this.position;
		if (position.equals(this.endPosition)) return;

		if (!this.started)
			this.startPosition = position;
		this.endPosition = position;

		if (this.state !== PlacerState.EMPTY || this.started)
			this.place(this.world, true, this.started);
	}

	end() {
		if (!this.started) return;
		this.started = false;
		this.place(this.world, false, false);
		if (this.tool === Tool.CLEAR)
			this.tool = Tool.EMPTY;
	}

	private getSpriteHolder(index: number) {
		this.spriteHolders[index] ||= new SpriteHolder();
		return this.spriteHolders[index];
	}

	private place(world: World, planning: boolean, updateRotation: boolean) {
		let toolEntity = EntityCreator.cachedToolEntities[this.tool];
		let delta = this.endPosition.subtract(this.startPosition);
		let iterations = delta
			.abs
			.add(Vector.V1)
			.add(
				delta
					.sign
					.min(Vector.V0)
					.abs
					.multiply(toolEntity.size.subtract(Vector.V1)))
			.multiply(toolEntity.tilingSize.invert)
			.ceil;
		this.world.planning.clearAllEntities();

		let minPosition = this.startPosition.min(this.endPosition).clamp(Vector.V0, world.size.subtract(Vector.V1));
		let maxPosition = this.startPosition.max(this.endPosition).clamp(Vector.V0, world.size.subtract(Vector.V1));
		let i = 0;
		for (let x = minPosition.x; x <= maxPosition.x; x += toolEntity.tilingSize.x)
			for (let y = minPosition.y; y <= maxPosition.y; y += toolEntity.tilingSize.y)
				if (planning) {
					let spriteHolder = this.getSpriteHolder(i++);
					spriteHolder.setEntity(toolEntity, this.rotation);
					world.planning.addTileableUnchecked(new Vector(x, y), spriteHolder);
				} else
					world.queue.replaceTileable(new Vector(x, y), EntityCreator.createToolEntity(this.tool, this.rotation));
		return;

		if (this.tool === Tool.CLEAR || this.tool === Tool.STEEL_WALL || this.tool === Tool.TITANIUM_WALL) {
			let minPosition = this.startPosition.min(this.endPosition).clamp(Vector.V0, world.size.subtract(Vector.V1));
			let maxPosition = this.startPosition.max(this.endPosition).clamp(Vector.V0, world.size.subtract(Vector.V1));
			let i = 0;
			for (let x = minPosition.x; x <= maxPosition.x; x++)
				for (let y = minPosition.y; y <= maxPosition.y; y++)
					if (planning) {
						let spriteHolder = this.getSpriteHolder(i++);
						spriteHolder.setEntity(toolEntity, this.rotation);
						world.planning.addTileableUnchecked(new Vector(x, y), spriteHolder);
					} else
						world.queue.replaceTileable(new Vector(x, y), EntityCreator.createToolEntity(this.tool, this.rotation));

		} else {
			let vertical = Math.abs(delta.y) > Math.abs(delta.x);
			let rotation = vertical ?
				delta.y > 0 ? Rotation.DOWN : Rotation.UP :
				delta.x > 0 ? Rotation.RIGHT : Rotation.LEFT;
			if (updateRotation && (delta.y || delta.x))
				this.rotation = rotation;

			let position = this.startPosition;
			let n = vertical ? iterations.y : iterations.x;
			let iterDelta = RotationUtils.positionShift(rotation).multiply(toolEntity.tilingSize);
			for (let i = 0; i < n; i++) {
				if (planning && world.planning.inBounds(position, toolEntity.size)) {
					let spriteHolder = this.getSpriteHolder(i);
					spriteHolder.setEntity(toolEntity, this.rotation);
					world.planning.addTileableUnchecked(position, spriteHolder);
				} else if (!planning)
					world.queue.replaceTileable(position, EntityCreator.createToolEntity(this.tool, this.rotation));
				position = position.add(iterDelta);
			}
		}
	}

	get state() {
		if (this.started)
			return PlacerState.STARTED;
		if (this.tool !== Tool.EMPTY)
			return PlacerState.ENTITY_SELECTED;
		return PlacerState.EMPTY;
	}

	private showToolGroupTooltip(index: number) {
		this.multilineText.lines = [new TextLine(toTitleCase(Object.keys(toolTree)[index] as ToolGroup), {color: uiColors.NAME_TEXT})];
		let coordinates = Placer.toolUiCoordinates(true, index);
		this.multilineText.position = new Vector(coordinates[0][0], coordinates[0][1]);
		this.multilineText.tick();
		this.painter.textUiContainer.removeChild(this.toolGroupTextContainer);
		this.painter.textUiContainer.removeChild(this.toolTextContainer);
	}

	private showToolTooltip(index: number) {
		let toolEntity = EntityCreator.cachedToolEntities[toolTree[this.toolGroup][index]];
		this.multilineText.lines = toolEntity.tooltip(TooltipType.PLACER);
		let coordinates = Placer.toolUiCoordinates(false, index);
		this.multilineText.position = new Vector(coordinates[0][0], coordinates[0][1]);
		this.multilineText.tick();
		this.painter.textUiContainer.removeChild(this.toolGroupTextContainer);
		this.painter.textUiContainer.removeChild(this.toolTextContainer);
	}

	private hideTooltip() {
		this.multilineText.lines = [];
		this.multilineText.tick();
		this.painter.textUiContainer.addChild(this.toolGroupTextContainer);
		this.painter.textUiContainer.addChild(this.toolTextContainer);
	}

	get tooltipVisible(): boolean {
		return !!this.multilineText.lines.length;
	}
}

// todo: make pipes leak
