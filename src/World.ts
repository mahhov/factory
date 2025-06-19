import {Container, Sprite} from 'pixi.js';
import spriteLoader from './spriteLoader.js';
import util from './util.js';
import Vector from './Vector.js';

abstract class Entity {
	sprite?: Sprite;

	constructor(sprite?: Sprite) {
		this.sprite = sprite;
	}
}

class Empty extends Entity {
	constructor() {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'ground.png'));
	}
}

class Wall extends Entity {
	constructor() {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'wall.png'));
	}
}

enum BuildingState {
	QUEUED, BUILDING, BUILT, DESTROYED
}

class Building extends Entity {
	state: BuildingState = BuildingState.QUEUED;
	stateProgress: number = 0;
	health: number;
	maxHealth: number;

	constructor(sprite: Sprite, maxHealth: number) {
		super(sprite);
		this.maxHealth = maxHealth;
		this.health = maxHealth;
	}
}

class ConveyorBelt extends Building {
	constructor() {
		super(ConveyorBelt.sprite, 10);
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

	static randomGrid(width: number, height: number) {
		return util.arr(width).map(_ => util.arr(height).map(_ => {
			let clazz = util.randPick([[Empty, .5], [ConveyorBelt, .01]]);
			return new clazz();
		}));
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

export {Empty, Wall, World};
