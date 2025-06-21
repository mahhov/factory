import {Container, Sprite} from 'pixi.js';
import spriteLoader from './spriteLoader.js';
import util from './util.js';
import Vector from './Vector.js';

enum Rotation { RIGHT, DOWN, LEFT, UP }

class Entity {
	static Rotation = Rotation;
	sprite?: Sprite;
	rotation: Rotation;

	constructor(sprite?: Sprite, rotation: Rotation = Rotation.RIGHT) {
		this.sprite = sprite;
		this.rotation = rotation;
		if (this.sprite) {
			this.sprite.anchor.set(.5);
			this.sprite.rotation = Entity.rotationToAngle(rotation);
		}
	}

	static rotationToAngle(rotation: Rotation) {
		return [...Array(4)].map((_, i) => i * Math.PI / 2)[rotation];
	}
}

class Empty extends Entity {
	constructor() {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'empty.png'));
	}
}

enum BuildingState {
	QUEUED, BUILDING, BUILT, DESTROYED
}

class Building extends Entity {
	stateProgress: number = 0;
	health: number;
	maxHealth: number;

	constructor(sprite: Sprite, rotation: Rotation, maxHealth: number) {
		super(sprite, rotation);
		this.maxHealth = maxHealth;
		this.health = maxHealth;
	}
}


class Wall extends Building {
	constructor(rotation: Rotation) {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'wall.png'), rotation, 10);
	}
}

class Conveyor extends Building {
	constructor(rotation: Rotation) {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor.png'), rotation, 10);
	}
}

class Source extends Building {
	constructor(rotation: Rotation) {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'source.png'), rotation, 10);
	}
}

class Void extends Building {
	constructor(rotation: Rotation) {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'void.png'), rotation, 10);
	}
}

class AnimatedConveyor extends Building {
	constructor(rotation: Rotation) {
		super(AnimatedConveyor.sprite, rotation, 10);
	}

	private static get sprite() {
		let animation = spriteLoader.animation(spriteLoader.Resource.CONVEYOR, 'move');
		animation.animationSpeed = .1;
		animation.play();
		return animation;
	}
}

class World {
	private grid: Entity[][] = [];
	private container: Container;

	constructor(grid: Entity[][], container: Container) {
		this.grid = grid;
		this.container = container;
		this.grid.forEach((column, x) => column
			.forEach((cell, y) => {
				if (cell.sprite)
					this.addSprite(new Vector(x, y), cell.sprite);
			}));
	}

	static emptyGrid(width: number, height: number) {
		return util.arr(width).map(_ => util.arr(height).map(_ => new Empty()));
	}

	get size() {
		return new Vector(this.width, this.height);
	}

	get width() {
		return this.grid.length;
	}

	get height() {
		return this.grid[0].length;
	}

	private addSprite(position: Vector, sprite: Sprite) {
		position = position.copy.add(new Vector(.5));
		sprite.x = position.x / this.grid.length;
		sprite.y = position.y / this.grid[0].length;
		sprite.width = 1 / this.grid.length;
		sprite.height = 1 / this.grid[0].length;
		this.container.addChild(sprite);
	}

	updateEntity(position: Vector, entity: Entity) {
		let old = this.grid[position.x][position.y];
		if (old.sprite)
			this.container.removeChild(old.sprite);
		this.grid[position.x][position.y] = entity;
		if (entity.sprite)
			this.addSprite(position, entity.sprite);
	}
}

type SimpleEntityCtor = (new () => Entity) | (new (rotation: Rotation) => Entity);

export {Entity, Empty, Building, Wall, Conveyor, Source, Void, World, SimpleEntityCtor};
