import {Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import TooltipLine from '../ui/TooltipLine.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Entity, ResourceDeposit} from './Entity.js';
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
	tick(world: World, tile: Tile<Entity>) {}

	get tooltip(): TooltipLine[] {
		return [];
	}

	get selectable(): boolean {
		return false;
	}
}

export class EntityContainerAttribute extends EntityAttribute {
	private readonly totalCapacity: number;
	private readonly defaultResourceCapacity: number;
	private readonly resourceCapacity: Partial<Record<Resource, number>>;
	private readonly inputRotations: Rotation[];

	private readonly quantities: Record<Resource, number>;
	private readonly orderedResourceAndRotations: [Resource, Rotation][] = [];

	constructor(totalCapacity: number = Infinity,
	            defaultResourceCapacity: number = Infinity,
	            resourceCapacity: Partial<Record<Resource, number>> = {},
	            inputRotations: Rotation[] = util.enumKeys(Rotation)) {
		super();
		this.totalCapacity = totalCapacity;
		this.defaultResourceCapacity = defaultResourceCapacity;
		this.resourceCapacity = resourceCapacity;
		this.inputRotations = inputRotations;
		this.quantities = Object.fromEntries(util.enumKeys(Resource)
			.map(resource => [resource, 0])) as Record<Resource, number>;
	}

	private getResourceCapacity(resource: Resource): number {
		return this.resourceCapacity[resource] ?? this.defaultResourceCapacity;
	}

	get empty() {
		return !this.orderedResourceAndRotations.length;
	}

	get peek(): [Resource, Rotation] {
		return this.orderedResourceAndRotations[this.orderedResourceAndRotations.length - 1];
	}

	hasCapacity(resourceCount: ResourceUtils.Count): boolean {
		return this.orderedResourceAndRotations.length < this.totalCapacity &&
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
		let tooltipLines = (Object.entries(this.quantities) as unknown as [Resource, number][])
			.filter(([resource, count]) => count)
			.map(([resource, count]) => {
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

abstract class EntityTimedAttribute extends EntityAttribute {
	private readonly counter: Counter;

	protected constructor(counterDuration: number) {
		super();
		this.counter = new Counter(counterDuration);
	}

	tick(world: World, tile: Tile<Entity>) {
		super.tick(world, tile);
		if (!this.canProgress(world, tile))
			return;
		if (!this.counter.prepare())
			return;
		if (this.maybeComplete(world, tile))
			this.counter.reset();
	}

	protected abstract canProgress(world: World, tile: Tile<Entity>): boolean;

	protected abstract maybeComplete(world: World, tile: Tile<Entity>): boolean;
}

export class EntityTransportAttribute extends EntityTimedAttribute {
	protected readonly containerAttribute: EntityContainerAttribute;
	private readonly defaultResourceAllowed: boolean;
	private readonly resourcesNotDefault: Resource[];
	protected outputRotations: Rotation[];
	private readonly ordered: boolean;

	constructor(containerAttribute: EntityContainerAttribute,
	            counterDuration: number,
	            defaultResourceAllowed: boolean = true,
	            resourcesNotDefault: Resource[] = [],
	            outputRotations: Rotation[] = util.enumKeys(Rotation),
	            ordered: boolean = false) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
		this.defaultResourceAllowed = defaultResourceAllowed;
		this.resourcesNotDefault = resourcesNotDefault;
		this.outputRotations = outputRotations;
		this.ordered = ordered;
	}

	private get resourceCounts(): ResourceUtils.Count[] {
		return util.enumKeys(Resource)
			.filter(resource => this.resourcesNotDefault.includes(resource) !== this.defaultResourceAllowed)
			.map(resource => new ResourceUtils.Count(resource, 1));
	}

	protected canProgress(world: World, tile: Tile<Entity>): boolean {
		return this.resourceCounts.some(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	protected maybeComplete(world: World, tile: Tile<Entity>): boolean {
		let resourceCounts = this.resourceCounts.filter(resourceCount => this.containerAttribute.hasQuantity(resourceCount));
		if (this.ordered)
			resourceCounts = resourceCounts.filter(resourceCount => resourceCount.resource === this.containerAttribute.peek[0]);
		else
			resourceCounts = util.shuffle(resourceCounts);
		return util.shuffle(this.outputRotations).some(rotation =>
			util.shuffle(getAdjacentDestinations(tile.position, tile.tileable.size, rotation))
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute<EntityContainerAttribute>(EntityContainerAttribute))
				.some(destinationContainerAttribute =>
					resourceCounts.some(resourceCount => {
						if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute.hasCapacity(resourceCount)) {
							this.containerAttribute.remove(resourceCount);
							destinationContainerAttribute.add(resourceCount, rotation);
							return true;
						}
						return false;
					})));
	}
}

// todo replace with 4 EntityTransportAttribute
export class EntityJunctionTransportAttribute extends EntityTransportAttribute {
	constructor(containerAttribute: EntityContainerAttribute,
	            counterDuration: number,
	            defaultResourceAllowed: boolean = true,
	            resourcesNotDefault: Resource[] = []) {
		super(containerAttribute, counterDuration, defaultResourceAllowed, resourcesNotDefault, [], true);
	}

	protected maybeComplete(world: World, tile: Tile<Entity>): boolean {
		this.outputRotations = [this.containerAttribute.peek[1]];
		return super.maybeComplete(world, tile);
	}
}

export class EntityExtractorAttribute extends EntityTimedAttribute {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
	}

	protected canProgress(world: World, tile: Tile<Entity>): boolean {
		return true;
	}

	protected maybeComplete(world: World, tile: Tile<Entity>): boolean {
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

export class EntitySourceAttribute extends EntityTimedAttribute {
	private readonly entityResourcePickerAttribute: EntityResourcePickerAttribute;

	constructor(counterDuration: number, entityResourcePickerAttribute: EntityResourcePickerAttribute) {
		super(counterDuration);
		this.entityResourcePickerAttribute = entityResourcePickerAttribute;
	}

	protected canProgress(world: World, tile: Tile<Entity>): boolean {
		return true;
	}

	protected maybeComplete(world: World, tile: Tile<Entity>): boolean {
		let resourceCount = new ResourceUtils.Count(this.entityResourcePickerAttribute.resource, 1);
		util.enumKeys(Rotation).forEach(rotation =>
			getAdjacentDestinations(tile.position, tile.tileable.size, rotation)
				.map(destination => world.live.getTile(destination)?.tileable.getAttribute<EntityContainerAttribute>(EntityContainerAttribute))
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

	protected canProgress(world: World, tile: Tile<Entity>): boolean {
		return this.inputs.every(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	protected maybeComplete(world: World, tile: Tile<Entity>): boolean {
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

	tick(world: World, tile: Tile<Entity>) {
		tile.tileable.sprite = this.containerAttribute.empty ? this.sprite : this.spriteFull(this.containerAttribute.peek[0]);
	}
}

export class EntityMoveRightAttribute extends EntityTimedAttribute {
	position: Vector;

	constructor(counterDuration: number, position: Vector) {
		super(counterDuration);
		this.position = position;
	}

	protected canProgress(world: World, tile: Tile<Entity>): boolean {
		return true;
	}

	protected maybeComplete(world: World, tile: Tile<Entity>): boolean {
		this.position.add(new Vector(.1, 0));
		world.mobLayer.updateTile(this.position, tile);
		return true;
	}
}
