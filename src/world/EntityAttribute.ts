import {Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import {generatedTextures} from '../graphics/generatedTextures.js';
import TextLine from '../ui/TextLine.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity, LiquidDeposit, MaterialDeposit, Projectile} from './Entity.js';
import {Liquid, Material, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, World} from './World.js';

let getAdjacentDestinations = (origin: Vector, size: Vector, rotation: Rotation): Vector[] => {
	switch (rotation) {
		case Rotation.UP:
			size = new Vector(size.x, 1);
			break;
		case Rotation.LEFT:
			size = new Vector(1, size.y);
			break;
		case Rotation.DOWN:
			origin = new Vector(origin.x, origin.y + size.y - 1);
			size = new Vector(size.x, 1);
			break;
		case Rotation.RIGHT:
			origin = new Vector(origin.x + size.x - 1, origin.y);
			size = new Vector(1, size.y);
			break;
	}
	let shift = RotationUtils.positionShift(rotation);
	return origin.iterate(size).map(border => border.add(shift));
};

let getLineDestinations = (origin: Vector, size: Vector, rotation: Rotation, range: number): Vector[] => {
	let adjacents = getAdjacentDestinations(origin, size, rotation);
	let shift = RotationUtils.positionShift(rotation);
	return util.arr(range)
		.map(offsetMagnitude => shift.scale(new Vector(offsetMagnitude)))
		.flatMap(offset => adjacents.map(adjacent => adjacent.add(offset)));
};

export abstract class EntityAttribute {
	private done: boolean = false;

	tick(world: World, tile: Tile<Entity>): boolean {
		if (!this.done && this.tickHelper(world, tile))
			this.done = true;
		return this.done;
	}

	reset() {
		this.done = false;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		return true;
	}

	get tooltip(): TextLine[] {
		return [];
	}

	get selectable(): boolean {
		return false;
	}
}

// Helper attributes

export class EntityNameAttribute extends EntityAttribute {
	readonly name: string;

	constructor(name: string) {
		super();
		console.assert(!!name);
		this.name = name;
	}

	get tooltip(): TextLine[] {
		return [new TextLine(this.name)];
	}
}

// todo some graphical indicator for buildings queued, buildings in progress, buildings active
// todo partial health for partially built buildings
// todo gets stuck building when out of resources
// todo queued salvage not displaying correctly
// todo don't move resources into storage that's still being built. don't act upon entities that are still being built. maybe move them from the live layer to an in-progress layer
export class EntityBuildableAttribute extends EntityAttribute {
	private readonly counter: Counter;
	private readonly materialCost: ResourceUtils.Count<Material>[];
	doneBuilding = false;

	constructor(duration: number, materialCost: ResourceUtils.Count<Material>[]) {
		super();
		this.counter = new Counter(duration * 20);
		this.materialCost = materialCost;
	}

	// returns true if building. returns false if done building or insufficient material
	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.doneBuilding) return false;
		if (world.playerLogic.built) return false;
		world.playerLogic.built = true;

		let lastRatio = this.counter.i / this.counter.n;
		let ratio = (this.counter.i + 1) / this.counter.n;
		let costs = this.materialCost.map(cost => new ResourceUtils.Count(
			cost.resource, Math.floor(cost.quantity * ratio) - Math.floor(cost.quantity * lastRatio)));

		if (!costs.every(cost => world.playerLogic.materials.hasQuantity(cost)))
			return false;

		costs.forEach(cost => world.playerLogic.materials.remove(cost));
		if (this.counter.tick())
			this.doneBuilding = true;
		return true;
	}

	get tooltip(): TextLine[] {
		if (this.doneBuilding) return [];
		let percent = Math.floor(this.counter.i / this.counter.n * 100);
		return this.doneBuilding ? [] : [new TextLine(`Building ${percent}%`)];
	}
}

export class EntityHealthAttribute extends EntityAttribute {
	private readonly maxHealth: number;
	health: number;

	constructor(health: number) {
		super();
		console.assert(health > 0);
		this.maxHealth = health;
		this.health = health;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.health <= 0) {
			world.live.replaceTileable(tile.position, new Empty());
			return false;
		}
		return true;
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`Health ${this.health} / ${this.maxHealth}`)];
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityTimedAttribute extends EntityAttribute {
	private readonly counter: Counter;

	constructor(duration: number) {
		super();
		console.assert(duration > 0);
		this.counter = new Counter(duration);
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		return this.counter.tick();
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`Cooldown ${this.counter.i} / ${this.counter.n}`)];
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.outputs.every(materialCount => this.materialStorageAttribute.hasCapacity(materialCount))) {
			this.outputs.forEach(materialCount => this.materialStorageAttribute.add(materialCount));
			return true;
		}
		return false;
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		tile.position.iterate(tile.tileable.size).forEach(position => {
			let tile = world.terrain.getTile(position);
			if (!(tile?.tileable instanceof MaterialDeposit)) return;
			this.quantities[tile.tileable.material] += this.outputPerTier[tile.tileable.materialTier];
		});
		util.enumValues(Material).forEach(material => {
			let n = Math.floor(this.quantities[material]);
			if (!n) return;
			this.quantities[material] -= n;
			this.materialStorageAttribute.add(new ResourceUtils.Count(material, n));
		});
		return true;
	}
}

export class EntityMaterialSourceAttribute extends EntityAttribute {
	private readonly materialPickerAttribute: EntityMaterialPickerAttribute;

	constructor(materialPickerAttribute: EntityMaterialPickerAttribute) {
		super();
		this.materialPickerAttribute = materialPickerAttribute;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let materialCount = new ResourceUtils.Count(this.materialPickerAttribute.material, 1);
		util.enumValues(Rotation).forEach(rotation =>
			getAdjacentDestinations(tile.position, tile.tileable.size, rotation)
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute(EntityMaterialStorageAttribute))
				.forEach(materialStorageAttribute => {
					if (materialStorageAttribute?.acceptsRotation(rotation) && materialStorageAttribute.hasCapacity(materialCount))
						materialStorageAttribute.add(materialCount);
				}));
		return true;
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.inputs.every(materialCount => this.materialStorageAttribute.hasQuantity(materialCount))) {
			this.inputs.forEach(materialCount => this.materialStorageAttribute.remove(materialCount));
			return true;
		}
		return false;
	}
}

export class EntityMaterialStorageAttribute extends EntityAttribute {
	private readonly totalCapacity: number;
	private readonly materialCapacities: ResourceUtils.Count<Material>[];
	private readonly inputRotations: Rotation[];
	private readonly quantities: Record<Material, number>;
	private readonly orderedAndRotations: [Material, Rotation][] = [];

	constructor(totalCapacity: number,
	            materialCapacities: ResourceUtils.Count<Material>[],
	            inputRotations: Rotation[] = util.enumValues(Rotation)) {
		super();
		console.assert(totalCapacity > 0);
		console.assert(materialCapacities.length > 0);
		console.assert(materialCapacities.every(materialCount => materialCount.quantity > 0));
		this.totalCapacity = totalCapacity;
		this.materialCapacities = materialCapacities;
		this.inputRotations = inputRotations;
		this.quantities = Object.fromEntries(util.enumValues(Material)
			.map(material => [material, 0])) as Record<Material, number>;
	}

	private getMaterialCapacity(material: Material): number {
		return this.materialCapacities.find(capacity => capacity.resource === material)?.quantity ?? 0;
	}

	get empty() {
		return !this.orderedAndRotations.length;
	}

	get peek(): [Material, Rotation] | undefined {
		return this.orderedAndRotations.at(-1);
	}

	hasCapacity(materialCount: ResourceUtils.Count<Material>): boolean {
		return this.orderedAndRotations.length + materialCount.quantity <= this.totalCapacity &&
			this.quantities[materialCount.resource] + materialCount.quantity <= this.getMaterialCapacity(materialCount.resource);
	}

	hasQuantity(materialCount: ResourceUtils.Count<Material>): boolean {
		return this.quantities[materialCount.resource] >= materialCount.quantity;
	}

	add(materialCount: ResourceUtils.Count<Material>, rotation: Rotation = Rotation.UP) {
		this.quantities[materialCount.resource] += materialCount.quantity;
		util.arr(materialCount.quantity).forEach(() =>
			this.orderedAndRotations.push([materialCount.resource, rotation]));
	}

	remove(materialCount: ResourceUtils.Count<Material>) {
		this.quantities[materialCount.resource] -= materialCount.quantity;
		for (let i = 0; i < materialCount.quantity; i++)
			this.orderedAndRotations.splice(this.orderedAndRotations.findLastIndex(materialAndRotation => materialAndRotation[0] === materialCount.resource), 1);
	}

	acceptsRotation(rotation: Rotation): boolean {
		return this.inputRotations.includes(rotation);
	}

	get tooltip(): TextLine[] {
		let tooltipLines = this.materialCapacities
			.filter(capacity => capacity.quantity)
			.map(capacity => {
				let material = Number(capacity.resource);
				let prefix = `${ResourceUtils.materialString(material)} ${this.quantities[capacity.resource]}`;
				return new TextLine(capacity.quantity !== Infinity ? `${prefix} / ${capacity.quantity}` : `${prefix}`);
			});
		if (this.totalCapacity !== Infinity && this.orderedAndRotations.length)
			tooltipLines.push(new TextLine(`${this.orderedAndRotations.length} / ${this.totalCapacity}`));
		return tooltipLines;
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		return !this.materialStorageAttribute.empty;
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
		return util.shuffle(outputRotations).some(rotation =>
			util.shuffle(getAdjacentDestinations(tile.position, tile.tileable.size, rotation))
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute(EntityMaterialStorageAttribute))
				.some(destinationMaterialStorageAttribute =>
					util.shuffle(materialCounts).some(materialCount => {
						if (destinationMaterialStorageAttribute?.acceptsRotation(rotation) && destinationMaterialStorageAttribute.hasCapacity(materialCount)) {
							fromMaterialStorageAttribute.remove(materialCount);
							destinationMaterialStorageAttribute.add(materialCount, rotation);
							return true;
						}
						return false;
					})));
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.materialStorageAttribute.empty) return false;
		let [material] = this.materialStorageAttribute.peek!;
		return EntityTransportAttribute.move(this.materialStorageAttribute, this.outputRotations, [new ResourceUtils.Count(material, 1)], world, tile);
	}
}

export class EntityJunctionTransportAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute) {
		super();
		this.materialStorageAttribute = materialStorageAttribute;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.materialStorageAttribute.empty) return false;
		let [material, rotation] = this.materialStorageAttribute.peek!;
		return EntityTransportAttribute.move(this.materialStorageAttribute, [rotation], [new ResourceUtils.Count(material, 1)], world, tile);
	}
}

export class EntityOutflowAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;
	private readonly materialCounts: ResourceUtils.Count<Material>[];

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute, materialCounts: ResourceUtils.Count<Material>[]) {
		super();
		console.assert(materialCounts.length > 0);
		console.assert(materialCounts.every(materialCount => materialCount.quantity > 0));
		this.materialStorageAttribute = materialStorageAttribute;
		this.materialCounts = materialCounts;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.materialStorageAttribute.empty) return false;
		let outputRotations: Rotation[] = util.enumValues(Rotation);
		let materialCounts = this.materialCounts.filter(materialCount => this.materialStorageAttribute.hasQuantity(materialCount));
		return EntityTransportAttribute.move(this.materialStorageAttribute, outputRotations, materialCounts, world, tile);
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let materialCount = new ResourceUtils.Count(this.materialPickerAttribute.material, 1);
		if (!this.materialStorageAttribute.hasCapacity(materialCount)) return false;
		return util.shuffle(this.inputRotations).some(rotation =>
			util.shuffle(getAdjacentDestinations(tile.position, tile.tileable.size, RotationUtils.opposite(rotation)))
				.map(source => world.live.getTile(source)?.tileable.getAttribute(EntityMaterialStorageAttribute))
				.some(sourceMaterialStorageAttribute => {
					if (sourceMaterialStorageAttribute?.hasQuantity(materialCount)) {
						sourceMaterialStorageAttribute.remove(materialCount);
						this.materialStorageAttribute.add(materialCount, rotation);
						return true;
					}
					return false;
				}));
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.powerStorageAttribute.capacity - this.powerStorageAttribute.quantity >= this.quantity) {
			this.powerStorageAttribute.quantity += this.quantity;
			return true;
		}
		return false;
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.powerStorageAttribute.quantity >= this.quantity) {
			this.powerStorageAttribute.quantity -= this.quantity;
			return true;
		}
		return false;
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
		let visited = new Set();
		let queue = [consumer];
		while (queue.length) {
			let tileable = queue.pop()!;
			visited.add(tileable);
			if (tileable !== consumer) {
				let powerStorageAttribute = tileable.getAttribute(EntityPowerStorageAttribute);
				if (powerStorageAttribute && powerStorageAttribute.priority < priority) {
					let consume = Math.min(quantity, powerStorageAttribute.quantity);
					taken += consume;
					powerStorageAttribute.quantity -= consume;
					if (taken === quantity)
						break;
				}
			}
			tileable.getAttribute(EntityPowerConductAttribute)?.allConnections
				.filter(entity => !visited.has(entity) && entity.getAttribute(EntityPowerConductAttribute))
				.forEach(entity => queue.push(entity));
		}
		return taken;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (!this.priority) return true;
		let remainingCapacity = this.capacity - this.quantity;
		if (remainingCapacity)
			this.quantity += EntityPowerStorageAttribute.takePower(tile.tileable, remainingCapacity, this.priority);
		return true;
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`Power ${this.quantity} / ${this.capacity}`)];
	}
}

export class EntityPowerConductAttribute extends EntityAttribute {
	private readonly range: number;
	private connections: Entity[] = [];
	private oldConnections: Entity[] = [];

	constructor(range: number) {
		super();
		console.assert(range >= 0);
		this.range = range;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		this.oldConnections = this.connections;
		this.connections = [];
		util.enumValues(Rotation).forEach(rotation => {
			getLineDestinations(tile.position, tile.tileable.size, rotation, this.range).some(destination => {
				// todo this will only allow 1 connection in each direction. won't work when size is > 1
				let searchTile = world.live.getTile(destination);
				// todo some tiles should block
				if (!searchTile)
					return true;
				let conductAttribute = searchTile.tileable.getAttribute(EntityPowerConductAttribute);
				if (conductAttribute) {
					this.connections.push(searchTile.tileable);
					conductAttribute.connections.push(tile.tileable);
					return true;
				}
			});
		});
		return true;
	}

	get allConnections() {
		return this.connections.concat(this.oldConnections).filter(util.unique);
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`Connections ${this.allConnections.length}`)];
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		this.quantity = this.maxQuantity;
		return true;
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`Coolant ${this.quantity} / ${this.maxQuantity}`)];
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let coolantProduceAttributes: EntityCoolantProduceAttribute[] = util.enumValues(Rotation)
			.flatMap(rotation => getAdjacentDestinations(tile.position, tile.tileable.size, rotation))
			.map(position => world.live.getTile(position))
			.map(tile => tile?.tileable.getAttribute(EntityCoolantProduceAttribute))
			.filter(coolantProduceAttribute => coolantProduceAttribute) as EntityCoolantProduceAttribute[];
		for (let i = 0; i < coolantProduceAttributes.length && this.consumed < this.quantity; i++) {
			let take = Math.min(this.quantity - this.consumed, coolantProduceAttributes[i].quantity);
			this.consumed += take;
			coolantProduceAttributes[i].quantity -= take;
		}
		if (this.consumed === this.quantity) {
			this.consumed = 0;
			return true;
		}
		return false;
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`Coolant ${this.consumed} / ${this.quantity}`)];
	}
}

// Liquid attributes (produce, consume, store, transport)

export class EntityLiquidExtractorAttribute extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;
	private readonly quantity: number;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute, quantity: number) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
		this.quantity = quantity;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let area = tile.tileable.size.x * tile.tileable.size.y;
		tile.position.iterate(tile.tileable.size).forEach(position => {
			let tile = world.terrain.getTile(position);
			if (!(tile?.tileable instanceof LiquidDeposit)) return;
			this.liquidStorageAttribute.tryToAdd(new ResourceUtils.Count<Liquid>(tile.tileable.liquid, this.quantity / area));
		});
		return true;
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		this.liquidStorageAttribute.tryToAdd(new ResourceUtils.Count<Liquid>(this.liquidCount.resource, this.liquidCount.quantity));
		return true;
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

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.liquidStorageAttribute.liquidCount.resource === this.liquidCount.resource && this.liquidStorageAttribute.liquidCount.quantity >= this.liquidCount.quantity) {
			this.liquidStorageAttribute.liquidCount = new ResourceUtils.Count<Liquid>(this.liquidStorageAttribute.liquidCount.resource, this.liquidStorageAttribute.liquidCount.quantity - this.liquidCount.quantity);
			return true;
		}
		return false;
	}
}

export class EntityLiquidStorageAttribute extends EntityAttribute {
	private readonly liquidsAllowed: Liquid[];
	private readonly maxQuantity: number;
	private readonly inputRotations: Rotation[];
	liquidCount = new ResourceUtils.Count<Liquid>(Liquid.WATER, 0);

	constructor(liquidsAllowed: Liquid[], quantity: number, inputRotations: Rotation[]) {
		super();
		this.liquidsAllowed = liquidsAllowed;
		this.maxQuantity = quantity;
		this.inputRotations = inputRotations;
	}

	tryToAdd(liquidCount: ResourceUtils.Count<Liquid>): number {
		if (!this.liquidsAllowed.includes(liquidCount.resource)) return 0;
		if (liquidCount.resource === this.liquidCount.resource) {
			let take = Math.min(liquidCount.quantity, this.maxQuantity - this.liquidCount.quantity);
			this.liquidCount = new ResourceUtils.Count<Liquid>(this.liquidCount.resource, this.liquidCount.quantity + take);
			return take;
		}
		if (liquidCount.quantity > this.liquidCount.quantity && this.liquidCount.quantity < 10) {
			let take = Math.min(liquidCount.quantity, this.maxQuantity);
			this.liquidCount = new ResourceUtils.Count<Liquid>(liquidCount.resource, take);
			return take;
		}
		return 0;
	}

	acceptsRotation(rotation: Rotation): boolean {
		return this.inputRotations.includes(rotation);
	}

	get tooltip(): TextLine[] {
		return [new TextLine(`${ResourceUtils.liquidString(this.liquidCount.resource)} ${this.liquidCount.quantity} / ${this.maxQuantity}`)];
	}
}

export class EntityNonEmptyLiquidStorage extends EntityAttribute {
	private readonly liquidStorageAttribute: EntityLiquidStorageAttribute;

	constructor(liquidStorageAttribute: EntityLiquidStorageAttribute) {
		super();
		this.liquidStorageAttribute = liquidStorageAttribute;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		return !!this.liquidStorageAttribute.liquidCount.quantity;
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
		return util.shuffle(outputRotations).some(rotation =>
			util.shuffle(getAdjacentDestinations(tile.position, tile.tileable.size, rotation))
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute(EntityLiquidStorageAttribute))
				.some(destinationLiquidStorageAttribute => {
					let liquidCount = fromLiquidStorageAttribute.liquidCount;
					if (destinationLiquidStorageAttribute?.acceptsRotation(rotation)) {
						let take = destinationLiquidStorageAttribute.tryToAdd(liquidCount);
						if (take) {
							fromLiquidStorageAttribute.liquidCount = new ResourceUtils.Count<Liquid>(liquidCount.resource, liquidCount.quantity - take);
							return true;
						}
					}
					return false;
				}));
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let liquidCount = this.liquidStorageAttribute.liquidCount;
		if (!liquidCount.quantity) return false;
		return EntityLiquidTransportAttribute.move(this.liquidStorageAttribute, this.outputRotations, world, tile);
	}
}

// Resource attributes

export class EntityMaterialPickerAttribute extends EntityAttribute {
	material: Material = 0;

	get tooltip(): TextLine[] {
		return util.enumValues(Material).map(material => {
			let color = material === this.material ? Color.SELECTED_TEXT : undefined;
			return new TextLine(ResourceUtils.materialString(material), () => this.material = material, undefined, color);
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

	get tooltip(): TextLine[] {
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

	get tooltip(): TextLine[] {
		return [new TextLine(ResourceUtils.liquidString(this.liquid))];
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityMaterialFullSpriteAttribute extends EntityAttribute {
	private readonly materialStorageAttribute: EntityMaterialStorageAttribute;

	constructor(materialStorageAttribute: EntityMaterialStorageAttribute) {
		super();
		this.materialStorageAttribute = materialStorageAttribute;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		// todo color
		// todo cache
		tile.tileable.addOverlaySprite(!this.materialStorageAttribute.empty ? new Sprite(generatedTextures.materialIndicator.texture) : null);
		return true;
	}
}

// Mob and combat attributes

export class EntityMobHealthAttribute extends EntityAttribute {
	private readonly maxHealth: number;
	health: number;

	constructor(health: number) {
		super();
		console.assert(health > 0);
		this.maxHealth = health;
		this.health = health;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.health <= 0) {
			world.mobLayer.removeTile(tile);
			return false;
		}
		return true;
	}
}

export class EntityMobChaseTargetAttribute extends EntityAttribute {
	private readonly velocity: number;
	private readonly distance: number;
	target: Vector = Vector.V0;

	constructor(velocity: number, distance: number) {
		super();
		console.assert(velocity > 0);
		console.assert(distance > 0);
		this.velocity = velocity;
		this.distance = distance;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let delta = this.target.subtract(tile.position);
		if (delta.magnitude2 <= this.distance ** 2) return true;
		if (delta.magnitude2 > this.velocity ** 2)
			delta = delta.setMagnitude2(this.velocity ** 2);
		world.mobLayer.updateTile(tile.position.add(delta), tile);
		return true;
	}
}

export class EntitySpawnProjectileAttribute extends EntityAttribute {
	private readonly velocity: number;
	private readonly duration: number;
	private readonly range: number;
	private readonly maxTargets: number;
	private readonly damage: number;
	private readonly friendly: boolean;

	constructor(velocity: number, duration: number, range: number, maxTargets: number, damage: number, friendly: boolean) {
		super();
		console.assert(velocity > 0);
		console.assert(duration > 0);
		console.assert(range > 0);
		console.assert(maxTargets > 0);
		console.assert(damage > 0);
		this.velocity = velocity;
		this.duration = duration;
		this.range = range;
		this.maxTargets = maxTargets;
		this.damage = damage;
		this.friendly = friendly;
	}

	static findTargetsWithinRange(position: Vector, range: number, targetFriendly: boolean, world: World): [Vector, Entity][] {
		let targets: [Vector, Entity][];
		if (targetFriendly) {
			let start = position.subtract(new Vector(range)).floor();
			let end = position.add(new Vector(range)).floor();
			targets = start.iterate(end.subtract(start).add(new Vector(1)))
				.map((position): [Vector, Entity | undefined] => [position, world.live.getTile(position)?.tileable])
				.filter(([_, entity]) => entity?.getAttribute(EntityHealthAttribute)) as [Vector, Entity][];
		} else
			targets = world.mobLayer.tiles
				.map((tile): [Vector, Entity] => [tile.position, tile.tileable])
				.filter(([p]) => p.subtract(position).magnitude2 < range ** 2)
				.filter(([_, entity]) => entity.getAttribute(EntityMobHealthAttribute));
		return targets.sort(([p1], [p2]) => p1.subtract(position).magnitude2 - p2.subtract(position).magnitude2);
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let targets = EntitySpawnProjectileAttribute.findTargetsWithinRange(tile.position, this.velocity * this.duration + this.range, !this.friendly, world);
		if (!targets.length) return false;
		let velocity = targets[0][0].subtract(tile.position);
		if (velocity.magnitude2 > this.velocity ** 2)
			velocity = velocity.setMagnitude2(this.velocity ** 2);
		world.mobLayer.addTileable(tile.position, new Projectile(velocity, this.duration, this.range, this.maxTargets, this.damage, this.friendly));
		return true;
	}
}

export class EntityDirectionMovementAttribute extends EntityAttribute {
	private readonly velocity: Vector;

	constructor(velocity: Vector) {
		super();
		this.velocity = velocity;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		world.mobLayer.updateTile(tile.position.add(this.velocity), tile);
		return true;
	}
}

export class EntityDamageAttribute extends EntityAttribute {
	private readonly range: number;
	private readonly maxTargets: number;
	private readonly damage: number;
	private readonly friendly: boolean;

	constructor(range: number, maxTargets: number, damage: number, friendly: boolean) {
		super();
		console.assert(range > 0);
		console.assert(maxTargets > 0);
		console.assert(damage > 0);
		this.range = range;
		this.maxTargets = maxTargets;
		this.damage = damage;
		this.friendly = friendly;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let targets = EntitySpawnProjectileAttribute.findTargetsWithinRange(tile.position, this.range, !this.friendly, world);
		targets
			.filter((_, i) => i < this.maxTargets)
			.map(target => this.friendly ? target[1].getAttribute(EntityMobHealthAttribute) : target[1].getAttribute(EntityHealthAttribute))
			.forEach(healthAttribute => healthAttribute!.health -= this.damage);
		return targets.length > 0;
	}
}

export class EntityExpireProjectileAttribute extends EntityAttribute {
	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		world.mobLayer.removeTile(tile);
		return true;
	}
}
