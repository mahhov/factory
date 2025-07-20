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
				.map(type => [type, 0])) as Record<ResourceType, number>;
	}

	get empty() {return Object.values(this.counts).every(count => !count);}

	get peekNextMaterial(): ResourceType {
		return this.materials[this.materials.length - 1];
	}

	hasMaterialCapacity(type: ResourceType): boolean {
		return this.counts[type] < this.capacity;
	}

	hasMaterialQuantity(type: ResourceType, quantity: number): boolean {
		return this.counts[type] > quantity;
	}

	addMaterial(type: ResourceType) {
		this.counts[type]++;
		this.materials.push(type);
	}

	removeMaterial(type: ResourceType): boolean {
		if (!this.counts[type])
			return false;
		this.counts[type]--;
		let index = this.materials.lastIndexOf(type);
		this.materials.splice(index, 1);
		return true;
	}

	popNextMaterial(): ResourceType {
		let type = this.peekNextMaterial;
		this.removeMaterial(type);
		return type;
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
		if (destinationContainerAttribute?.hasMaterialCapacity(this.containerAttribute.peekNextMaterial)) {
			destinationContainerAttribute.addMaterial(this.containerAttribute.popNextMaterial());
			return true;
		}
		return false;
	}
}

class EntitySourceAttribute extends EntityTimedAttribute {
	private readonly type: ResourceType;

	constructor(counterDuration: number, type: ResourceType) {
		super(counterDuration);
		this.type = type;
	}

	canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return true;
	}

	maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		[Rotation.RIGHT, Rotation.DOWN, Rotation.LEFT, Rotation.UP]
			.map(rotationToPositionShift)
			.map(shift => position.copy.add(shift))
			.map(destinationPosition => worldLayer.getEntity(destinationPosition))
			.map(destination => destination?.getAttribute(EntityContainerAttribute))
			.filter(containerAttribute => containerAttribute?.hasMaterialCapacity(this.type))
			.forEach(containerAttribute => containerAttribute!.addMaterial(this.type));
		return true;
	}
}

export {Rotation, rotationToPositionShift, ResourceType, EntityAttribute, EntityContainerAttribute, EntityTransportAttribute, EntitySourceAttribute};
