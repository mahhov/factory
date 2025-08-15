import {Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import TooltipLine from '../ui/TooltipLine.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {ResourceDeposit} from './Entity.js';
import {Resource, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, World} from './World.js';

// todo add attributes for:
//   buildable
//   health
//   rotation

// enum BuildingState {
// 	QUEUED, BUILDING, BUILT, DESTROYED
// }

let getAdjacentDestinations = (origin: Vector, size: Vector, rotation: Rotation) => {
	origin = origin.copy;
	size = size.copy;
	switch (rotation) {
		case Rotation.RIGHT:
			origin.x += size.x - 1;
			size.x = 1;
			break;
		case Rotation.DOWN:
			origin.y += size.y - 1;
			size.y = 1;
			break;
		case Rotation.LEFT:
			size.x = 1;
			break;
		case Rotation.UP:
			size.y = 1;
			break;
	}
	let shift = RotationUtils.positionShift(rotation);
	return origin.iterate(size).map(border => border.add(shift));
};

export abstract class EntityAttribute {
	tick(world: World, tile: Tile) {}

	get tooltip(): TooltipLine[] {
		return [];
	}

	get selectable(): boolean {
		return false;
	}
}

export abstract class EntityContainerAttribute extends EntityAttribute {
	protected readonly counts: Record<Resource, number>;
	protected readonly materials: Resource[] = [];

	constructor() {
		super();
		this.counts = Object.fromEntries(util.enumKeys(Resource)
			.map(resource => [resource, 0])) as Record<Resource, number>;
	}

	get empty() {
		return Object.values(this.counts).every(count => !count);
	}

	get peek(): ResourceUtils.Count {
		return new ResourceUtils.Count(this.materials[this.materials.length - 1], 1);
	}

	abstract hasCapacity(resourceCount: ResourceUtils.Count): boolean;

	hasQuantity(resourceCount: ResourceUtils.Count): boolean {
		return this.counts[resourceCount.resource] >= resourceCount.quantity;
	}

	add(resourceCount: ResourceUtils.Count) {
		this.counts[resourceCount.resource] += resourceCount.quantity;
		util.arr(resourceCount.quantity).forEach(() =>
			this.materials.push(resourceCount.resource));
	}

	remove(resourceCount: ResourceUtils.Count) {
		this.counts[resourceCount.resource] -= resourceCount.quantity;
		for (let i = 0; i < resourceCount.quantity; i++)
			this.materials.splice(this.materials.lastIndexOf(resourceCount.resource), 1);
	}

	abstract acceptsRotation(rotation: Rotation): boolean;
}

// contains any resource with shared capacity, accepts some rotations, in order
export class EntityLineContainerAttribute extends EntityContainerAttribute {
	private readonly totalCapacity: number;
	private readonly inputRotations: Rotation[] = [];

	constructor(totalCapacity: number, inputRotations: Rotation[]) {
		super();
		this.totalCapacity = totalCapacity;
		this.inputRotations = inputRotations;
	}

	private get total() {
		return Object.values(this.counts).reduce((sum, count) => sum + count);
	}

	hasCapacity(resourceCount: ResourceUtils.Count): boolean {
		return this.total < this.totalCapacity;
	}

	acceptsRotation(rotation: Rotation): boolean {
		return this.inputRotations.includes(rotation);
	}

	get tooltip(): TooltipLine[] {
		return [
			...(Object.entries(this.counts) as unknown as [Resource, number][])
				.filter(([resource, count]) => count)
				.map(([resource, count]) => new TooltipLine(`${ResourceUtils.string(resource)} ${count}`)),
			new TooltipLine(`${this.total} / ${this.totalCapacity}`),
		];
	}

	get selectable() {
		return true;
	}
}

// contains some resources with individual capacities, accepts all rotations
export class EntityBoxContainerAttribute extends EntityContainerAttribute {
	private readonly capacity: Partial<Record<Resource, number>>;

	constructor(capacity: Partial<Record<Resource, number>>) {
		super();
		this.capacity = capacity;
	}

	hasCapacity(resourceCount: ResourceUtils.Count): boolean {
		return this.counts[resourceCount.resource] + resourceCount.quantity <= (this.capacity[resourceCount.resource] || 0);
	}

	acceptsRotation(rotation: Rotation): boolean {
		return true;
	}

	get tooltip(): TooltipLine[] {
		return (Object.entries(this.counts) as unknown as [Resource, number][])
			.filter(([resource, count]) => count)
			.map(([resource, count]) => new TooltipLine(`${ResourceUtils.string(resource)} ${count} / ${this.capacity[resource]}`));
	}

	get selectable() {
		return true;
	}
}

// contains all resources with individual capacities, accepts no rotations
export class EntityOutContainerAttribute extends EntityBoxContainerAttribute {
	constructor(individualCapacity: number) {
		super(Object.fromEntries(util.enumKeys(Resource).map(resource => [resource, individualCapacity])));
	}

	acceptsRotation(rotation: Rotation): boolean {
		return false;
	}
}

// contains all resources with no capacity limit, accepts all rotations
export class EntityVoidContainerAttribute extends EntityContainerAttribute {
	hasCapacity(resourceCount: ResourceUtils.Count): boolean {
		return true;
	}

	acceptsRotation(rotation: Rotation): boolean {
		return true;
	}
}

abstract class EntityTimedAttribute extends EntityAttribute {
	private readonly counter: Counter;

	protected constructor(counterDuration: number) {
		super();
		this.counter = new Counter(counterDuration);
	}

	tick(world: World, tile: Tile) {
		super.tick(world, tile);
		if (!this.canProgress(world, tile))
			return;
		if (!this.counter.prepare())
			return;
		if (this.maybeComplete(world, tile))
			this.counter.reset();
	}

	protected abstract canProgress(world: World, tile: Tile): boolean;

	protected abstract maybeComplete(world: World, tile: Tile): boolean;
}

abstract class EntityTransportAttribute extends EntityTimedAttribute {
	protected readonly containerAttribute: EntityContainerAttribute;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
	}

	canProgress(world: World, tile: Tile): boolean {
		return this.resourceCounts().some(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	protected maybeComplete(world: World, tile: Tile): boolean {
		let resourceCounts = this.resourceCounts().filter(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
		return this.rotations().some(rotation =>
			getAdjacentDestinations(tile.position, tile.entity.size, rotation)
				.map(destination => world.live.getTile(destination)?.entity.getAttribute<EntityContainerAttribute>(EntityContainerAttribute))
				.some(destinationContainerAttribute => resourceCounts.some(resourceCount => {
					if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute.hasCapacity(resourceCount)) {
						this.containerAttribute.remove(resourceCount);
						destinationContainerAttribute.add(resourceCount);
						return true;
					}
					return false;
				})));
	}

	protected abstract rotations(): Rotation[];

	protected abstract resourceCounts(): ResourceUtils.Count[];
}

// transport all resources in 1 direction, in order
export class EntityConveyorTransportAttribute extends EntityTransportAttribute {
	private readonly rotation: Rotation;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, rotation: Rotation) {
		super(containerAttribute, counterDuration);
		this.rotation = rotation;
	}

	protected rotations(): Rotation[] {
		return [this.rotation];
	}

	protected resourceCounts(): ResourceUtils.Count[] {
		return this.containerAttribute.empty ? [] : [this.containerAttribute.peek];
	}
}

// transport subset of resources in all directions
export class EntityFilteredTransportAttribute extends EntityTransportAttribute {
	private readonly outputs: ResourceUtils.Count[];

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, outputs: ResourceUtils.Count[]) {
		super(containerAttribute, counterDuration);
		this.outputs = outputs;
	}

	protected rotations(): Rotation[] {
		return util.shuffle(util.enumKeys(Rotation));
	}

	protected resourceCounts(): ResourceUtils.Count[] {
		return util.shuffle(this.outputs);
	}
}

// transport all resources in all directions
export class EntityUnfilteredTransportAttribute extends EntityTransportAttribute {
	protected rotations(): Rotation[] {
		return util.shuffle(util.enumKeys(Rotation));
	}

	protected resourceCounts(): ResourceUtils.Count[] {
		return util.shuffle(util.enumKeys(Resource).map(resource => new ResourceUtils.Count(resource, 1)));
	}
}

export class EntityExtractorAttribute extends EntityTimedAttribute {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
	}

	protected canProgress(world: World, tile: Tile): boolean {
		return true;
	}

	protected maybeComplete(world: World, tile: Tile): boolean {
		tile.position.iterate(tile.entity.size).forEach(position => {
			let tile = world.terrain.getTile(position);
			if (tile?.entity instanceof ResourceDeposit) {
				let resourceCount = new ResourceUtils.Count(tile.entity.resource, 1);
				if (this.containerAttribute.hasCapacity(resourceCount))
					this.containerAttribute.add(resourceCount);
			}
		});
		return true;
	}
}

export class EntitySourceAttribute extends EntityTimedAttribute {
	private readonly entityResourcePickerAttribute: EntityResourcePickerAttribute;

	constructor(counterDuration: number, entityResourcePickerAttribute: EntityResourcePickerAttribute) {
		super(counterDuration);
		this.entityResourcePickerAttribute = entityResourcePickerAttribute;
	}

	protected canProgress(world: World, tile: Tile): boolean {
		return true;
	}

	protected maybeComplete(world: World, tile: Tile): boolean {
		let resourceCount = new ResourceUtils.Count(this.entityResourcePickerAttribute.resource, 1);
		util.enumKeys(Rotation).forEach(rotation =>
			getAdjacentDestinations(tile.position, tile.entity.size, rotation)
				.map(destination => world.live.getTile(destination)?.entity.getAttribute<EntityContainerAttribute>(EntityContainerAttribute))
				.forEach(destinationContainerAttribute => {
					if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute.hasCapacity(resourceCount))
						destinationContainerAttribute.add(resourceCount);
				}));
		return true;
	}
}

export class EntityProduceAttribute extends EntityTimedAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly inputs: ResourceUtils.Count[];
	private readonly outputs: ResourceUtils.Count[];

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, inputs: ResourceUtils.Count[], outputs: ResourceUtils.Count[]) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
		this.inputs = inputs;
		this.outputs = outputs;
	}

	protected canProgress(world: World, tile: Tile): boolean {
		return this.inputs.every(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	protected maybeComplete(world: World, tile: Tile): boolean {
		if (this.outputs.every(resourceCount =>
			this.containerAttribute.hasCapacity(resourceCount))) {
			this.inputs.forEach(resourceCount => this.containerAttribute.remove(resourceCount));
			this.outputs.forEach(resourceCount => this.containerAttribute.add(resourceCount));
			return true;
		}
		return false;
	}
}

export class EntityResourcePickerAttribute extends EntityAttribute {
	resource: Resource = Resource.COPPER;

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

	tick(world: World, tile: Tile) {
		tile.entity.sprite = this.containerAttribute.empty ? this.sprite : this.spriteFull(this.containerAttribute.peek.resource);
	}
}
