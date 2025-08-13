import {Container} from 'pixi.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity} from './Entity.js';

class Terrain {
}

export class Tile {
	terrain: Terrain = new Terrain();
	entity: Entity = new Empty();
	position: Vector = new Vector();
}

export class WorldLayer {
	protected grid: Tile[][] = [];
	container = new Container();

	constructor(grid: Tile[][]) {
		this.grid = grid;
		this.grid.forEach((column, x) =>
			column.forEach((tile, y) =>
				this.setEntity(new Vector(x, y), tile.entity)));
	}

	static emptyGrid(width: number, height: number) {
		return util.arr(width).map(_ => util.arr(height).map(_ => new Tile()));
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
		if (!this.inBounds(position, entity.size))
			return;

		position.iterate(entity.size).forEach(subPosition => {
			let oldTile = this.getTile(subPosition)!;
			this.container.removeChild(oldTile.entity.container);
			this.grid[subPosition.x][subPosition.y].entity = entity;
			this.grid[subPosition.x][subPosition.y].position = position;
		});

		let sizeInv = this.size.invert();
		position = position.copy.scale(sizeInv);
		entity.container.x = position.x;
		entity.container.y = position.y;
		let size = sizeInv.copy.scale(entity.size);
		entity.container.width = size.x;
		entity.container.height = size.y;
		this.container.addChild(entity.container);
	}

	private inBounds(position: Vector, size: Vector) {
		return position.atLeast(new Vector()) && position.lessThan(this.size.subtract(size).add(new Vector(1)));
	}

	getTile(position: Vector): Tile | null {
		return this.inBounds(position, new Vector(1)) ?
			this.grid[position.x][position.y] :
			null;
	}

	clearAllEntities() {
		this.grid = WorldLayer.emptyGrid(this.grid.length, this.grid[0].length);
		this.container.removeChildren();
	}

	tick() {
		this.grid.forEach((column, x) => column.forEach((entity, y) =>
			entity.entity.tick(this, new Vector(x, y))));
	}
}

export class World {
	live: WorldLayer;
	queue: WorldLayer;

	constructor(grid: Tile[][], container: Container) {
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
