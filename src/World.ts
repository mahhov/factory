import {Container, Sprite} from 'pixi.js';
import Counter from './Counter.js';
import spriteLoader from './spriteLoader.js';
import util from './util.js';
import Vector from './Vector.js';

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

abstract class Entity {
	static Rotation = Rotation;
	container = new Container();
	rotation: Rotation;

	protected constructor(rotation: Rotation = Rotation.RIGHT) {
		this.rotation = rotation;
		this.container.rotation = Entity.rotationToAngle(rotation);
	}

	static rotationToAngle(rotation: Rotation) {
		return [...Array(4)].map((_, i) => i * Math.PI / 2)[rotation];
	}

	set sprite(sprite: Sprite) {
		this.container.removeChildren();
		this.container.addChild(sprite);
		sprite.anchor.set(.5);
	}

	hasMaterialCapacity(): boolean {
		return false;
	}

	addMaterial() {}

	tick(world: World, position: Vector) {}
}

class Empty extends Entity {
	constructor() {
		super();
		this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'empty.png');
	}
}

enum BuildingState {
	QUEUED, BUILDING, BUILT, DESTROYED
}

class Building extends Entity {
	stateProgress: number = 0;
	health: number;
	maxHealth: number;

	constructor(rotation: Rotation, maxHealth: number) {
		super(rotation);
		this.maxHealth = maxHealth;
		this.health = maxHealth;
	}
}

class Wall extends Building {
	constructor(rotation: Rotation) {
		super(rotation, 10);
		this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'wall.png');
	}
}

class Conveyor extends Building {
	private readonly capacity = 1;
	private count = 0;
	private counter = new Counter(50);

	constructor(rotation: Rotation) {
		super(rotation, 10);
		this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor.png');
	}

	hasMaterialCapacity(): boolean {
		return this.count < this.capacity;
	}

	addMaterial() {
		this.count++;
		this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor-full.png');
	}

	tick(world: World, position: Vector) {
		let destination = position.copy.add(rotationToPositionShift(this.rotation));
		if (this.count) {
			if (this.counter.tick() && world.hasMaterialCapacity(destination)) {
				world.gridAt(destination)!.addMaterial();
				this.count--;
				if (!this.count)
					this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor.png');
			}
		}
	}
}

class Source extends Building {
	constructor(rotation: Rotation) {
		super(rotation, 10);
		this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'source.png');
	}

	tick(world: World, position: Vector) {
		[Rotation.RIGHT, Rotation.DOWN, Rotation.LEFT, Rotation.UP]
			.map(rotationToPositionShift)
			.map(shift => position.copy.add(shift))
			.filter(destination => world.hasMaterialCapacity(destination))
			.map(destination => world.gridAt(destination))
			.forEach(entity => entity!.addMaterial());
	}
}

class Void extends Building {
	constructor(rotation: Rotation) {
		super(rotation, 10);
		this.sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'void.png');
	}

	hasMaterialCapacity(): boolean {
		return true;
	}
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

class World {
	private readonly grid: Entity[][] = [];
	private container: Container;

	constructor(grid: Entity[][], container: Container) {
		this.grid = grid;
		this.container = container;
		this.grid.forEach((column, x) => column
			.forEach((cell, y) => {
				if (cell.container)
					this.addEntityContainer(new Vector(x, y), cell.container);
			}));
	}

	static emptyGrid(width: number, height: number) {
		return util.arr(width).map(_ => util.arr(height).map(_ => new Empty()));
	}

	get width() {
		return this.grid.length;
	}

	get height() {
		return this.grid[0].length;
	}

	get size() {
		return new Vector(this.width, this.height);
	}

	setEntity(position: Vector, entity: Entity) {
		let old = this.grid[position.x][position.y];
		this.container.removeChild(old.container);
		this.grid[position.x][position.y] = entity;
		this.addEntityContainer(position, entity.container);
	}

	private addEntityContainer(position: Vector, container: Container) {
		position = position.copy.add(new Vector(.5)).scale(this.size.invert());
		container.x = position.x;
		container.y = position.y;
		container.width = 1 / this.width;
		container.height = 1 / this.height;
		this.container.addChild(container);
	}

	gridAt(position: Vector): Entity | null {
		return position.atLeast(new Vector()) && position.lessThan(this.size) ?
			this.grid[position.x][position.y] :
			null;
	}

	tick() {
		this.grid.forEach((column, x) => column.forEach((cell, y) => cell.tick(this, new Vector(x, y))));
	}

	hasMaterialCapacity(position: Vector) {
		let entity = this.gridAt(position);
		return entity && entity.hasMaterialCapacity();
	}
}

type SimpleEntityCtor = (new () => Entity) | (new (rotation: Rotation) => Entity);

export {Entity, Empty, Building, Wall, Conveyor, Source, Void, World, SimpleEntityCtor};
