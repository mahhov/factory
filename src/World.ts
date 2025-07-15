import {Container} from 'pixi.js';
import {Empty, Entity} from './Entity.js';
import util from './util.js';
import Vector from './Vector.js';

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

export default World;
