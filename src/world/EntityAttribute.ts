import {AnimatedSprite, Particle, Sprite, Texture} from 'pixi.js';
import color from '../graphics/Color.js';
import Color from '../graphics/Color.js';
import {coloredGeneratedTextures} from '../graphics/generatedTextures.js';
import TextLine from '../ui/TextLine.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity, LiquidDeposit, MaterialDeposit, ParticleEntity, Projectile} from './Entity.js';
import {Liquid, Material, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, World} from './World.js';

export enum TooltipType {
	PLACER, WORLD
}

export enum TickResult {
	NOT_DONE,
	DONE,
	END_TICK,
}

let materialCountsString = (materialCounts: ResourceUtils.Count<Material>[]) =>
	materialCounts.map(materialCount => `${materialCount.quantity} ${ResourceUtils.materialString(materialCount.resource)}`).join(', ');

let liquidCountsString = (liquidCounts: ResourceUtils.Count<Liquid>[]) =>
	liquidCounts.map(liquidCount => `${liquidCount.quantity} ${ResourceUtils.liquidString(liquidCount.resource)}`).join(', ');

let materialRatiosString = (materialTuples: [Material, number, number][]) =>
	materialTuples.map(materialTuple => `${materialTuple[1]} / ${materialTuple[2]} ${ResourceUtils.materialString(materialTuple[0])}`);

// todo cache return values of getAdjacentDestinations & getLineDestinations at the callsites
let getAdjacentDestinations = (origin: Vector, size: Vector, rotation: Rotation): Vector[] => {
	switch (rotation) {
		case Rotation.UP:
			size = new Vector(size.x, 1);
			break;
		case Rotation.RIGHT:
			origin = new Vector(origin.x + size.x - 1, origin.y);
			size = new Vector(1, size.y);
			break;
		case Rotation.DOWN:
			origin = new Vector(origin.x, origin.y + size.y - 1);
			size = new Vector(size.x, 1);
			break;
		case Rotation.LEFT:
			size = new Vector(1, size.y);
			break;
	}
	origin = origin.add(RotationUtils.positionShift(rotation));
	let destinations = [];
	for (let x = 0; x < size.x; x++)
		for (let y = 0; y < size.y; y++)
			destinations.push(origin.add(new Vector(x, y)));
	return destinations;
};

let getLineDestinations = (origin: Vector, size: Vector, rotation: Rotation, range: number): Vector[] => {
	let adjacents = getAdjacentDestinations(origin, size, rotation);
	let shift = RotationUtils.positionShift(rotation);
	let destinations = [];
	for (let r = 0; r < range; r++) {
		let offset = shift.scale(r);
		for (let adjacent of adjacents)
			destinations.push(adjacent.add(offset));
	}
	return destinations;
};

let connectionSprite = (sprite: Sprite, delta: Vector): Sprite | null => {
	let s = 8;
	let thickness = s / 16;
	if (delta.x > 1) {
		sprite.x = s;
		sprite.y = s / 2 - thickness / 2;
		sprite.width = s * (delta.x - 1);
		sprite.height = thickness;
	} else if (delta.x < -1) {
		sprite.x = 0;
		sprite.y = s / 2 - thickness / 2;
		sprite.width = s * (delta.x + 1);
		sprite.height = thickness;
	} else if (delta.y > 1) {
		sprite.x = s / 2 - thickness / 2;
		sprite.y = s;
		sprite.width = thickness;
		sprite.height = s * (delta.y - 1);
	} else if (delta.y < -1) {
		sprite.x = s / 2 - thickness / 2;
		sprite.y = 0;
		sprite.width = thickness;
		sprite.height = s * (delta.y + 1);
	} else
		return null;
	return sprite;
};

let connectionVectors = (delta: Vector): [Vector, Vector] | null => {
	let thickness = 1 / 16;
	if (delta.x > 1) {
		return [
			new Vector(1, 1 / 2 - thickness / 2),
			new Vector(1 * (delta.x - 1), thickness)];
	}
	if (delta.x < -1) {
		return [
			new Vector(0, 1 / 2 - thickness / 2),
			new Vector(1 * (delta.x + 1), thickness)];
	}
	if (delta.y > 1) {
		return [
			new Vector(1 / 2 - thickness / 2, 1),
			new Vector(thickness, 1 * (delta.y - 1))];
	}
	if (delta.y < -1) {
		return [
			new Vector(1 / 2 - thickness / 2, 0),
			new Vector(thickness, 1 * (delta.y + 1))];
	}
	return null;
};

export abstract class EntityAttribute {
	tickResult: TickResult = TickResult.NOT_DONE;

	tick(world: World, tile: Tile<Entity>): void {}

	tooltip(type: TooltipType): TextLine[] {
		return [];
	}

	get tooltipRange(): number {
		return 0;
	}

	get selectable(): boolean {
		return false;
	}

	get childAttributes(): EntityAttribute[] {return [];}
}

// Helper attributes

export class EntityNameAttribute extends EntityAttribute {
	readonly name: string;

	constructor(name: string) {
		super();
		console.assert(!!name);
		this.name = name;
	}

	tooltip(type: TooltipType): TextLine[] {
		return [new TextLine(this.name, {color: Color.NAME_TEXT})];
	}
}

export class EntityDescriptionAttribute extends EntityAttribute {
	private readonly text: string;

	constructor(text: string) {
		super();
		console.assert(!!text);
		this.text = text;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(this.text, {color: Color.DESCRIPTION_TEXT})] :
			[];
	}
}

// todo some graphical indicator for buildings queued, buildings in progress, buildings active
// todo partial health for partially built buildings
// todo don't move resources into storage that's still being built. don't act upon entities that are still being built. maybe move them from the live layer to an in-progress layer
export class EntityBuildableAttribute extends EntityAttribute {
	private readonly counter: Counter;
	private readonly materialCost: ResourceUtils.Count<Material>[];
	doneBuilding = util.debug || false;

	constructor(duration: number, materialCost: ResourceUtils.Count<Material>[]) {
		super();
		this.counter = new Counter(duration * 20);
		this.materialCost = materialCost;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.doneBuilding) return;

		let lastRatio = this.counter.ratio;
		let ratio = (this.counter.i + 1) / this.counter.n;
		let costs = this.materialCost.map(cost => new ResourceUtils.Count(
			cost.resource, Math.ceil(cost.quantity * ratio) - Math.ceil(cost.quantity * lastRatio)));

		if (!costs.every(cost => world.playerLogic.materials.hasQuantity(cost)))
			return;

		costs.forEach(cost => world.playerLogic.materials.remove(cost));
		if (this.counter.tick())
			this.doneBuilding = true;
		// Unbuilt entities are ticked only from tickQueue. Need to end tickQueue after 1 building progresses
		this.tickResult = TickResult.END_TICK;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[
				new TextLine(`Build time ${this.counter.n}`),
				new TextLine(`Build cost ${materialCountsString(this.materialCost)}`),
			] :
			this.doneBuilding ? [] : [new TextLine(`Building ${util.textPercent(this.counter.ratio)}`)];
		// todo text when insufficient materials
	}
}

export class EntityHealthAttribute extends EntityAttribute {
	private readonly maxHealth: number;
	private lastHealth: number;
	health: number;
	readonly sourceFriendly: boolean;
	private particle: Particle | null = null;

	constructor(health: number, sourceFriendly: boolean) {
		super();
		console.assert(health > 0);
		this.maxHealth = health;
		this.lastHealth = health;
		this.health = health;
		this.sourceFriendly = sourceFriendly;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (!this.health) {
			if (this.sourceFriendly)
				world.live.replaceTileable(tile.position, new Empty());
			else
				world.free.removeTile(tile);
			this.tickResult = TickResult.END_TICK;
			return;
		}

		if (tile.tileable.container) {
			if (this.health !== this.lastHealth && !this.particle) {
				this.particle = tile.tileable.addOverlayParticle(coloredGeneratedTextures.fullRect.texture(Color.DAMAGED_RED), tile.tileable.size, world);
				this.particle.x = tile.position.x;
				this.particle.y = tile.position.y;
				this.lastHealth = Math.max(this.lastHealth - 3, this.health);
			} else if (this.health === this.lastHealth && this.particle) {
				tile.tileable.removeOverlayParticle(this.particle, world);
				this.particle = null;
			}
		}

		this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Health ${this.maxHealth}`, {color: Color.HEALTH_TEXT})] :
			[new TextLine(`Health ${util.textPercent(this.health / this.maxHealth)}`, {color: Color.HEALTH_TEXT})];
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityTimedAttribute extends EntityAttribute {
	readonly counter: Counter;

	constructor(duration: number) {
		super();
		console.assert(duration > 0);
		this.counter = new Counter(duration);
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.counter.tick())
			this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[] :
			[new TextLine(`Progress ${util.textPercent(this.counter.ratio)}`)];
	}
}

abstract class EntityParentAttribute extends EntityAttribute {
	private readonly attributes: EntityAttribute[];

	constructor(attributes: EntityAttribute[]) {
		super();
		this.attributes = attributes;
	}

	tooltip(type: TooltipType): TextLine[] {
		return this.attributes.flatMap(attribute => attribute.tooltip(type));
	}

	get tooltipRange(): number {
		return this.attributes.find(attribute => attribute.tooltipRange)?.tooltipRange || 0;
	}

	get selectable(): boolean {
		return this.attributes.some(attribute => attribute.selectable);
	}

	get childAttributes(): EntityAttribute[] {
		return this.attributes;
	}
}

export class EntityParallelAttribute extends EntityParentAttribute {
	addAttribute(attribute: EntityAttribute) {
		this.childAttributes.push(attribute);
	}

	tick(world: World, tile: Tile<Entity>): void {
		for (let attribute of this.childAttributes) {
			attribute.tick(world, tile);
			if (attribute.tickResult === TickResult.END_TICK) {
				attribute.tickResult = TickResult.NOT_DONE;
				return;
			}
		}
	}
}

export class EntityChainAttribute extends EntityParentAttribute {
	tick(world: World, tile: Tile<Entity>): void {
		for (let attribute of this.childAttributes) {
			if (attribute.tickResult === TickResult.NOT_DONE) {
				attribute.tick(world, tile);
				if (attribute.tickResult === TickResult.NOT_DONE) return;
				if (attribute.tickResult === TickResult.END_TICK) {
					attribute.tickResult = TickResult.NOT_DONE;
					this.tickResult = TickResult.END_TICK;
					return;
				}
			}
		}
		for (let attribute of this.childAttributes)
			attribute.tickResult = TickResult.NOT_DONE;
		this.tickResult = TickResult.DONE;
	}
}

enum EntityIfElseAttributeState {PREDICATE, THEN, ELSE}

export class EntityIfElseAttribute extends EntityParentAttribute {
	private readonly predicateAttribute: EntityAttribute;
	private readonly thenAttribute: EntityAttribute | null;
	private readonly elseAttribute: EntityAttribute | null;
	private state: EntityIfElseAttributeState = EntityIfElseAttributeState.PREDICATE;

	constructor(predicateAttribute: EntityAttribute, thenAttribute: EntityAttribute | null, elseAttribute: EntityAttribute | null) {
		super([predicateAttribute, thenAttribute, elseAttribute].filter(v => v) as EntityAttribute[]);
		this.predicateAttribute = predicateAttribute;
		this.thenAttribute = thenAttribute;
		this.elseAttribute = elseAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.state === EntityIfElseAttributeState.PREDICATE) {
			this.predicateAttribute.tick(world, tile);
			switch (this.predicateAttribute.tickResult) {
				case TickResult.NOT_DONE:
					this.state = EntityIfElseAttributeState.ELSE;
					break;
				case TickResult.DONE:
					this.state = EntityIfElseAttributeState.THEN;
					this.predicateAttribute.tickResult = TickResult.NOT_DONE;
					break;
				case TickResult.END_TICK:
					this.tickResult = TickResult.END_TICK;
					this.predicateAttribute.tickResult = TickResult.NOT_DONE;
					return;
			}
		}

		let attribute = this.state === EntityIfElseAttributeState.THEN ? this.thenAttribute : this.elseAttribute;
		if (!attribute) {
			this.tickResult = TickResult.DONE;
			this.state = EntityIfElseAttributeState.PREDICATE;
			return;
		}

		attribute.tick(world, tile);
		this.tickResult = attribute.tickResult;
		if (this.tickResult !== TickResult.NOT_DONE) {
			this.state = EntityIfElseAttributeState.PREDICATE;
			attribute.tickResult = TickResult.NOT_DONE;
		}
	}
}

// Material attributes (produce, consume, store, transport)

export class EntityMaterialProduceAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly outputs: ResourceUtils.Count<Material>[];

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute, outputs: ResourceUtils.Count<Material>[]) {
		super();
		console.assert(outputs.length > 0);
		console.assert(outputs.every(materialCount => materialCount.quantity > 0));
		this.materialStorageAttribute = materialStorageAttribute;
		this.outputs = outputs;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.outputs.every(materialCount => this.materialStorageAttribute.hasCapacity(materialCount))) {
			this.outputs.forEach(materialCount => this.materialStorageAttribute.add(materialCount));
			this.tickResult = TickResult.DONE;
		}
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Produces ${materialCountsString(this.outputs)}`)] :
			[];
	}
}

export class EntityMaterialExtractorAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly outputPerTier: number[];
	private readonly quantities: Record<Material, number>;

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute, outputPerTier: number[]) {
		super();
		console.assert(outputPerTier.length > 0);
		console.assert(outputPerTier.every(output => output >= 0));
		this.materialStorageAttribute = materialStorageAttribute;
		this.outputPerTier = outputPerTier;
		this.quantities = Object.fromEntries(util.enumValues(Material)
			.map(material => [material, 0])) as Record<Material, number>;
	}

	tick(world: World, tile: Tile<Entity>): void {
		let some = tile.position.iterate(tile.tileable.size).map(position => {
			let tile = world.terrain.getTileBounded(position);
			if (!(tile?.tileable instanceof MaterialDeposit)) return;
			let capacity = this.materialStorageAttribute.capacity(tile.tileable.material) - this.quantities[tile.tileable.material];
			let add = Math.min(this.outputPerTier[tile.tileable.materialTier] || 0, capacity);
			this.quantities[tile.tileable.material] += add;
			return add;
		}).some(v => v);
		if (!some) return;
		util.enumValues(Material).forEach(material => {
			let n = Math.floor(this.quantities[material]);
			if (!n) return;
			this.quantities[material] -= n;
			this.materialStorageAttribute.add(new ResourceUtils.Count(material, n));
		});
		this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Extracts ${this.outputPerTier.join('/')} material / area`, {})] :
			[]; // todo print extraction rate. likewise for liquid extraction
	}
}

export class EntityMaterialConsumeAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly inputs: ResourceUtils.Count<Material>[];

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute, inputs: ResourceUtils.Count<Material>[]) {
		super();
		console.assert(inputs.length > 0);
		console.assert(inputs.every(materialCount => materialCount.quantity > 0));
		this.materialStorageAttribute = materialStorageAttribute;
		this.inputs = inputs;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.inputs.every(materialCount => this.materialStorageAttribute.hasQuantity(materialCount))) {
			this.inputs.forEach(materialCount => this.materialStorageAttribute.remove(materialCount));
			this.tickResult = TickResult.DONE;
		}
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Requires ${materialCountsString(this.inputs)}`)] :
			[new TextLine(materialRatiosString(this.inputs
				.map(materialCount => [materialCount.resource, this.materialStorageAttribute.quantity(materialCount.resource), materialCount.quantity]))
				.join(', '))];
	}
}

export enum EntityMaterialStorageAttributeType {NORMAL, PACKED, ANY}

export class EntityMaterialStorageAttribute extends EntityAttribute {
	readonly type: EntityMaterialStorageAttributeType;
	private readonly totalCapacity: number;
	private readonly capacities: ResourceUtils.Count<Material>[];
	private readonly inputRotations: Rotation[];
	private readonly showTooltip: boolean;
	private readonly quantities: Record<Material, number>;
	private readonly ordered: Material[] = [];
	empty: boolean = true;

	constructor(type: EntityMaterialStorageAttributeType, totalCapacity: number, materialCapacities: ResourceUtils.Count<Material>[], inputRotations: Rotation[], showTooltip: boolean) {
		super();
		console.assert(totalCapacity > 0);
		console.assert(materialCapacities.length > 0);
		console.assert(materialCapacities.every(materialCount => materialCount.quantity > 0));
		this.type = type;
		this.totalCapacity = totalCapacity;
		this.capacities = materialCapacities;
		this.inputRotations = inputRotations;
		this.showTooltip = showTooltip;
		this.quantities = Object.fromEntries(util.enumValues(Material)
			.map(material => [material, 0])) as Record<Material, number>;
	}

	private getMaterialCapacity(material: Material): number {
		return this.capacities.find(capacity => capacity.resource === material)?.quantity ?? 0;
	}

	get peek(): Material | undefined {
		return this.ordered.at(-1);
	}

	capacity(material: Material): number {
		return Math.min(this.totalCapacity - this.ordered.length, this.getMaterialCapacity(material) - this.quantities[material]);
	}

	hasCapacity(materialCount: ResourceUtils.Count<Material>): boolean {
		return this.capacity(materialCount.resource) >= materialCount.quantity;
	}

	get quantityCounts(): ResourceUtils.Count<Material>[] {
		return Object.entries(this.quantities)
			.filter(([_, quantity]) => quantity)
			.map(([material, quantity]) => new ResourceUtils.Count(Number(material) as Material, quantity));
	}

	quantity(material: Material): number {
		return this.quantities[material];
	}

	hasQuantity(materialCount: ResourceUtils.Count<Material>): boolean {
		return this.quantities[materialCount.resource] >= materialCount.quantity;
	}

	add(materialCount: ResourceUtils.Count<Material>) {
		this.quantities[materialCount.resource] += materialCount.quantity;
		util.arr(materialCount.quantity).forEach(() => this.ordered.push(materialCount.resource));
		this.empty = false;
	}

	remove(materialCount: ResourceUtils.Count<Material>) {
		this.quantities[materialCount.resource] -= materialCount.quantity;
		for (let i = 0; i < materialCount.quantity; i++)
			this.ordered.splice(this.ordered.findLastIndex(material => material === materialCount.resource), 1);
		this.empty = !this.ordered.length;
	}

	acceptsRotation(rotation: Rotation): boolean {
		return this.inputRotations.includes(rotation);
	}

	tooltip(type: TooltipType): TextLine[] {
		if (!this.showTooltip || type === TooltipType.PLACER) return [];
		let line = this.totalCapacity === Infinity ?
			materialRatiosString(this.capacities
				.filter(materialCount => this.quantities[materialCount.resource])
				.map(materialCount => [materialCount.resource, this.quantities[materialCount.resource], materialCount.quantity])).join('\n') :
			materialCountsString(this.quantityCounts);
		return line ? [new TextLine(line)] : [];
	}

	get selectable() {
		return true;
	}
}

export class EntityNonEmptyMaterialStorage extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute) {
		super();
		this.materialStorageAttribute = materialStorageAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (!this.materialStorageAttribute.empty)
			this.tickResult = TickResult.DONE;
	}
}

export class EntityTransportAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly outputRotations: Rotation[];

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute, outputRotations: Rotation[]) {
		super();
		console.assert(outputRotations.length > 0);
		this.materialStorageAttribute = materialStorageAttribute;
		this.outputRotations = outputRotations;
	}

	static move(fromMaterialStorageAttribute: EntityMaterialStorageAttribute, outputRotations: Rotation[], materialCounts: ResourceUtils.Count<Material>[], world: World, tile: Tile<Entity>): boolean {
		util.shuffleInPlace(materialCounts);
		return util.shuffleInPlace(outputRotations).some(rotation =>
			util.shuffleInPlace(getAdjacentDestinations(tile.position, tile.tileable.size, rotation)).some(destination => {
				let tile = world.live.getTileBounded(destination);
				if (!tile) return false;
				return tile.tileable.getAttributes(EntityMaterialStorageAttribute).some(destinationMaterialStorageAttribute => {
						if (!destinationMaterialStorageAttribute.acceptsRotation(rotation)) return false;
						if (fromMaterialStorageAttribute.type !== destinationMaterialStorageAttribute.type &&
							fromMaterialStorageAttribute.type !== EntityMaterialStorageAttributeType.ANY &&
							destinationMaterialStorageAttribute.type !== EntityMaterialStorageAttributeType.ANY)
							return false;
						return materialCounts.some(materialCount => {
							if (destinationMaterialStorageAttribute!.hasCapacity(materialCount)) {
								fromMaterialStorageAttribute.remove(materialCount);
								destinationMaterialStorageAttribute!.add(materialCount);
								return true;
							}
							return false;
						});
					},
				);
			}));
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.materialStorageAttribute.empty) return;
		let material = this.materialStorageAttribute.peek!;
		if (EntityTransportAttribute.move(this.materialStorageAttribute, this.outputRotations, [new ResourceUtils.Count(material, 1)], world, tile))
			this.tickResult = TickResult.DONE;
	}
}

export class EntityOutflowAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute) {
		super();
		this.materialStorageAttribute = materialStorageAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.materialStorageAttribute.empty) return;
		if (EntityTransportAttribute.move(this.materialStorageAttribute, util.enumValues(Rotation), this.materialStorageAttribute.quantityCounts.map(materialCount => new ResourceUtils.Count(materialCount.resource, 1)), world, tile))
			this.tickResult = TickResult.DONE;
	}
}

export class EntityInflowAttribute extends EntityAttribute {
	private readonly materialPickerAttribute: EntityMaterialPickerAttribute;
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly inputRotations: Rotation[];

	constructor(materialPickerAttribute: EntityMaterialPickerAttribute, materialStorageAttribute: EntityMaterialStorageAttribute, inputRotations: Rotation[]) {
		super();
		console.assert(inputRotations.length > 0);
		this.materialPickerAttribute = materialPickerAttribute;
		this.materialStorageAttribute = materialStorageAttribute;
		this.inputRotations = inputRotations;
	}

	tick(world: World, tile: Tile<Entity>): void {
		let materialCount = new ResourceUtils.Count(this.materialPickerAttribute.material, 1);
		if (!this.materialStorageAttribute.hasCapacity(materialCount)) return;
		let some = util.shuffleInPlace(this.inputRotations).some(rotation =>
			util.shuffleInPlace(getAdjacentDestinations(tile.position, tile.tileable.size, RotationUtils.opposite(rotation)))
				.flatMap(source => world.live.getTileBounded(source)?.tileable.getAttributes(EntityMaterialStorageAttribute) || [])
				.some(sourceMaterialStorageAttribute => {
					if (sourceMaterialStorageAttribute.hasQuantity(materialCount)) {
						sourceMaterialStorageAttribute.remove(materialCount);
						this.materialStorageAttribute.add(materialCount);
						return true;
					}
					return false;
				}));
		if (some)
			this.tickResult = TickResult.DONE;
	}
}

// Power attributes (produce, consume, store, transport)

export class EntityPowerProduceAttribute extends EntityAttribute {
	private readonly powerStorageAttribute: EntityPowerStorageAttribute;
	private readonly quantity: number;

	constructor(powerStorageAttribute: EntityPowerStorageAttribute, quantity: number) {
		super();
		console.assert(quantity > 0);
		this.powerStorageAttribute = powerStorageAttribute;
		this.quantity = quantity;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.powerStorageAttribute.capacity - this.powerStorageAttribute.quantity >= this.quantity) {
			this.powerStorageAttribute.quantity += this.quantity;
			this.tickResult = TickResult.DONE;
		}
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Produces ${this.quantity} power`, {color: color.POWER_TEXT})] :
			[];
	}
}

export class EntityPowerConsumeAttribute extends EntityAttribute {
	private readonly powerStorageAttribute: EntityPowerStorageAttribute;
	private readonly quantity: number;

	constructor(powerStorageAttribute: EntityPowerStorageAttribute, quantity: number) {
		super();
		console.assert(quantity > 0);
		this.powerStorageAttribute = powerStorageAttribute;
		this.quantity = quantity;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.powerStorageAttribute.quantity >= this.quantity) {
			this.powerStorageAttribute.quantity -= this.quantity;
			this.tickResult = TickResult.DONE;
		}
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Consumes ${this.quantity} power`, {color: color.POWER_TEXT})] :
			[];
	}
}

export enum EntityPowerStorageAttributePriority {PRODUCE, STORAGE, CONSUME}

export class EntityPowerStorageAttribute extends EntityAttribute {
	readonly capacity: number;
	quantity: number = 0;
	readonly priority: EntityPowerStorageAttributePriority;

	constructor(capacity: number, priority: EntityPowerStorageAttributePriority) {
		super();
		console.assert(capacity > 0);
		console.assert(priority >= 0);
		this.capacity = capacity;
		this.priority = priority;
	}

	private static takePower(consumer: Entity, quantity: number, priority: EntityPowerStorageAttributePriority): number {
		let taken = 0;
		let visited: Set<Entity> = new Set();
		let queue = [consumer];
		while (queue.length) {
			let tileable = queue.pop()!;
			visited.add(tileable);
			if (tileable !== consumer) {
				let powerStorageAttribute = tileable.getAttribute(EntityPowerStorageAttribute);
				if (powerStorageAttribute && powerStorageAttribute.priority < priority) {
					let consume = Math.min(quantity - taken, powerStorageAttribute.quantity);
					taken += consume;
					powerStorageAttribute.quantity -= consume;
					if (taken === quantity)
						break;
				}
			}
			let attribute = tileable.getAttribute(EntityPowerConductAttribute)!;
			attribute.allConnections.forEach(connection => {
				if (!visited.has(connection))
					queue.push(connection);
			});
		}
		return taken;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.tickResult = TickResult.DONE;
		if (!this.priority) return;
		let remainingCapacity = this.capacity - this.quantity;
		if (remainingCapacity)
			this.quantity += EntityPowerStorageAttribute.takePower(tile.tileable, remainingCapacity, this.priority);
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			this.priority === EntityPowerStorageAttributePriority.STORAGE ? [new TextLine(`Stores ${this.capacity} power`, {color: color.POWER_TEXT})] : [] :
			[new TextLine(`Power ${util.textPercent(this.quantity / this.capacity)}`, {color: color.POWER_TEXT})];
	}
}

export class EntityPowerConductAttribute extends EntityAttribute {
	private readonly range: number;
	private connections: [[Vector, Entity] | null, [Vector, Entity] | null, [Vector, Entity] | null, [Vector, Entity] | null] = [null, null, null, null];
	private externalConnectionsCommitted: Entity[] = [];
	private externalConnectionsPending: Entity[] = [];
	private particles: [Particle | null, Particle | null, Particle | null, Particle | null] = [null, null, null, null];

	constructor(range: number) {
		super();
		console.assert(range >= 0);
		this.range = range;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.externalConnectionsCommitted = this.externalConnectionsPending;
		this.externalConnectionsPending = [];

		let connections: [[Vector, Entity] | null, [Vector, Entity] | null, [Vector, Entity] | null, [Vector, Entity] | null] = [null, null, null, null];
		util.enumValues(Rotation).forEach((rotation, i) =>
			getLineDestinations(tile.position, tile.tileable.size, rotation, this.range).some(destination => {
				let searchTile = world.live.getTileBounded(destination);
				if (!searchTile) return true;
				let conductAttribute = searchTile.tileable.getAttribute(EntityPowerConductAttribute);
				if (!conductAttribute) return false;
				connections[i] = [destination, searchTile.tileable];
				conductAttribute.externalConnectionsPending.push(tile.tileable);
				return true;
			}));

		connections.forEach((connection, i) => {
			if (!connection && !this.connections[i]) return;
			if (connection && this.connections[i] && connection[0].equals(this.connections[i][0])) return;

			if (this.particles[i]) {
				tile.tileable.removeOverlayParticle(this.particles[i], world);
				this.particles[i] = null;
			}

			let cvs = connection && connectionVectors(connection[0].subtract(tile.position));
			if (cvs) {
				let texture = coloredGeneratedTextures.fullRect.texture(Color.POWER_TEXT);
				this.particles[i] = tile.tileable.addOverlayParticle(texture, cvs[1], world);
				let position = tile.position.add(cvs[0]);
				this.particles[i].x = position.x;
				this.particles[i].y = position.y;
			}
		});

		this.connections = connections;
	}

	get allConnections(): Entity[] {
		let all: Entity[] = [];
		this.connections.forEach(connection => {
			if (connection)
				all.push(connection[1]);
		});
		this.externalConnectionsCommitted.forEach(connection => all.push(connection));
		return all;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[] :
			[new TextLine(`Connections ${this.allConnections.length}`, {color: color.POWER_TEXT})];
	}
}

// Coolant attributes (produce, consume, store, transport)

export class EntityCoolantProduceAttribute extends EntityAttribute {
	private readonly maxQuantity: number;
	quantity: number = 0;

	constructor(quantity: number) {
		super();
		console.assert(quantity > 0);
		this.maxQuantity = quantity;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.quantity === this.maxQuantity) return;
		this.quantity = this.maxQuantity;
		this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Produces ${this.maxQuantity} coolant`, {color: color.COOLANT_TEXT})] :
			[new TextLine(`Coolant ${util.textPercent(this.quantity / this.maxQuantity)}`, {color: color.COOLANT_TEXT})];
	}
}

export class EntityCoolantConsumeAttribute extends EntityAttribute {
	private readonly quantity: number;
	private consumed: number = 0;

	constructor(quantity: number) {
		super();
		console.assert(quantity > 0);
		this.quantity = quantity;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.consumed === this.quantity)
			this.consumed = 0;
		let coolantProduceAttributes: EntityCoolantProduceAttribute[] = util.enumValues(Rotation)
			.flatMap(rotation => getAdjacentDestinations(tile.position, tile.tileable.size, rotation))
			.map(position => world.live.getTileBounded(position))
			.map(tile => tile?.tileable.getAttribute(EntityCoolantProduceAttribute))
			.filter(coolantProduceAttribute => coolantProduceAttribute) as EntityCoolantProduceAttribute[];
		for (let i = 0; i < coolantProduceAttributes.length && this.consumed < this.quantity; i++) {
			let take = Math.min(this.quantity - this.consumed, coolantProduceAttributes[i].quantity);
			this.consumed += take;
			coolantProduceAttributes[i].quantity -= take;
		}
		if (this.consumed === this.quantity)
			this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Consumes ${this.quantity} coolant`, {color: color.COOLANT_TEXT})] :
			[new TextLine(`Coolant ${util.textPercent(this.consumed / this.quantity)}`, {color: color.COOLANT_TEXT})];
	}
}

// Liquid attributes (produce, consume, store, transport)

export class EntityLiquidExtractorAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private readonly outputPerTier: number[];

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute, outputPerTier: number[]) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
		this.outputPerTier = outputPerTier;
	}

	tick(world: World, tile: Tile<Entity>): void {
		let some = tile.position.iterate(tile.tileable.size).map(position => {
			let tile = world.terrain.getTileBounded(position);
			if (!(tile?.tileable instanceof LiquidDeposit)) return false;
			let quantity = this.outputPerTier[tile.tileable.liquidTier] || 0;
			return this.liquidStorageAttribute.tryToAdd(new ResourceUtils.Count(tile.tileable.liquid, quantity));
		}).some(v => v);
		if (some)
			this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Pumps ${this.outputPerTier.join('/')} liquid / area`, {color: color.LIQUID_TEXT})] :
			[];
	}
}

export class EntityLiquidDryExtractorAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private readonly liquidCount: ResourceUtils.Count<Liquid>;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute, liquidCount: ResourceUtils.Count<Liquid>) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
		this.liquidCount = liquidCount;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.liquidStorageAttribute.tryToAdd(new ResourceUtils.Count(this.liquidCount.resource, this.liquidCount.quantity)))
			this.tickResult = TickResult.DONE;
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Pumps ${liquidCountsString([this.liquidCount])}`, {color: color.LIQUID_TEXT})] :
			[];
	}
}

export class EntityLiquidConsumeAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private readonly liquidCount: ResourceUtils.Count<Liquid>;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute, liquidCount: ResourceUtils.Count<Liquid>) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
		this.liquidCount = liquidCount;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.liquidStorageAttribute.liquidCount.resource === this.liquidCount.resource && this.liquidStorageAttribute.liquidCount.quantity >= this.liquidCount.quantity) {
			this.liquidStorageAttribute.liquidCount = new ResourceUtils.Count(this.liquidStorageAttribute.liquidCount.resource, this.liquidStorageAttribute.liquidCount.quantity - this.liquidCount.quantity);
			this.tickResult = TickResult.DONE;
		}
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[new TextLine(`Requires ${liquidCountsString([this.liquidCount])}`, {color: color.LIQUID_TEXT})] :
			[];
	}
}

export class EntityLiquidStorageAttribute extends EntityAttribute {
	private readonly liquidsAllowed: Liquid[];
	private readonly maxQuantity: number;
	private readonly inputRotations: Rotation[];
	liquidCount: ResourceUtils.Count<Liquid>;

	constructor(liquidsAllowed: Liquid[], quantity: number, inputRotations: Rotation[]) {
		super();
		this.liquidsAllowed = liquidsAllowed;
		this.maxQuantity = quantity;
		this.inputRotations = inputRotations;
		this.liquidCount = new ResourceUtils.Count(liquidsAllowed[0], 0);
	}

	tryToAdd(liquidCount: ResourceUtils.Count<Liquid>): number {
		if (!this.liquidsAllowed.includes(liquidCount.resource)) return 0;
		if (liquidCount.resource === this.liquidCount.resource) {
			let take = Math.min(liquidCount.quantity, this.maxQuantity - this.liquidCount.quantity);
			this.liquidCount = new ResourceUtils.Count(this.liquidCount.resource, this.liquidCount.quantity + take);
			return take;
		}
		if (liquidCount.quantity > this.liquidCount.quantity && this.liquidCount.quantity < 10) {
			let take = Math.min(liquidCount.quantity, this.maxQuantity);
			this.liquidCount = new ResourceUtils.Count(liquidCount.resource, take);
			return take;
		}
		return 0;
	}

	acceptsRotation(rotation: Rotation): boolean {
		return this.inputRotations.includes(rotation);
	}

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[] :
			[new TextLine(`${ResourceUtils.liquidString(this.liquidCount.resource)} ${util.textPercent(this.liquidCount.quantity / this.maxQuantity)}`, {color: color.LIQUID_TEXT})];
	}
}

export class EntityNonEmptyLiquidStorage extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.liquidStorageAttribute.liquidCount.quantity)
			this.tickResult = TickResult.DONE;
	}
}

export class EntityLiquidTransportAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private readonly outputRotations: Rotation[];

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute, outputRotations: Rotation[]) {
		super();
		console.assert(outputRotations.length > 0);
		this.liquidStorageAttribute = liquidStorageAttribute;
		this.outputRotations = outputRotations;
	}

	static move(fromLiquidStorageAttribute: EntityLiquidStorageAttribute, outputRotations: Rotation[], world: World, tile: Tile<Entity>): boolean {
		return util.shuffleInPlace(outputRotations).some(rotation =>
			util.shuffleInPlace(getAdjacentDestinations(tile.position, tile.tileable.size, rotation)).some(destination => {
				let tile = world.live.getTileBounded(destination);
				if (!tile) return false;
				return tile.tileable.getAttributes(EntityLiquidStorageAttribute).some(destinationLiquidStorageAttribute => {
					if (!destinationLiquidStorageAttribute.acceptsRotation(rotation)) return false;
					let liquidCount = fromLiquidStorageAttribute.liquidCount;
					let take = destinationLiquidStorageAttribute!.tryToAdd(liquidCount);
					if (take) {
						fromLiquidStorageAttribute.liquidCount = new ResourceUtils.Count(liquidCount.resource, liquidCount.quantity - take);
						return true;
					}
					return false;
				});
			}));
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (!this.liquidStorageAttribute.liquidCount.quantity) return;
		if (EntityLiquidTransportAttribute.move(this.liquidStorageAttribute, this.outputRotations, world, tile))
			this.tickResult = TickResult.DONE;
	}
}

export class EntityLiquidBridgeConnectAttribute extends EntityAttribute {
	readonly rotation: Rotation;
	private readonly range: number;
	connectedPosition: Vector | null = null;
	private particle: Particle | null = null;

	constructor(rotation: Rotation, range: number) {
		super();
		this.rotation = rotation;
		this.range = range;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.tickResult = TickResult.DONE;

		let connectedPosition = getLineDestinations(tile.position, tile.tileable.size, this.rotation, this.range).find(destination =>
			world.live.getTileBounded(destination)?.tileable.getAttribute(EntityLiquidBridgeConnectAttribute)) || null;
		if (!connectedPosition && !this.connectedPosition) return;
		if (connectedPosition && this.connectedPosition && connectedPosition.equals(this.connectedPosition)) return;
		this.connectedPosition = connectedPosition;

		if (this.particle) {
			tile.tileable.removeOverlayParticle(this.particle, world);
			this.particle = null;
		}

		let cvs = connectedPosition && connectionVectors(connectedPosition.subtract(tile.position));
		if (cvs) {
			let texture = coloredGeneratedTextures.fullRect.texture(Color.LIQUID_TEXT);
			this.particle = tile.tileable.addOverlayParticle(texture, cvs[1], world);
			let position = tile.position.add(cvs[0]);
			this.particle.x = position.x;
			this.particle.y = position.y;
		}
	}
}

export class EntityLiquidBridgeTransportAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private readonly liquidBridgeConnectAttribute: EntityLiquidBridgeConnectAttribute;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute, liquidBridgeConnectAttribute: EntityLiquidBridgeConnectAttribute) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
		this.liquidBridgeConnectAttribute = liquidBridgeConnectAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (!this.liquidStorageAttribute.liquidCount.quantity) return;

		let transported = this.liquidBridgeConnectAttribute.connectedPosition ?
			world.live.getTileUnchecked(this.liquidBridgeConnectAttribute.connectedPosition).tileable.getAttributes(EntityLiquidStorageAttribute)
				.filter(liquidStorageAttribute => liquidStorageAttribute.acceptsRotation(this.liquidBridgeConnectAttribute.rotation))
				.some(destinationLiquidStorageAttribute => {
					let liquidCount = this.liquidStorageAttribute.liquidCount;
					let take = destinationLiquidStorageAttribute!.tryToAdd(liquidCount);
					if (take) {
						this.liquidStorageAttribute.liquidCount = new ResourceUtils.Count(liquidCount.resource, liquidCount.quantity - take);
						return true;
					}
					return false;
				}) :
			EntityLiquidTransportAttribute.move(this.liquidStorageAttribute, [this.liquidBridgeConnectAttribute.rotation], world, tile);
		if (transported)
			this.tickResult = TickResult.DONE;
	}
}

// Resource attributes

export class EntityMaterialPickerAttribute extends EntityAttribute {
	material: Material = 0;

	tooltip(type: TooltipType): TextLine[] {
		return type === TooltipType.PLACER ?
			[] :
			util.enumValues(Material).map(material => {
				let color = material === this.material ? Color.SELECTED_TEXT : undefined;
				return new TextLine(ResourceUtils.materialString(material), {callback: () => this.material = material, color});
			});
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityMaterialDisplayAttribute extends EntityAttribute {
	material: Material;

	constructor(material: Material) {
		super();
		this.material = material;
	}

	tooltip(type: TooltipType): TextLine[] {
		return [new TextLine(ResourceUtils.materialString(this.material))];
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityLiquidDisplayAttribute extends EntityAttribute {
	liquid: Liquid;

	constructor(liquid: Liquid) {
		super();
		this.liquid = liquid;
	}

	tooltip(type: TooltipType): TextLine[] {
		return [new TextLine(ResourceUtils.liquidString(this.liquid))];
	}

	get selectable(): boolean {
		return true;
	}
}

// Attack attributes

export class EntitySpawnProjectileAttribute extends EntityAttribute {
	private readonly findTargetAttribute: EntityFindTargetAttribute;
	private readonly count: number;
	private readonly damageSize: number;
	private readonly speed: number;
	private readonly duration: number;
	private readonly collisionSize: number;
	private readonly damage: number;
	private readonly spreadDegrees: number;
	private readonly sourceFriendly: boolean;

	constructor(findTargetAttribute: EntityFindTargetAttribute, count: number, damageSize: number, speed: number, duration: number, collisionSize: number, damage: number, spreadDegrees: number, sourceFriendly: boolean) {
		super();
		console.assert(count > 0);
		console.assert(damageSize >= 0);
		console.assert(speed > 0);
		console.assert(duration > 0);
		console.assert(collisionSize > 0);
		console.assert(damage > 0);
		this.findTargetAttribute = findTargetAttribute;
		this.count = count;
		this.damageSize = damageSize;
		this.speed = speed;
		this.duration = duration;
		this.collisionSize = collisionSize;
		this.damage = damage;
		this.spreadDegrees = spreadDegrees;
		this.sourceFriendly = sourceFriendly;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.tickResult = TickResult.DONE;
		let targets = this.findTargetAttribute.targets;
		console.assert(targets.length > 0);
		let position = tile.position.add(tile.tileable.size.scale(.5));
		for (let i = 0; i < this.count; i++) {
			let velocity = targets[i % targets.length][0]
				.subtract(position)
				.rotateCounter(util.randWidth(this.spreadDegrees));
			if (velocity.magnitude2 > this.speed ** 2)
				velocity = velocity.setMagnitude(this.speed);
			world.free.addTileable(position, new Projectile(velocity, this.damageSize, this.duration, this.collisionSize, this.damage, this.sourceFriendly));
		}
	}
}

// Mob attributes

export class EntityMobHerdPositionAttribute extends EntityAttribute {
	newPosition: Vector = Vector.V0;
	velocity: Vector = Vector.V0;
	readonly speed: number;
	active = true;

	constructor(speed: number) {
		super();
		this.speed = speed;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (!this.newPosition.equals(tile.position) && this.active)
			world.free.updateTile(this.newPosition, tile);
		this.tickResult = TickResult.DONE;
	}
}

export class EntityMobHerdPositionActivateAttribute extends EntityAttribute {
	private readonly mobHerdPositionAttribute: EntityMobHerdPositionAttribute;
	private readonly active: boolean;

	constructor(mobHerdPositionAttribute: EntityMobHerdPositionAttribute, active: boolean) {
		super();
		this.mobHerdPositionAttribute = mobHerdPositionAttribute;
		this.active = active;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.mobHerdPositionAttribute.active = this.active;
		this.tickResult = TickResult.DONE;
	}
}

export class EntityMobMoveTowardsPositionAttribute extends EntityAttribute {
	private readonly findTargetAttribute: EntityFindTargetAttribute;
	private readonly distance2: number;
	private readonly speed: number;
	private readonly speed2: number;

	constructor(findTargetAttribute: EntityFindTargetAttribute, distance: number, speed: number) {
		super();
		this.findTargetAttribute = findTargetAttribute;
		this.distance2 = distance ** 2;
		this.speed = speed;
		this.speed2 = speed ** 2;
	}

	tick(world: World, tile: Tile<Entity>): void {
		console.assert(this.findTargetAttribute.targets.length > 0);
		let delta = this.findTargetAttribute.targets[0][0].subtract(tile.position);
		if (delta.magnitude2 <= this.distance2) {
			this.tickResult = TickResult.DONE;
			return;
		}
		if (delta.magnitude2 > this.speed2)
			delta = delta.setMagnitude(this.speed);
		world.free.updateTile(tile.position.add(delta), tile);
	}
}

export class EntityFindTargetAttribute extends EntityAttribute {
	private readonly range: number;
	private readonly numTargets: number;
	private readonly sourceFriendly: boolean;
	private readonly targetFriendly: boolean;
	targets: [Vector, Entity][] = [];

	constructor(range: number, numTargets: number, sourceFriendly: boolean, targetFriendly: boolean) {
		super();
		console.assert(range > 0);
		console.assert(numTargets > 0);
		this.range = range;
		this.numTargets = numTargets;
		this.sourceFriendly = sourceFriendly;
		this.targetFriendly = targetFriendly;
	}

	private static findTargetsWithinRange(position: Vector, range: number, limit: number, targetFriendly: boolean, world: World): [Vector, Entity][] {
		let targets: [Vector, Entity][] = [];
		let range2 = range * range;
		let rangeV = new Vector(range);

		if (targetFriendly) {
			let min = position.subtract(rangeV).floor.max(Vector.V0);
			let max = position.add(rangeV).floor.min(world.size.subtract(Vector.V1));
			// todo add chunks to live layer for faster searching
			util.centerIterator(min, max, position.floor, (x, y) => {
				let targetPosition = new Vector(x, y);
				let targetCenterPosition = targetPosition.add(new Vector(.5));
				if (position.subtract(targetCenterPosition).magnitude2 >= range2) return false;
				let tile = world.live.getTileUnchecked(targetPosition);
				let healthAttribute = tile.tileable.getAttribute(EntityHealthAttribute);
				if (!healthAttribute || !healthAttribute.sourceFriendly) return false;
				targets.push([targetCenterPosition, tile.tileable]);
				return targets.length === limit;
			});
			return targets;

		} else {
			let chunks = world.freeMobHerdPositionAttributeOverlay.chunkRange(position.subtract(rangeV), position.add(rangeV));
			for (let chunk of chunks)
				for (let [tile, mobHerdPositionAttribute] of chunk) {
					let delta = tile.position.subtract(position);
					if (delta.magnitude2 >= range2) continue;
					let healthAttribute = tile.tileable.getAttribute(EntityHealthAttribute);
					if (!healthAttribute || healthAttribute.sourceFriendly) continue;
					targets.push([tile.position, tile.tileable]);
					if (targets.length === limit)
						return targets;
				}
			return targets;
		}
	}

	tick(world: World, tile: Tile<Entity>): void {
		let position = this.sourceFriendly ? tile.position.add(tile.tileable.size.scale(.5)) : tile.position;
		this.targets = EntityFindTargetAttribute.findTargetsWithinRange(position, this.range, this.numTargets, this.targetFriendly, world);
		if (this.targets.length)
			this.tickResult = TickResult.DONE;
	}

	get tooltipRange(): number {
		return this.range;
	}
}

export class EntityDirectionMovementAttribute extends EntityAttribute {
	private readonly velocity: Vector;

	constructor(velocity: Vector) {
		super();
		this.velocity = velocity;
	}

	tick(world: World, tile: Tile<Entity>): void {
		let position = tile.position.add(this.velocity);
		if (!world.free.inBounds(position, tile.tileable.size)) {
			world.free.removeTile(tile);
			this.tickResult = TickResult.END_TICK;
		}
		world.free.updateTile(position, tile);
		this.tickResult = TickResult.DONE;
	}
}

export class EntityDamageTargetAttribute extends EntityAttribute {
	private readonly findTargetAttribute: EntityFindTargetAttribute;
	private readonly damage: number;

	constructor(findTargetAttribute: EntityFindTargetAttribute, damage: number) {
		super();
		console.assert(damage > 0);
		this.findTargetAttribute = findTargetAttribute;
		this.damage = damage;
	}

	tick(world: World, tile: Tile<Entity>): void {
		let targets = this.findTargetAttribute.targets;
		targets.forEach(target => {
			let healthAttribute = target[1].getAttribute(EntityHealthAttribute)!;
			healthAttribute.health = Math.max(healthAttribute!.health - this.damage, 0);
		});
		this.tickResult = TickResult.DONE;
	}
}

export class EntityExpireProjectileAttribute extends EntityAttribute {
	tick(world: World, tile: Tile<Entity>): void {
		world.free.removeTile(tile);
		this.tickResult = TickResult.END_TICK;
	}
}

// Graphic attributes

export class EntityMaterialOverlayAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly timedAttribute: EntityTimedAttribute;
	private readonly rotation: Rotation;
	private material: Material | null = null;
	private particle: Particle | null = null;

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute, timedAttribute: EntityTimedAttribute, rotation: Rotation) {
		super();
		this.materialStorageAttribute = materialStorageAttribute;
		this.timedAttribute = timedAttribute;
		this.rotation = rotation;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (this.materialStorageAttribute.empty) {
			if (this.particle) {
				tile.tileable.removeOverlayParticle(this.particle, world);
				this.material = null;
				this.particle = null;
			}
		} else {
			let material = this.materialStorageAttribute.peek!;
			if (material !== this.material) {
				this.material = material;
				let color = ResourceUtils.materialColor(material);
				this.particle = tile.tileable.addOverlayParticle(coloredGeneratedTextures.fullRect.texture(color), new Vector(.5), world);
			}
			let shiftRatio = this.timedAttribute.counter.ratio || 1;
			let shift = RotationUtils.positionShift(this.rotation);
			let position = tile.position
				.add(shift.scale(shiftRatio - .5))
				.add(new Vector(.25));
			this.particle!.x = position.x;
			this.particle!.y = position.y;
		}
		this.tickResult = TickResult.DONE;
	}
}

export class EntityLiquidOverlayAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private liquid: Liquid | null = null;
	private particle: Particle | null = null;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		if (!this.liquidStorageAttribute.liquidCount.quantity) {
			if (this.particle) {
				tile.tileable.removeOverlayParticle(this.particle, world);
				this.liquid = null;
				this.particle = null;
			}
		} else {
			let liquid = this.liquidStorageAttribute.liquidCount.resource;
			if (liquid !== this.liquid) {
				this.liquid = liquid;
				let color = ResourceUtils.liquidColor(liquid);
				let size = tile.tileable.size.scale(.25);
				this.particle = tile.tileable.addOverlayParticle(coloredGeneratedTextures.fullRect.texture(color), size, world);
				let position = tile.position.add(tile.tileable.size.subtract(size).scale(.5));
				this.particle.x = position.x;
				this.particle.y = position.y;
			}
		}
		this.tickResult = TickResult.DONE;
	}
}

export class EntityActiveSpriteAttribute extends EntityAttribute {
	private readonly sprite: AnimatedSprite;
	private readonly timedAttribute: EntityTimedAttribute;

	constructor(sprite: AnimatedSprite, timedAttribute: EntityTimedAttribute) {
		super();
		this.sprite = sprite;
		this.timedAttribute = timedAttribute;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.sprite.currentFrame = Math.floor(this.timedAttribute.counter.ratio * this.sprite.textures.length);
		this.tickResult = TickResult.DONE;
	}
}

export class EntitySpawnParticleAttribute extends EntityAttribute {
	private readonly count: number;
	private readonly topLeft: Vector;
	private readonly widthHeight: Vector;
	private readonly minSize: number;
	private readonly maxSize: number;
	private readonly maxSpeed: number;
	private readonly duration: number;
	private readonly texture: Texture;

	constructor(count: number, topLeft: Vector, widthHeight: Vector, minSize: number, maxSize: number, maxSpeed: number, duration: number, texture: Texture) {
		super();
		console.assert(count > 0);
		console.assert(minSize > 0);
		console.assert(maxSize >= minSize);
		console.assert(maxSpeed >= 0);
		console.assert(duration > 0);
		this.count = count;
		this.topLeft = topLeft;
		this.widthHeight = widthHeight;
		this.minSize = minSize;
		this.maxSize = maxSize;
		this.maxSpeed = maxSpeed;
		this.duration = duration;
		this.texture = texture;
	}

	tick(world: World, tile: Tile<Entity>): void {
		this.tickResult = TickResult.DONE;
		let topLeft = tile.position.add(tile.tileable.size.scale(.5)).add(this.topLeft);
		for (let i = 0; i < this.count; i++) {
			let position = topLeft.add(Vector.rand(0, 1).multiply(this.widthHeight));
			let velocity = Vector.rand(-this.maxSpeed, this.maxSpeed);
			let size = util.rand(this.minSize, this.maxSize);
			world.free.addTileable(position, new ParticleEntity(velocity, size, this.duration, this.texture));
		}
	}
}
