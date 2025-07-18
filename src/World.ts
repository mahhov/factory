import {Container} from 'pixi.js';
import {Empty, Entity} from './Entity.js';
import util from './util.js';
import Vector from './Vector.js';

class WorldLayer {
	protected grid: Entity[][] = [];
	container = new Container();

	constructor(grid: Entity[][]) {
		this.grid = grid;
		this.grid.forEach((column, x) => column
			.forEach((entity, y) => {
				if (entity.container)
					this.addEntityContainer(new Vector(x, y), entity.container);
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

	getEntity(position: Vector): Entity | null {
		return position.atLeast(new Vector()) && position.lessThan(this.size) ?
			this.grid[position.x][position.y] :
			null;
	}

	clearAllEntities() {
		this.grid = WorldLayer.emptyGrid(this.grid.length, this.grid[0].length);
		this.container.removeChildren();
	}

	tick() {
		this.grid.forEach((column, x) => column.forEach((entity, y) =>
			entity.tick(this, new Vector(x, y))));
	}
}

class World {
	live: WorldLayer;
	queue: WorldLayer;

	constructor(grid: Entity[][], container: Container) {
		this.live = new WorldLayer(grid);
		container.addChild(this.live.container);
		this.queue = new WorldLayer(WorldLayer.emptyGrid(grid.length, grid[0].length));
		container.addChild(this.queue.container);
		this.queue.container.alpha = .3;
	}

	get width() {
		return this.live.width;
	}

	get height() {
		return this.live.height;
	}

	get size() {
		return this.live.size;
	}

	tick() {
		this.live.tick();
	}
}

export {WorldLayer, World};
