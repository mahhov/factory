import {Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import TooltipLine from '../ui/TooltipLine.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity, Projectile, ResourceDeposit} from './Entity.js';
import {Resource, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, World} from './World.js';

let getAdjacentDestinations = (origin: Vector, size: Vector, rotation: Rotation): Vector[] => {
	switch (rotation) {
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
		case Rotation.UP:
			size = new Vector(size.x, 1);
			break;
	}
	let shift = RotationUtils.positionShift(rotation);
	return origin.iterate(size).map(border => border.add(shift));
};

// export let getResourceCounts = (defaultCount: number, resourceNonDefault: Partial<Record<Resource, number>> = {}): Record<Resource, number> =>
// 	Object.fromEntries(util.enumKeys(Resource).map((resource: Resource) => {
// 		let count = resourceNonDefault[resource] ?? defaultCount;
// 		return [resource, count];
// 	})) as Record<Resource, number>;

export let getResourceCounts = (defaultCount: number, resourceNonDefault: Partial<Record<Resource, number>> = {}): ResourceUtils.Count[] =>
	util.enumKeys(Resource)
		.map((resource: Resource) => {
			let count = resourceNonDefault[resource] ?? defaultCount;
			return new ResourceUtils.Count(resource, count);
		})
		.filter(resourceCount => resourceCount.quantity);

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

	get tooltip(): TooltipLine[] {
		return [];
	}

	get selectable(): boolean {
		return false;
	}
}

// todo queue, build 1 at a time
// todo some graphical indicator for buildings queued, buildings in progress, buildings active
export class EntityBuildableAttribute extends EntityAttribute {
	private readonly counter: Counter;
	private readonly materialCost: ResourceUtils.Count[];
	private doneBuilding = false;

	constructor(duration: number, materialCost: ResourceUtils.Count[]) {
		super();
		this.counter = new Counter(duration);
		this.materialCost = materialCost;
	}

	// returns true if building. returns false if done building or insufficient material
	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.doneBuilding)
			return false;

		let lastRatio = this.counter.i / this.counter.n;
		let ratio = (this.counter.i + 1) / this.counter.n;
		let costs = this.materialCost.map(cost => new ResourceUtils.Count(
			cost.resource, Math.floor(cost.quantity * ratio) - Math.floor(cost.quantity * lastRatio)));

		if (!costs.every(cost => world.playerMaterials.hasQuantity(cost)))
			return false;

		costs.forEach(cost => world.playerMaterials.remove(cost));
		if (this.counter.tick())
			this.doneBuilding = true;
		return true;
	}

	get tooltip(): TooltipLine[] {
		if (this.doneBuilding) return [];
		let percent = Math.floor(this.counter.i / this.counter.n * 100);
		return this.doneBuilding ? [] : [new TooltipLine(`Building ${percent}%`)];
	}
}

export class EntityHealthAttribute extends EntityAttribute {
	private readonly maxHealth: number;
	health: number;

	constructor(health: number) {
		super();
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

	get tooltip(): TooltipLine[] {
		return [new TooltipLine(`Health: ${this.health} / ${this.maxHealth}`)];
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityContainerAttribute extends EntityAttribute {
	private readonly totalCapacity: number;
	private readonly resourceCapacities: ResourceUtils.Count[];
	private readonly inputRotations: Rotation[];
	private readonly quantities: Record<Resource, number>;
	private readonly orderedResourceAndRotations: [Resource, Rotation][] = [];

	constructor(totalCapacity: number,
	            resourceCapacities: ResourceUtils.Count[],
	            inputRotations: Rotation[] = util.enumKeys(Rotation)) {
		super();
		this.totalCapacity = totalCapacity;
		this.resourceCapacities = resourceCapacities;
		this.inputRotations = inputRotations;
		this.quantities = Object.fromEntries(util.enumKeys(Resource)
			.map(resource => [resource, 0])) as Record<Resource, number>;
	}

	private getResourceCapacity(resource: Resource): number {
		return this.resourceCapacities.find(capacity => capacity.resource === resource)?.quantity ?? 0;
	}

	get empty() {
		return !this.orderedResourceAndRotations.length;
	}

	get peek(): [Resource, Rotation] | undefined {
		return this.orderedResourceAndRotations.at(-1);
	}

	hasCapacity(resourceCount: ResourceUtils.Count): boolean {
		return this.orderedResourceAndRotations.length + resourceCount.quantity <= this.totalCapacity &&
			this.quantities[resourceCount.resource] + resourceCount.quantity <= this.getResourceCapacity(resourceCount.resource);
	}

	hasQuantity(resourceCount: ResourceUtils.Count): boolean {
		return this.quantities[resourceCount.resource] >= resourceCount.quantity;
	}

	add(resourceCount: ResourceUtils.Count, rotation: Rotation = Rotation.RIGHT) {
		this.quantities[resourceCount.resource] += resourceCount.quantity;
		util.arr(resourceCount.quantity).forEach(() =>
			this.orderedResourceAndRotations.push([resourceCount.resource, rotation]));
	}

	remove(resourceCount: ResourceUtils.Count) {
		this.quantities[resourceCount.resource] -= resourceCount.quantity;
		for (let i = 0; i < resourceCount.quantity; i++)
			this.orderedResourceAndRotations.splice(this.orderedResourceAndRotations.findLastIndex(resourceAndRotation => resourceAndRotation[0] === resourceCount.resource), 1);
	}

	acceptsRotation(rotation: Rotation): boolean {
		return this.inputRotations.includes(rotation);
	}

	get tooltip(): TooltipLine[] {
		let tooltipLines = (Object.entries(this.quantities))
			.filter(([resource, count]) => count)
			.map(([resourceString, count]) => {
				let resource = Number(resourceString);
				let prefix = `${ResourceUtils.string(resource)} ${count}`;
				let capacity = this.getResourceCapacity(resource);
				return new TooltipLine(capacity !== Infinity ? `${prefix} / ${capacity}` : `${prefix}`);
			});
		if (this.totalCapacity !== Infinity && this.orderedResourceAndRotations.length)
			tooltipLines.push(new TooltipLine(`${this.orderedResourceAndRotations.length} / ${this.totalCapacity}`));
		return tooltipLines;
	}

	get selectable() {
		return true;
	}
}

export class EntityTimedAttribute extends EntityAttribute {
	private readonly counter: Counter;

	constructor(duration: number) {
		super();
		this.counter = new Counter(duration);
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		return this.counter.tick();
	}
}

export class EntityConsumeAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly inputs: ResourceUtils.Count[];

	constructor(containerAttribute: EntityContainerAttribute, inputs: ResourceUtils.Count[]) {
		super();
		this.containerAttribute = containerAttribute;
		this.inputs = inputs;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.inputs.every(resourceCount => this.containerAttribute.hasQuantity(resourceCount))) {
			this.inputs.forEach(resourceCount => this.containerAttribute.remove(resourceCount));
			return true;
		}
		return false;
	}
}

export class EntityProduceAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly outputs: ResourceUtils.Count[];

	constructor(containerAttribute: EntityContainerAttribute, outputs: ResourceUtils.Count[]) {
		super();
		this.containerAttribute = containerAttribute;
		this.outputs = outputs;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.outputs.every(resourceCount => this.containerAttribute.hasCapacity(resourceCount))) {
			this.outputs.forEach(resourceCount => this.containerAttribute.add(resourceCount));
			return true;
		}
		return false;
	}
}

export class EntityHasAnyOfResourceAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly resourceCounts: ResourceUtils.Count[];

	constructor(containerAttribute: EntityContainerAttribute, resourceCounts: ResourceUtils.Count[]) {
		super();
		this.containerAttribute = containerAttribute;
		this.resourceCounts = resourceCounts;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		return this.resourceCounts.some(resourceCount => this.containerAttribute.hasQuantity(resourceCount));
	}
}

export class EntityTransportAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly outputRotations: Rotation[];

	constructor(containerAttribute: EntityContainerAttribute, outputRotations: Rotation[]) {
		super();
		this.containerAttribute = containerAttribute;
		this.outputRotations = outputRotations;
	}

	static move(containerAttribute: EntityContainerAttribute, outputRotations: Rotation[], resourceCounts: ResourceUtils.Count[], world: World, tile: Tile<Entity>): boolean {
		return util.shuffle(outputRotations).some(rotation =>
			util.shuffle(getAdjacentDestinations(tile.position, tile.tileable.size, rotation))
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute(EntityContainerAttribute))
				.some(destinationContainerAttribute =>
					util.shuffle(resourceCounts).some(resourceCount => {
						if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute.hasCapacity(resourceCount)) {
							containerAttribute.remove(resourceCount);
							destinationContainerAttribute.add(resourceCount, rotation);
							return true;
						}
						return false;
					})));
	}

	tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.containerAttribute.empty) return false;
		let [resource] = this.containerAttribute.peek!;
		return EntityTransportAttribute.move(this.containerAttribute, this.outputRotations, [new ResourceUtils.Count(resource, 1)], world, tile);
	}
}

export class EntityJunctionTransportAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(containerAttribute: EntityContainerAttribute) {
		super();
		this.containerAttribute = containerAttribute;
	}

	tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.containerAttribute.empty) return false;
		let [resource, rotation] = this.containerAttribute.peek!;
		return EntityTransportAttribute.move(this.containerAttribute, [rotation], [new ResourceUtils.Count(resource, 1)], world, tile);
	}
}

export class EntityOutflowAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly resourceCounts: ResourceUtils.Count[];

	constructor(containerAttribute: EntityContainerAttribute, resourceCounts: ResourceUtils.Count[]) {
		super();
		this.containerAttribute = containerAttribute;
		this.resourceCounts = resourceCounts;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		if (this.containerAttribute.empty) return false;
		let outputRotations: Rotation[] = util.enumKeys(Rotation);
		let resourceCounts = this.resourceCounts.filter(resourceCount => this.containerAttribute.hasQuantity(resourceCount));
		return EntityTransportAttribute.move(this.containerAttribute, outputRotations, resourceCounts, world, tile);
	}
}

export class EntityExtractorAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(containerAttribute: EntityContainerAttribute) {
		super();
		this.containerAttribute = containerAttribute;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		tile.position.iterate(tile.tileable.size).forEach(position => {
			let tile = world.terrain.getTile(position);
			if (tile?.tileable instanceof ResourceDeposit) {
				let resourceCount = new ResourceUtils.Count(tile.tileable.resource, 1);
				if (this.containerAttribute.hasCapacity(resourceCount))
					this.containerAttribute.add(resourceCount);
			}
		});
		return true;
	}
}

export class EntitySourceAttribute extends EntityAttribute {
	private readonly entityResourcePickerAttribute: EntityResourcePickerAttribute;

	constructor(entityResourcePickerAttribute: EntityResourcePickerAttribute) {
		super();
		this.entityResourcePickerAttribute = entityResourcePickerAttribute;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		let resourceCount = new ResourceUtils.Count(this.entityResourcePickerAttribute.resource, 1);
		util.enumKeys(Rotation).forEach(rotation =>
			getAdjacentDestinations(tile.position, tile.tileable.size, rotation)
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute(EntityContainerAttribute))
				.forEach(destinationContainerAttribute => {
					if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute.hasCapacity(resourceCount))
						destinationContainerAttribute.add(resourceCount);
				}));
		return true;
	}
}

export class EntityResourcePickerAttribute extends EntityAttribute {
	resource: Resource = 0;

	get tooltip(): TooltipLine[] {
		return util.enumKeys(Resource).map(resource => {
			let color = resource === this.resource ? Color.SELECTED_TEXT : undefined;
			return new TooltipLine(ResourceUtils.string(resource), () => this.resource = resource, undefined, color);
		});
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityResourceDisplayAttribute extends EntityAttribute {
	resource: Resource;

	constructor(resource: Resource) {
		super();
		this.resource = resource;
	}

	get tooltip(): TooltipLine[] {
		return [new TooltipLine(ResourceUtils.string(this.resource))];
	}

	get selectable(): boolean {
		return true;
	}
}

export class EntityResourceFullSpriteAttribute extends EntityAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly sprite: Sprite;
	private readonly spriteFull: (resource: Resource) => Sprite;

	constructor(containerAttribute: EntityContainerAttribute, sprite: Sprite, spriteFull: (resource: Resource) => Sprite) {
		super();
		this.containerAttribute = containerAttribute;
		this.sprite = sprite;
		this.spriteFull = spriteFull;
	}

	protected tickHelper(world: World, tile: Tile<Entity>): boolean {
		tile.tileable.sprite = this.containerAttribute.empty ? this.sprite : this.spriteFull(this.containerAttribute.peek![0]);
		return true;
	}
}

export class EntityMobHealthAttribute extends EntityAttribute {
	private readonly maxHealth: number;
	health: number;

	constructor(health: number) {
		super();
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
