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
	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;

	private readonly toolListIconContainer = new Container();
	private readonly toolListTextContainer = new Container();
	private readonly entityClassRect = new Container();

	private started = false;
	private rotation = Rotation.RIGHT;
	private toolGroup: ToolGroup = 'walls';
	private tool: Tool = Tool.EMPTY;
	private startPosition = Vector.V0;
	private endPosition = Vector.V0;

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;

		painter.uiContainer.addChild(this.toolListIconContainer);
		painter.textUiContainer.addChild(this.toolListTextContainer);
		// todo UI to display possible tool groups
		// todo not displaying wall/wall on init because of the early exit when unchanged
		this.setToolGroupAndTool('factories', Tool.GLASS_FACTORY);

		this.entityClassRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.entityClassUiCoordinates(1)[1])
			.stroke({width: 3 / painter.canvasWidth, color: Color.SELECTED_RECT_OUTLINE}));
	}

	private static cachedToolClass(tool: Tool): Entity {
		// todo actually cache
		return Object.fromEntries(util.enumValues(Tool).map(tool => [tool, Placer.createToolClass(tool, Rotation.RIGHT)]))[tool];
	}

	private static createToolClass(tool: Tool, rotation: Rotation): Entity {
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

	private static entityClassUiCoordinates(index: number): [number, number][] {
		let size = .035, margin = .005;
		return [[
			index * (size + margin) + margin,
			1 - margin - size,
		], [
			size,
			size,
		]];
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
			util.enumValues(Tool).find(tool => Placer.cachedToolClass(tool).constructor === tile.tileable.constructor) || Tool.EMPTY
			: Tool.EMPTY;

		let toolGroup = tool !== Tool.EMPTY ?
			Object.entries(toolTree).find(([_, tools]) => tools.includes(tool))?.[0] as ToolGroup | undefined :
			this.toolGroup;
		if (toolGroup)
			this.setToolGroupAndTool(toolGroup, tool);
	}

	private setToolGroupAndTool(toolGroup: ToolGroup, tool: Tool) {
		console.assert(tool === Tool.EMPTY || toolTree[toolGroup].includes(tool));

		if (this.toolGroup !== toolGroup) {
			this.toolGroup = toolGroup;
			this.toolListIconContainer.removeChildren();
			this.toolListTextContainer.removeChildren();
			toolTree[toolGroup].forEach((tool, i) => {
				let coordinates = Placer.entityClassUiCoordinates(i);
				let container = new Container();
				[container.x, container.y] = coordinates[0];
				this.toolListIconContainer.addChild(container);
				let spriteContainer = Placer.cachedToolClass(tool).container;
				[spriteContainer.width, spriteContainer.height] = coordinates[1];
				container.addChild(spriteContainer);
				let rect = new Graphics()
					.rect(0, 0, ...coordinates[1])
					.stroke({width: 1 / this.painter.canvasWidth, color: Color.RECT_OUTLINE});
				container.addChild(rect);
				let textContainer = new Container();
				[textContainer.x, textContainer.y] = coordinates[0].map(v => v * 1000);
				this.toolListTextContainer.addChild(textContainer);
				let text = new Text({
					text: i,
					style: {
						fontFamily: 'Arial',
						fontSize: 14,
						fill: Color.DEFAULT_TEXT,
					},
					x: 3,
					y: 1,
				});
				textContainer.addChild(text);
			});
		}

		if (this.tool !== tool) {
			this.tool = tool;
			let index = toolTree[this.toolGroup].indexOf(tool);
			if (tool === Tool.EMPTY)
				this.toolListIconContainer.removeChild(this.entityClassRect);
			else {
				[this.entityClassRect.x, this.entityClassRect.y] = Placer.entityClassUiCoordinates(index)[0];
				this.toolListIconContainer.addChild(this.entityClassRect);
			}
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
		let toolClass = Placer.cachedToolClass(this.tool);
		let delta = this.endPosition.subtract(this.startPosition);
		let iterations = delta
			.scale(toolClass.size.invert())
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
		let iterDelta = RotationUtils.positionShift(rotation).scale(toolClass.size);
		for (let i = 0; i < n; i++) {
			worldLayer.replaceTileable(position, Placer.createToolClass(this.tool, this.rotation));
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
