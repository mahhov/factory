import {Container, Sprite} from 'pixi.js';
import spriteLoader from './spriteLoader.js';
import util from './util.js';

abstract class Entity {
	sprite?: Sprite;

	constructor(sprite?: Sprite) {
		this.sprite = sprite;
	}
}

class Empty extends Entity {
	constructor() {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'sand.png'));
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
	grid: Entity[][] = [];
	private container: Container;

	constructor(grid: Entity[][], container: Container) {
		this.grid = grid;
		this.container = container;
		this.grid.forEach((column, x) => column
			.forEach((cell, y) => {
				if (!cell.sprite) return;
				cell.sprite.x = x / grid.length;
				cell.sprite.y = y / grid[0].length;
				cell.sprite.width = 1 / grid.length;
				cell.sprite.height = 1 / grid[0].length;
				container.addChild(cell.sprite);
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
}

export default World;
