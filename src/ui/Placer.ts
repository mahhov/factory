import {Container, Graphics, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	Battery,
	Clear,
	Conductor,
	Conveyor,
	Dispenser,
	Distributor,
	Empty,
	Entity,
	Extractor,
	Factory,
	Generator,
	Junction,
	Pipe,
	PipeDistributor,
	PipeJunction,
	Pump,
	Storage,
	Tank,
	Turret,
	Vent,
	Wall,
	Well,
} from '../world/Entity.js';
import {EntityNameAttribute, TooltipType} from '../world/EntityAttribute.js';
import {findEntityMetadata, ParsedLine, sectionFields} from '../world/EntityMetadata.js';
import {Liquid, Material, ResourceUtils} from '../world/Resource.js';
import {Rotation, RotationUtils} from '../world/Rotation.js';
import {GridWorldLayer, World} from '../world/World.js';
import {Input} from './Input.js';
import MultilineText, {Anchor} from './MultilineText.js';
import TextLine from './TextLine.js';

export enum PlacerState {
	EMPTY, ENTITY_SELECTED, STARTED
}

enum Tool {
	EMPTY, CLEAR,
	// todo bunker
	IRON_WALL, STEEL_WALL,
	EXTRACTOR, REINFORCED_EXTRACTOR, QUADRATIC_EXTRACTOR, LASER_EXTRACTOR,
	// todo packed conveyor & bridge
	CONVEYOR, HIGH_SPEED_CONVEYOR, DISTRIBUTOR, JUNCTION,
	STEEL_SMELTER, METAGLASS_FOUNDRY, PLASTEEL_MIXER, THERMITE_FORGE, EXIDIUM_CATALYST,
	STORAGE, DISPENSER,
	THERMAL_GENERATOR, SOLAR_ARRAY, METHANE_BURNER, THERMITE_REACTOR, CONDUCTOR, BATTERY,
	AIR_VENT, WATER_VENT, METHANE_VENT,
	PUMP, POWERED_PUMP, WELL, PIPE, PIPE_DISTRIBUTOR, PIPE_JUNCTION, TANK,
	SHRAPNEL_TURRET, PIERCING_TURRET, ARC_TURRET, SIEGE_TURRET, LASER_TURRET,
}

let toolTree = {
	walls: [Tool.IRON_WALL, Tool.STEEL_WALL],
	extractors: [Tool.EXTRACTOR, Tool.REINFORCED_EXTRACTOR, Tool.QUADRATIC_EXTRACTOR, Tool.LASER_EXTRACTOR],
	transport: [Tool.CONVEYOR, Tool.HIGH_SPEED_CONVEYOR, Tool.DISTRIBUTOR, Tool.JUNCTION],
	factories: [Tool.STEEL_SMELTER, Tool.METAGLASS_FOUNDRY, Tool.PLASTEEL_MIXER, Tool.THERMITE_FORGE, Tool.EXIDIUM_CATALYST],
	storage: [Tool.STORAGE, Tool.DISPENSER],
	power: [Tool.THERMAL_GENERATOR, Tool.SOLAR_ARRAY, Tool.METHANE_BURNER, Tool.THERMITE_REACTOR, Tool.CONDUCTOR, Tool.BATTERY],
	vents: [Tool.AIR_VENT, Tool.WATER_VENT, Tool.METHANE_VENT],
	liquids: [Tool.PUMP, Tool.POWERED_PUMP, Tool.WELL, Tool.PIPE, Tool.PIPE_DISTRIBUTOR, Tool.PIPE_JUNCTION, Tool.TANK],
	turrets: [Tool.SHRAPNEL_TURRET, Tool.PIERCING_TURRET, Tool.ARC_TURRET, Tool.SIEGE_TURRET, Tool.LASER_TURRET],
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
	private readonly multilineText;
	private started = false;
	private rotation = Rotation.UP;
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
			.stroke({width: 3 / painter.minCanvasSize, color: Color.SELECTED_RECT_OUTLINE}));
		painter.uiContainer.addChild(this.toolIconContainer);
		painter.textUiContainer.addChild(this.toolTextContainer);
		this.toolIconContainer.addChild(this.toolSelectionRect);
		this.toolSelectionRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.toolUiCoordinates(false, 0)[1])
			.stroke({width: 3 / painter.minCanvasSize, color: Color.SELECTED_RECT_OUTLINE}));

		this.multilineText = new MultilineText(painter);
		this.multilineText.anchor = Anchor.BOTTOM_LEFT;

		this.setToolGroupAndTool('walls', Tool.EMPTY);
	}

	private static get cachedToolEntities() {
		Placer.cachedToolEntities_ ||= Object.fromEntries(util.enumValues(Tool).map(tool => [tool, Placer.createToolEntity(tool)])) as Record<Tool, Entity>;
		return Placer.cachedToolEntities_;
	}

	private static createToolEntity(tool: Tool, rotation: Rotation = Rotation.UP): Entity {
		switch (tool) {
			case Tool.EMPTY:
				return new Empty();
			case Tool.CLEAR:
				return new Clear();

			case Tool.IRON_WALL:
				return Placer.createToolWall(findEntityMetadata('buildings', 'Iron Wall'));
			case Tool.STEEL_WALL:
				return Placer.createToolWall(findEntityMetadata('buildings', 'Steel Wall'));

			case Tool.EXTRACTOR:
				return Placer.createToolExtractor(findEntityMetadata('buildings', 'Extractor'));
			case Tool.REINFORCED_EXTRACTOR:
				return Placer.createToolExtractor(findEntityMetadata('buildings', 'Reinforced Extractor'));
			case Tool.QUADRATIC_EXTRACTOR:
				return Placer.createToolExtractor(findEntityMetadata('buildings', 'Quadratic Extractor'));
			case Tool.LASER_EXTRACTOR:
				return Placer.createToolExtractor(findEntityMetadata('buildings', 'Laser Extractor'));

			case Tool.CONVEYOR:
				return Placer.createToolConveyor(findEntityMetadata('buildings', 'Conveyor'), rotation);
			case Tool.HIGH_SPEED_CONVEYOR:
				return Placer.createToolConveyor(findEntityMetadata('buildings', 'High Speed Conveyor'), rotation);
			case Tool.DISTRIBUTOR:
				return Placer.createToolDistributor(findEntityMetadata('buildings', 'Distributor'));
			case Tool.JUNCTION:
				return Placer.createToolJunction(findEntityMetadata('buildings', 'Junction'));

			case Tool.STEEL_SMELTER:
				return Placer.createToolFactory(findEntityMetadata('buildings', 'Steel Smelter'));
			case Tool.METAGLASS_FOUNDRY:
				return Placer.createToolFactory(findEntityMetadata('buildings', 'Metaglass Foundry'));
			case Tool.PLASTEEL_MIXER:
				return Placer.createToolFactory(findEntityMetadata('buildings', 'Plasteel Mixer'));
			case Tool.THERMITE_FORGE:
				return Placer.createToolFactory(findEntityMetadata('buildings', 'Thermite Forge'));
			case Tool.EXIDIUM_CATALYST:
				return Placer.createToolFactory(findEntityMetadata('buildings', 'Exidium Catalyst'));

			case Tool.STORAGE:
				return Placer.createToolStorage(findEntityMetadata('buildings', 'Storage'));
			case Tool.DISPENSER:
				return Placer.createToolDispenser(findEntityMetadata('buildings', 'Dispenser'), rotation);

			case Tool.THERMAL_GENERATOR:
				return Placer.createToolGenerator(findEntityMetadata('buildings', 'Thermal Generator'));
			case Tool.SOLAR_ARRAY:
				return Placer.createToolGenerator(findEntityMetadata('buildings', 'Solar Array'));
			case Tool.METHANE_BURNER:
				return Placer.createToolGenerator(findEntityMetadata('buildings', 'Methane Burner'));
			case Tool.THERMITE_REACTOR:
				return Placer.createToolGenerator(findEntityMetadata('buildings', 'Thermite Reactor'));
			case Tool.CONDUCTOR:
				return Placer.createToolConductor(findEntityMetadata('buildings', 'Conductor'));
			case Tool.BATTERY:
				return Placer.createToolBattery(findEntityMetadata('buildings', 'Battery'));

			case Tool.AIR_VENT:
				return Placer.createToolVent(findEntityMetadata('buildings', 'Air Vent'));
			case Tool.WATER_VENT:
				return Placer.createToolVent(findEntityMetadata('buildings', 'Water Vent'));
			case Tool.METHANE_VENT:
				return Placer.createToolVent(findEntityMetadata('buildings', 'Methane Vent'));

			case Tool.PUMP:
				return Placer.createToolPump(findEntityMetadata('buildings', 'Pump'));
			case Tool.POWERED_PUMP:
				return Placer.createToolPump(findEntityMetadata('buildings', 'Powered Pump'));
			case Tool.WELL:
				return Placer.createToolWell(findEntityMetadata('buildings', 'Well'));
			case Tool.PIPE:
				return Placer.createToolPipe(findEntityMetadata('buildings', 'Pipe'), rotation);
			case Tool.PIPE_DISTRIBUTOR:
				return Placer.createToolPipeDistributor(findEntityMetadata('buildings', 'Pipe Distributor'));
			case Tool.PIPE_JUNCTION:
				return Placer.createToolPipeJunction(findEntityMetadata('buildings', 'Pipe Junction'));
			case Tool.TANK:
				return Placer.createToolTank(findEntityMetadata('buildings', 'Tank'));

			case Tool.SHRAPNEL_TURRET:
				return Placer.createToolTurret(findEntityMetadata('turrets', 'Shrapnel Turret'));
			case Tool.PIERCING_TURRET:
				return Placer.createToolTurret(findEntityMetadata('turrets', 'Piercing Turret'));
			case Tool.ARC_TURRET:
				return Placer.createToolTurret(findEntityMetadata('turrets', 'Arc Turret'));
			case Tool.SIEGE_TURRET:
				return Placer.createToolTurret(findEntityMetadata('turrets', 'Siege Turret'));
			case Tool.LASER_TURRET:
				return Placer.createToolTurret(findEntityMetadata('turrets', 'Laser Turret'));
		}
	}

	private static createToolWall(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Wall(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health);
	}

	private static createToolExtractor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Extractor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.powerInput, metadata.heatOutput, metadata.output as number[]);
	}

	private static createToolConveyor(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		return new Conveyor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number, rotation);
	}

	private static createToolDistributor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Distributor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolJunction(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Junction(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolFactory(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Factory(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.materialInput, metadata.powerInput, metadata.heatOutput, metadata.output as ResourceUtils.Count<Material>);
	}

	private static createToolStorage(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Storage(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolDispenser(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		return new Dispenser(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number, rotation);
	}

	private static createToolGenerator(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Generator(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.materialInput, metadata.powerInput, metadata.heatOutput, metadata.liquidInput[0], metadata.output as number);
	}

	private static createToolConductor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Conductor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolBattery(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Battery(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolVent(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Vent(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.liquidInput[0], metadata.powerInput, metadata.output as number);
	}

	private static createToolPump(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Pump(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.powerInput, metadata.output as number[]);
	}

	private static createToolWell(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Well(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.powerInput, new ResourceUtils.Count(Liquid.WATER, metadata.output as number));
	}

	private static createToolPipe(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		return new Pipe(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number, rotation);
	}

	private static createToolPipeDistributor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new PipeDistributor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolPipeJunction(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new PipeJunction(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolTank(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Tank(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolTurret(metadata: ParsedLine<typeof sectionFields.turrets>) {
		return new Turret(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.attackRate, metadata.damage, metadata.materialInput, metadata.accuracy, metadata.range, metadata.projectileSpeed);
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
		let canvasPosition = this.input.mousePosition.scale(new Vector(1 / this.painter.minCanvasSize));
		return this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
	}

	setToolGroupIndex(index: number) {
		let toolGroup = Object.keys(toolTree)[index] as ToolGroup;
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
		let tile = this.world.queue.getTile(this.position);
		if (tile?.tileable instanceof Empty)
			tile = this.world.live.getTile(this.position);
		let tool: Tool = tile ?
			util.enumValues(Tool).find(tool =>
				Placer.cachedToolEntities[tool].getAttribute(EntityNameAttribute)?.name ===
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
				let spriteContainer = Placer.createToolEntity(tools[0]).container;
				this.addToolUiButton(coordinates, this.toolGroupIconContainer, spriteContainer, this.toolGroupTextContainer, '^' + (i + 1));
				spriteContainer.eventMode = 'static';
				spriteContainer.onpointertap = () => this.setToolGroupIndex(i);
				spriteContainer.onpointerenter = () => this.showToolGroupTooltip(i);
				spriteContainer.onpointerleave = () => this.hideTooltip();
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
				this.addToolUiButton(coordinates, this.toolIconContainer, Placer.cachedToolEntities[tool].container, this.toolTextContainer, String(i + 1));
				Placer.cachedToolEntities[tool].container.eventMode = 'static';
				Placer.cachedToolEntities[tool].container.onpointertap = () => this.toggleToolIndex(i);
				Placer.cachedToolEntities[tool].container.onpointerenter = () => this.showToolTooltip(i);
				Placer.cachedToolEntities[tool].container.onpointerleave = () => this.hideTooltip();
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

	private addToolUiButton(coordinates: [number, number][], iconContainer: Container, spriteContainer: Container, textContainer: Container, text: string) {
		[spriteContainer.x, spriteContainer.y] = coordinates[0];
		[spriteContainer.width, spriteContainer.height] = coordinates[1];
		iconContainer.addChild(spriteContainer);
		let rect = new Graphics()
			.rect(...coordinates[0], ...coordinates[1])
			.stroke({width: 1 / this.painter.minCanvasSize, color: Color.RECT_OUTLINE});
		iconContainer.addChild(rect);
		textContainer.addChild(new Text({
			text,
			style: {
				fontFamily: 'Arial',
				fontSize: 10,
				fill: Color.DEFAULT_TEXT,
			},
			x: coordinates[0][0] * 1000 + 1,
			y: coordinates[0][1] * 1000 - 1,
		}));
	}

	rotate(delta: number) {
		if (this.state !== PlacerState.EMPTY) {
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
		if (!this.started) return;
		this.started = false;
		this.place(this.world.queue, false);
		if (this.tool === Tool.CLEAR)
			this.tool = Tool.EMPTY;
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

	showToolGroupTooltip(index: number) {
		this.multilineText.lines = [new TextLine(util.lowerCaseToTitleCase(Object.keys(toolTree)[index] as ToolGroup), {color: Color.NAME_TEXT})];
		let coordinates = Placer.toolUiCoordinates(true, index);
		this.multilineText.position = new Vector(coordinates[0][0], coordinates[0][1]);
		this.multilineText.tick();
		this.painter.textUiContainer.removeChild(this.toolGroupTextContainer);
		this.painter.textUiContainer.removeChild(this.toolTextContainer);
	}

	showToolTooltip(index: number) {
		let toolEntity = Placer.cachedToolEntities[toolTree[this.toolGroup][index]];
		this.multilineText.lines = toolEntity.tooltip(TooltipType.PLACER);
		let coordinates = Placer.toolUiCoordinates(false, index);
		this.multilineText.position = new Vector(coordinates[0][0], coordinates[0][1]);
		this.multilineText.tick();
		this.painter.textUiContainer.removeChild(this.toolGroupTextContainer);
		this.painter.textUiContainer.removeChild(this.toolTextContainer);
	}

	hideTooltip() {
		this.multilineText.lines = [];
		this.multilineText.tick();
		this.painter.textUiContainer.addChild(this.toolGroupTextContainer);
		this.painter.textUiContainer.addChild(this.toolTextContainer);
	}
}

// todo:
//   only add if world empty or replaceable
//   replacing entity not working
//   shadow empty being left when right click dragging resource tiles
//   bigger tier extractors not working
//   use different sprites or colors for different tier walls, extractors, etc
//   consistently apply timed delay to attributes
//   make pipes leak
//   missing removal transparent empty overlay
//   unintentionally placing when clicking on UI rows
