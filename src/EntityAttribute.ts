import Counter from './Counter.js';
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

	constructor(capacity: number) {
		super();
		this.capacity = capacity;
		this.counts = Object.fromEntries(
			Object.values(ResourceType)
				.filter(value => typeof value === 'number')
				.map(resourceType => [resourceType, 0])) as Record<ResourceType, number>;
	}

	get empty() {return Object.values(this.counts).every(count => !count);}

	get peek(): ResourceCount {
		return new ResourceCount(this.materials[this.materials.length - 1], 1);
	}

	hasCapacity(resourceCount: ResourceCount): boolean {
		return this.counts[resourceCount.resourceType] + resourceCount.quantity <= this.capacity;
	}

	hasQuantity(resourceCount: ResourceCount): boolean {
		return this.counts[resourceCount.resourceType] > resourceCount.quantity;
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

	abstract canProgress(worldLayer: WorldLayer, position: Vector): boolean;

	abstract maybeComplete(worldLayer: WorldLayer, position: Vector): boolean;
}

class EntityTransportAttribute extends EntityTimedAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly rotation: Rotation;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, rotation: Rotation) {
		super(counterDuration);
		this.containerAttribute = containerAttribute;
		this.rotation = rotation;
	}

	canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return !this.containerAttribute.empty;
	}

	maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		let destination = worldLayer.getEntity(position.copy.add(rotationToPositionShift(this.rotation)));
		let destinationContainerAttribute = destination?.getAttribute(EntityContainerAttribute);
		if (destinationContainerAttribute?.hasCapacity(this.containerAttribute.peek)) {
			destinationContainerAttribute.add(this.containerAttribute.pop());
			return true;
		}
		return false;
	}
}

class EntitySourceAttribute extends EntityTimedAttribute {
	private readonly resourceType: ResourceType;

	constructor(counterDuration: number, resourceType: ResourceType) {
		super(counterDuration);
		this.resourceType = resourceType;
	}

	canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return true;
	}

	maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		let resourceCount = new ResourceCount(this.resourceType, 1);
		[Rotation.RIGHT, Rotation.DOWN, Rotation.LEFT, Rotation.UP]
			.map(rotationToPositionShift)
			.map(shift => position.copy.add(shift))
			.map(destinationPosition => worldLayer.getEntity(destinationPosition))
			.map(destination => destination?.getAttribute(EntityContainerAttribute))
			.filter(containerAttribute => containerAttribute?.hasCapacity(resourceCount))
			.forEach(containerAttribute => containerAttribute!.add(resourceCount));
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

	canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return this.inputs.every(resourceCount =>
			this.containerAttribute.hasQuantity(resourceCount));
	}

	maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		if (this.outputs.every(resourceCount =>
			this.containerAttribute.hasCapacity(resourceCount))) {
			this.inputs.forEach(resourceCount => this.containerAttribute.remove(resourceCount));
			this.outputs.forEach(resourceCount => this.containerAttribute.add(resourceCount));
			return true;
		}
		return false;
	}
}

export {Rotation, rotationToPositionShift, ResourceType, ResourceCount, EntityAttribute, EntityContainerAttribute, EntityTransportAttribute, EntitySourceAttribute, EntityProduceAttribute};
