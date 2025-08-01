import Color from '../graphics/Color.js';
import Counter from '../util/Counter.js';
import Resource from './Resource.js';
import Rotation from './Rotation.js';
import TooltipLine from '../ui/TooltipLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {WorldLayer} from './World.js';

// todo add attributes for:
//   buildable
//   health
//   rotation

// enum BuildingState {
// 	QUEUED, BUILDING, BUILT, DESTROYED
// }

export abstract class EntityAttribute {
	tick(worldLayer: WorldLayer, position: Vector) {}

	get tooltip(): TooltipLine[] {
		return [];
	}
}

export class EntityContainerAttribute extends EntityAttribute {
	// todo limit capacity per resource type
	private readonly capacity: number;
	private readonly counts: Record<Resource, number>;
	private readonly materials: Resource[] = [];
	private readonly inputRotations: Rotation[] = [];

	constructor(capacity: number, inputRotations: Rotation[]) {
		super();
		this.capacity = capacity;
		this.counts = Object.fromEntries(util.enumKeys(Resource)
			.map(resource => [resource, 0])) as Record<Resource, number>;
		this.inputRotations = inputRotations;
	}

	get empty() {return Object.values(this.counts).every(count => !count);}

	get peek(): Resource.Count {
		return new Resource.Count(this.materials[this.materials.length - 1], 1);
	}

	hasCapacity(resourceCount: Resource.Count): boolean {
		return this.counts[resourceCount.resource] + resourceCount.quantity <= this.capacity;
	}

	hasQuantity(resourceCount: Resource.Count): boolean {
		return this.counts[resourceCount.resource] >= resourceCount.quantity;
	}

	add(resourceCount: Resource.Count) {
		this.counts[resourceCount.resource]++;
		this.materials.push(resourceCount.resource);
	}

	remove(resourceCount: Resource.Count) {
		this.counts[resourceCount.resource] -= resourceCount.quantity;
		for (let i = 0; i < resourceCount.quantity; i++)
			this.materials.splice(this.materials.lastIndexOf(resourceCount.resource), 1);
	}

	pop(): Resource.Count {
		let resourceCount = this.peek;
		this.remove(resourceCount);
		return resourceCount;
	}

	acceptsRotation(rotation: Rotation) {
		return this.inputRotations.includes(rotation);
	}

	get tooltip(): TooltipLine[] {
		return Object.entries(this.counts)
			.filter(([resource, count]) => count)
			.map(([resource, count]) => new TooltipLine(`${Resource.string(resource as unknown as Resource)} ${count} / ${this.capacity}`));
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
				let destination = worldLayer.getEntity(position.copy.add(Rotation.positionShift(rotation)));
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

	protected abstract resourceCounts(): Resource.Count[];
}

export class EntityConveyorTransportAttribute extends EntityTransportAttribute {
	private readonly rotation: Rotation;

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, rotation: Rotation) {
		super(containerAttribute, counterDuration);
		this.rotation = rotation;
	}

	protected rotations(): Rotation[] {
		return [this.rotation];
	}

	protected resourceCounts(): Resource.Count[] {
		return this.containerAttribute.empty ? [] : [this.containerAttribute.peek];
	}
}

export class EntityFilteredTransportAttribute extends EntityTransportAttribute {
	private readonly outputs: Resource.Count[];

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, outputs: Resource.Count[]) {
		super(containerAttribute, counterDuration);
		this.outputs = outputs;
	}

	protected rotations(): Rotation[] {
		return util.shuffle(util.enumKeys(Rotation));
	}

	protected resourceCounts(): Resource.Count[] {
		return util.shuffle(this.outputs);
	}
}

export class EntitySourceAttribute extends EntityTimedAttribute {
	private readonly resource: Resource;

	constructor(counterDuration: number, resource: Resource) {
		super(counterDuration);
		this.resource = resource;
	}

	protected canProgress(worldLayer: WorldLayer, position: Vector): boolean {
		return true;
	}

	protected maybeComplete(worldLayer: WorldLayer, position: Vector): boolean {
		let resourceCount = new Resource.Count(this.resource, 1);
		util.enumKeys(Rotation).forEach(rotation => {
			let destination = worldLayer.getEntity(position.copy.add(Rotation.positionShift(rotation)));
			let destinationContainerAttribute = destination?.getAttribute(EntityContainerAttribute);
			if (destinationContainerAttribute?.acceptsRotation(rotation) && destinationContainerAttribute?.hasCapacity(resourceCount))
				destinationContainerAttribute.add(resourceCount);
		});
		return true;
	}
}

export class EntityProduceAttribute extends EntityTimedAttribute {
	private readonly containerAttribute: EntityContainerAttribute;
	private readonly inputs: Resource.Count[];
	private readonly outputs: Resource.Count[];

	constructor(containerAttribute: EntityContainerAttribute, counterDuration: number, inputs: Resource.Count[], outputs: Resource.Count[]) {
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

export class EntityResourcePickerAttribute extends EntityAttribute {
	private resource: Resource = Resource.COPPER;

	get tooltip(): TooltipLine[] {
		return util.enumKeys(Resource).map(resource => {
			let color = resource === this.resource ? Color.SELECTED_TEXT : undefined;
			return new TooltipLine(Resource.string(resource), undefined, color);
		});
	}
}
