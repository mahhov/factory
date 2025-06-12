import {Container, Sprite} from 'pixi.js';
import spriteLoader from './spriteLoader.js';
import util from './util.js';

class Entity {
	graphic?: Sprite;

	constructor(graphic?: Sprite) {
		this.graphic = graphic;
	}
}

class Terrain extends Entity {
}

class Ground extends Terrain {
	constructor() {
		super(spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'sand.png'));
	}
}

class Wall extends Terrain {
}

class CopperDeposit extends Ground {
}

enum BuildingState {
	QUEUED, BUILDING, BUILT, DESTROYED
}

class Building extends Entity {
	state: BuildingState = BuildingState.QUEUED;
	stateProgress: number = 0;
	health: number;
	maxHealth: number;

	constructor(graphic: Sprite, maxHealth: number) {
		super(graphic);
		this.maxHealth = maxHealth;
		this.health = maxHealth;
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
				if (!cell.graphic) return;
				cell.graphic.x = x / grid.length;
				cell.graphic.y = y / grid[0].length;
				cell.graphic.width = 1 / grid.length;
				cell.graphic.height = 1 / grid[0].length;
				container.addChild(cell.graphic);
			}));
	}

	static randomGrid(width: number, height: number) {
		return util.arr(width).map(_ => util.arr(height).map(_ => {
			let clazz = util.randPick([[Terrain, .5], [Ground, .5]]);
			return new clazz();
		}));
	}
}

export default World;
