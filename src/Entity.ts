import {Container, Sprite} from 'pixi.js';
import Counter from './Counter.js';
import spriteLoader from './spriteLoader.js';
import Vector from './Vector.js';
import {WorldLayer} from './World.js';

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

class Entity {
	static Rotation = Rotation;
	rotation: Rotation;
	container = new Container();

	constructor(rotation: Rotation = Rotation.RIGHT) {
		this.rotation = rotation;
		this.container.rotation = Entity.rotationToAngle(rotation);
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'empty.png');}

	set sprite(sprite: Sprite) {
		this.container.removeChildren();
		this.container.addChild(sprite);
		sprite.anchor.set(.5);
	}

	static rotationToAngle(rotation: Rotation) {
		return [...Array(4)].map((_, i) => i * Math.PI / 2)[rotation];
	}

	tick(worldLayer: WorldLayer, position: Vector) {}
}

class Empty extends Entity {
	constructor() {
		super();
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'empty.png');}
}

enum BuildingState {
	QUEUED, BUILDING, BUILT, DESTROYED
}

abstract class Building extends Entity {
	private stateProgress: number = 0;
	private health: number;
	private maxHealth: number;

	constructor(rotation: Rotation, maxHealth: number) {
		super(rotation);
		this.maxHealth = maxHealth;
		this.health = maxHealth;
	}
}

class Wall extends Building {
	constructor(rotation: Rotation) {
		super(rotation, 10);
		this.sprite = Wall.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'wall.png');}
}

enum ResourceType {
	COPPER, LEAD, SAND
}

abstract class Factory extends Building {
	private readonly capacity: number;
	private readonly counts: Record<ResourceType, number>;
	protected readonly counter: Counter;
	private readonly materials: ResourceType[] = [];

	protected constructor(rotation: Rotation, maxHealth: number, capacity: number, counterDuration: number) {
		super(rotation, maxHealth);
		this.capacity = capacity;
		this.counts = Object.fromEntries(
			Object.values(ResourceType)
				.filter(value => typeof value === 'number')
				.map(type => [type, 0])) as Record<ResourceType, number>;
		this.counter = new Counter(counterDuration);
	}

	get empty() {return Object.values(this.counts).every(count => !count);}

	hasMaterialCapacity(type: ResourceType): boolean {
		return this.counts[type] < this.capacity;
	}

	addMaterial(type: ResourceType) {
		this.counts[type]++;
		this.materials.push(type);
	}

	removeMaterial(type: ResourceType) {
		this.counts[type]--;
		let index = this.materials.lastIndexOf(type);
		this.materials.splice(index, 1);
	}

	get peekNextMaterial() {
		return this.materials[this.materials.length - 1];
	}

	popNextMaterial() {
		let type = this.peekNextMaterial;
		this.removeMaterial(type);
		return type;
	}
}

class Conveyor extends Factory {
	constructor(rotation: Rotation) {
		super(rotation, 10, 1, 50);
		this.sprite = Conveyor.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor.png');}

	static get spriteFull() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor-full.png');}

	addMaterial(type: ResourceType) {
		super.addMaterial(type);
		this.sprite = Conveyor.spriteFull;
	}

	removeMaterial(type: ResourceType) {
		super.removeMaterial(type);
		if (this.empty)
			this.sprite = Conveyor.sprite;
	}

	tick(worldLayer: WorldLayer, position: Vector) {
		if (this.empty)
			return;
		let destination = worldLayer.getEntity(position.copy.add(rotationToPositionShift(this.rotation)));
		this.counter.prepare();
		if (this.counter.isReady() && destination instanceof Factory && destination.hasMaterialCapacity(this.peekNextMaterial)) {
			this.counter.reset();
			destination.addMaterial(this.popNextMaterial());
		}
	}
}

class Source extends Factory {
	protected readonly type = ResourceType.COPPER;

	constructor(rotation: Rotation) {
		super(rotation, 10, 0, 200);
		this.sprite = Source.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'source.png');}

	tick(worldLayer: WorldLayer, position: Vector) {
		if (this.counter.tick())
			[Rotation.RIGHT, Rotation.DOWN, Rotation.LEFT, Rotation.UP]
				.map(rotationToPositionShift)
				.map(shift => position.copy.add(shift))
				.map(destinationPosition => worldLayer.getEntity(destinationPosition))
				.filter(destination => destination instanceof Factory && destination.hasMaterialCapacity(this.type))
				.forEach(destination => (destination as Factory).addMaterial(this.type));
	}
}

class Void extends Factory {
	constructor(rotation: Rotation) {
		super(rotation, 10, Infinity, 1);
		this.sprite = Void.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'void.png');}
}

// class AnimatedConveyor extends Building {
// 	constructor(rotation: Rotation) {
// 		super(AnimatedConveyor.sprite, rotation, 10);
// 	}
//
// 	private static get sprite() {
// 		let animation = spriteLoader.animation(spriteLoader.Resource.CONVEYOR, 'move');
// 		animation.animationSpeed = .1;
// 		animation.play();
// 		return animation;
// 	}
// }

type SimpleEntityCtor = (new () => Entity) | (new (rotation: Rotation) => Entity);

export {Entity, Empty, Building, Wall, Conveyor, Source, Void, SimpleEntityCtor, ResourceType};

// todo
//   larger entities
//   factories
