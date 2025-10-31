import {Container, Graphics, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Conveyor, Distributor, Empty, Entity, Extractor, GlassFactory, Junction, Turret, Wall} from '../world/Entity.js';
import {Rotation, RotationUtils} from '../world/Rotation.js';
import {GridWorldLayer, World} from '../world/World.js';
import {Input} from './Input.js';

export enum PlacerState {
	EMPTY, ENTITY_SELECTED, STARTED
}

enum Tool {
	EMPTY, WALL, CONVEYOR, DISTRIBUTOR, JUNCTION, EXTRACTOR, GLASS_FACTORY, TURRET,
}

let toolTree = {
	walls: [Tool.WALL],
	transport: [Tool.CONVEYOR, Tool.DISTRIBUTOR, Tool.JUNCTION],
	extractors: [Tool.EXTRACTOR],
	factories: [Tool.GLASS_FACTORY],
	turrets: [Tool.TURRET],
};
type ToolGroup = keyof typeof toolTree;

export default class Placer {
	private static cachedToolEntities_: Record<Tool, Entity>;
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;
	private readonly toolGroupIconContainer = new Container();
	private readonly toolGroupTextContainer = new Container();
	private readonly toolGroupSelectionRect = new Container();
	private readonly toolIconContainer = new Container();
	private readonly toolTextContainer = new Container();
	private readonly toolSelectionRect = new Container();
	private started = false;
	private rotation = Rotation.RIGHT;
	private toolGroup!: ToolGroup;
	private tool!: Tool;
	private startPosition = Vector.V0;
	private endPosition = Vector.V0;

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;

		painter.uiContainer.addChild(this.toolGroupIconContainer);
		painter.textUiContainer.addChild(this.toolGroupTextContainer);
		this.toolGroupIconContainer.addChild(this.toolGroupSelectionRect);
		this.toolGroupSelectionRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.toolUiCoordinates(true, 0)[1])
			.stroke({width: 3 / painter.canvasWidth, color: Color.SELECTED_RECT_OUTLINE}));
		painter.uiContainer.addChild(this.toolIconContainer);
		painter.textUiContainer.addChild(this.toolTextContainer);
		this.toolIconContainer.addChild(this.toolSelectionRect);
		this.toolSelectionRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.toolUiCoordinates(false, 0)[1])
			.stroke({width: 3 / painter.canvasWidth, color: Color.SELECTED_RECT_OUTLINE}));

		this.setToolGroupAndTool('walls', Tool.EMPTY);
	}

	private static get cachedToolEntities() {
		Placer.cachedToolEntities_ ||= Object.fromEntries(util.enumValues(Tool).map(tool => [tool, Placer.createToolEntity(tool, Rotation.RIGHT)])) as Record<Tool, Entity>;
		return Placer.cachedToolEntities_;
	}

	private static createToolEntity(tool: Tool, rotation: Rotation): Entity {
		switch (tool) {
			case Tool.EMPTY:
				return new Empty();
			case Tool.WALL:
				return new Wall();
			case Tool.CONVEYOR:
				return new Conveyor(rotation);
			case Tool.DISTRIBUTOR:
				return new Distributor();
			case Tool.JUNCTION:
				return new Junction();
			case Tool.EXTRACTOR:
				return new Extractor();
			case Tool.GLASS_FACTORY:
				return new GlassFactory();
			case Tool.TURRET:
				return new Turret();
		}
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
		let canvasPosition = this.input.mousePosition.scale(new Vector(1 / this.painter.canvasWidth));
		return this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
	}

	setToolGroupIndex(index: number) {
		let toolGroup = Object.keys(toolTree)[index] as ToolGroup | undefined;
		if (!toolGroup) return;
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
		this.setToolGroupAndTool(this.toolGroup, Tool.EMPTY);
	}

	pick() {
		let tile = this.world.queue.getTile(this.position);
		if (tile?.tileable instanceof Empty)
			tile = this.world.live.getTile(this.position);
		let tool: Tool = tile ?
			util.enumValues(Tool).find(tool => Placer.cachedToolEntities[tool].constructor === tile.tileable.constructor) || Tool.EMPTY
			: Tool.EMPTY;

		let toolGroup = tool !== Tool.EMPTY ?
			Object.entries(toolTree).find(([_, tools]) => tools.includes(tool))?.[0] as ToolGroup | undefined :
			this.toolGroup;
		if (toolGroup)
			this.setToolGroupAndTool(toolGroup, tool);
	}

	private setToolGroupAndTool(toolGroup: ToolGroup, tool: Tool) {
		console.assert(tool === Tool.EMPTY || toolTree[toolGroup].includes(tool));

		if (this.toolGroupIconContainer.children.length === 1) {
			// redraw top row
			// todo dedupe
			Object.keys(toolTree).forEach((toolGroup, i) => {
				let coordinates = Placer.toolUiCoordinates(true, i);
				let container = new Container();
				[container.x, container.y] = coordinates[0];
				this.toolGroupIconContainer.addChild(container);
				// todo add tool group sprites
				let rect = new Graphics()
					.rect(0, 0, ...coordinates[1])
					.stroke({width: 1 / this.painter.canvasWidth, color: Color.RECT_OUTLINE});
				container.addChild(rect);
				let textContainer = new Container();
				[textContainer.x, textContainer.y] = coordinates[0].map(v => v * 1000);
				this.toolGroupTextContainer.addChild(textContainer);
				let text = new Text({
					text: '^' + (i + 1),
					style: {
						fontFamily: 'Arial',
						fontSize: 10,
						fill: Color.DEFAULT_TEXT,
					},
					x: 1,
					y: -1,
				});
				textContainer.addChild(text);
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
				let container = new Container();
				[container.x, container.y] = coordinates[0];
				this.toolIconContainer.addChild(container);
				let spriteContainer = Placer.cachedToolEntities[tool].container;
				[spriteContainer.width, spriteContainer.height] = coordinates[1];
				container.addChild(spriteContainer);
				let rect = new Graphics()
					.rect(0, 0, ...coordinates[1])
					.stroke({width: 1 / this.painter.canvasWidth, color: Color.RECT_OUTLINE});
				container.addChild(rect);
				let textContainer = new Container();
				[textContainer.x, textContainer.y] = coordinates[0].map(v => v * 1000);
				this.toolTextContainer.addChild(textContainer);
				let text = new Text({
					text: i + 1,
					style: {
						fontFamily: 'Arial',
						fontSize: 10,
						fill: Color.DEFAULT_TEXT,
					},
					x: 1,
					y: -1,
				});
				textContainer.addChild(text);
			});
		}

		if (this.tool !== tool) {
			this.tool = tool;
			// redraw bottom selection
			let index = toolTree[this.toolGroup].indexOf(tool);
			if (tool === Tool.EMPTY)
				this.toolIconContainer.removeChild(this.toolSelectionRect);
			else {
				[this.toolSelectionRect.x, this.toolSelectionRect.y] = Placer.toolUiCoordinates(false, index)[0];
				this.toolIconContainer.addChild(this.toolSelectionRect);
			}
			// redraw planned entities
			if (this.state !== PlacerState.EMPTY || this.started)
				this.place(this.world.planning, false);
			else
				this.world.planning.clearAllEntities();
		}
	}

	rotate(delta: number) {
		if (this.started) {
			this.rotation = (this.rotation + delta + 4) % 4;
			this.place(this.world.planning, false);
		}
	}

	start() {
		this.started = true;
		this.endPosition = this.startPosition = this.position;
	}

	move() {
		let position = this.position;
		if (position.equals(this.endPosition)) return;

		if (!this.started)
			this.startPosition = position;
		this.endPosition = position;

		if (this.state !== PlacerState.EMPTY || this.started)
			this.place(this.world.planning, this.started);
	}

	end() {
		if (this.started) {
			this.started = false;
			this.place(this.world.queue, false);
		}
	}

	private place(worldLayer: GridWorldLayer<Entity>, updateRotation: boolean) {
		let toolEntity = Placer.cachedToolEntities[this.tool];
		let delta = this.endPosition.subtract(this.startPosition);
		let iterations = delta
			.scale(toolEntity.size.invert())
			.floor()
			.abs()
			.add(Vector.V1);
		let vertical = Math.abs(iterations.y) > Math.abs(iterations.x);
		let rotation = vertical ?
			delta.y > 0 ? Rotation.DOWN : Rotation.UP :
			delta.x > 0 ? Rotation.RIGHT : Rotation.LEFT;
		if (updateRotation && (delta.y || delta.x))
			this.rotation = rotation;

		this.world.planning.clearAllEntities();
		let position = this.startPosition;
		let n = vertical ? iterations.y : iterations.x;
		let iterDelta = RotationUtils.positionShift(rotation).scale(toolEntity.size);
		for (let i = 0; i < n; i++) {
			worldLayer.replaceTileable(position, Placer.createToolEntity(this.tool, this.rotation));
			position = position.add(iterDelta);
		}
	}

	get state() {
		if (this.started)
			return PlacerState.STARTED;
		if (this.tool !== Tool.EMPTY)
			return PlacerState.ENTITY_SELECTED;
		return PlacerState.EMPTY;
	}
}

// todo only add if world empty or replaceable
