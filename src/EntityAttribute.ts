import Counter from './Counter.js';
import util from './util.js';
import Vector from './Vector.js';
import {WorldLayer} from './World.js';

// todo add attributes for:
//   buildable
//   health
//   rotation

// enum BuildingState {
// 	QUEUED, BUILDING, BUILT, DESTROYED
// }

// type Tick<R> = (worldLayer: WorldLayer, position: Vector) => R;

enum Rotation { RIGHT, DOWN, LEFT, UP }

let rotationToPositionShift = (rotation: Rotation) => {
	switch (rotation) {
		case Rotation.RIGHT:
			return new Vector(1, 0);
		case Rotation.DOWN:
			return new Vector(0, 1);
		case Rotation.LEFT:
			return new Vector(-1, 0);
		case Rotation.UP:
			return new Vector(0, -1);
	}
};

let oppositeRotation = (rotation: Rotation) => (rotation + 2) % 4;

enum ResourceType {
	COPPER, LEAD, SAND, GLASS
}

// type ResourceCount = [ResourceType, number];

class ResourceCount {
	readonly resourceType: ResourceType;
	readonly quantity: number;

	constructor(resourceType: ResourceType, quantity: number) {
		this.resourceType = resourceType;
		this.quantity = quantity;
	}

	static fromTuples(tuples: [ResourceType, number][]): ResourceCount[] {
		return tuples.map(tuple => new ResourceCount(...tuple));
	}
}

abstract class EntityAttribute {
	tick(worldLayer: WorldLayer, position: Vector) {}
}

class EntityContainerAttribute extends EntityAttribute {
	private readonly capacity: number;
	private readonly counts: Record<ResourceType, number>;
	private readonly materials: ResourceType[] = [];
	private readonly inputRotations: Rotation[] = [];

	constructor(capacity: number, inputRotations: Rotation[]) {
		super();
		this.capacity = capacity;
		this.counts = Object.fromEntries(util.enumKeys(ResourceType)
			.map(resourceType => [resourceType, 0])) as Record<ResourceType, number>;
		this.inputRotations = inputRotations;
	}

	get empty() {return Object.values(this.counts).every(count => !count);}

	get peek(): ResourceCount {
		return new ResourceCount(this.materials[this.materials.length - 1], 1);
	}

	hasCapacity(resourceCount: ResourceCount): boolean {
		return this.counts[resourceCount.resourceType] + resourceCount.quantity <= this.capacity;
	}

	hasQuantity(resourceCount: ResourceCount): boolean {
		return this.counts[resourceCount.resourceType] >= resourceCount.quantity;
	}

	add(resourceCount: ResourceCount) {
		this.counts[resourceCount.resourceType]++;
		this.materials.push(resourceCount.resourceType);
	}

	remove(resourceCount: ResourceCount) {
		this.counts[resourceCount.resourceType] -= resourceCount.quantity;
		for (let i = 0; i < resourceCount.quantity; i++)
			this.materials.splice(this.materials.lastIndexOf(resourceCount.resourceType), 1);
	}

	pop(): ResourceCount {
		let resourceCount = this.peek;
		this.remove(resourceCount);
		return resourceCount;
	}

	acceptsRotation(rotation: Rotation) {
		return this.inputRotations.includes(rotation);
	}
}

abstract class EntityTimedAttribute extends EntityAttribute {
	private readonly counter: Counter;

	protected constructor(counterDuration: number) {
		super();
		this.counter = new Counter(counterDuration);
	}

	tick(worldLayer: WorldLayer, position: Vector) {
		super.tick(worldLayer, position);
		if (!this.canProgress(worldLayer, position))
			return;
		if (!this.counter.prepare())
			return;
		if (this.maybeComplete(worldLayer, position))
			this.counter.reset();
	}

	protected abstract canProgress(worldLayer: WorldLayer, position: Vector): boolean;

	protected abstract maybeComplete(worldLayer: WorldLayer, position: Vector): boolean;
}

abstract class EntityTransportAttribute extends EntityTimedAttribute {
	protected readonly containerAttribute: EntityContainerAttribute;

	protected constructor(containerAttribute: EntityContainerAttribute, counterDuration: number) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
	}

	canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return this.resourceCounts().some(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	protected maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		let resourceCounts = this.resourceCounts().filter(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
		return this.rotations().some(rotation =>
			resourceCounts.some(resourceCount => {
				let destination = worldLayer.getEntity(position.copy.add(rotationToPositionShift(rotation)));
				let destinationContainerAttribute = destination?.getAttribute(EntityContainerAttribute);
				if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute?.hasCapacity(resourceCount)) {
					this.containerAttribute.remove(resourceCount);
					destinationContainerAttribute.add(resourceCount);
					return true;
				}
				return false;
			}));
	}

	protected abstract rotations(): Rotation[];

	protected abstract resourceCounts(): ResourceCount[];
}

class EntityConveyorTransportAttribute extends EntityTransportAttribute {
	private readonly rotation: Rotation;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, rotation: Rotation) {
		super(containerAttribute, counterDuration);
		this.rotation = rotation;
	}

	protected rotations(): Rotation[] {
		return [this.rotation];
	}

	protected resourceCounts(): ResourceCount[] {
		return this.containerAttribute.empty ? [] : [this.containerAttribute.peek];
	}
}

class EntityFilteredTransportAttribute extends EntityTransportAttribute {
	private readonly outputs: ResourceCount[];

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, outputs: ResourceCount[]) {
		super(containerAttribute, counterDuration);
		this.outputs = outputs;
	}

	protected rotations(): Rotation[] {
		return util.shuffle(util.enumKeys(Rotation));
	}

	protected resourceCounts(): ResourceCount[] {
		return util.shuffle(this.outputs);
	}
}

class EntitySourceAttribute extends EntityTimedAttribute {
	private readonly resourceType: ResourceType;

	constructor(counterDuration: number, resourceType: ResourceType) {
		super(counterDuration);
		this.resourceType = resourceType;
	}

	protected canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return true;
	}

	protected maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		let resourceCount = new ResourceCount(this.resourceType, 1);
		util.enumKeys(Rotation).forEach(rotation => {
			let destination = worldLayer.getEntity(position.copy.add(rotationToPositionShift(rotation)));
			let destinationContainerAttribute = destination?.getAttribute(EntityContainerAttribute);
			if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute?.hasCapacity(resourceCount))
				destinationContainerAttribute.add(resourceCount);
		});
		return true;
	}
}

class EntityProduceAttribute extends EntityTimedAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly inputs: ResourceCount[];
	private readonly outputs: ResourceCount[];

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, inputs: ResourceCount[], outputs: ResourceCount[]) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
		this.inputs = inputs;
		this.outputs = outputs;
	}

	protected canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return this.inputs.every(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	protected maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		if (this.outputs.every(resourceCount =>
			this.containerAttribute.hasCapacity(resourceCount))) {
			this.inputs.forEach(resourceCount => this.containerAttribute.remove(resourceCount));
			this.outputs.forEach(resourceCount => this.containerAttribute.add(resourceCount));
			return true;
		}
		return false;
	}
}

export {
	Rotation, rotationToPositionShift, oppositeRotation,
	ResourceType, ResourceCount,
	EntityAttribute,
	EntityContainerAttribute,
	EntityConveyorTransportAttribute, EntityFilteredTransportAttribute,
	EntitySourceAttribute, EntityProduceAttribute,
};
