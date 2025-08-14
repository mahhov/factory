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

	get emptyEntity() {
		return this.entity instanceof Empty;
	}
}

export class WorldLayer {
	protected grid: Tile[][] = [];
	container = new Container();

	constructor(grid: Tile[][]) {
		this.grid = grid;
		this.grid.forEach((column, x) =>
			column.forEach((tile, y) =>
				this.addEntity(new Vector(x, y), tile.entity)));
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

	replaceEntity(position: Vector, entity: Entity) {
		if (!this.inBounds(position, entity.size))
			return;

		let replaceTiles = position.iterate(entity.size).map(p => this.getTile(p)!);
		replaceTiles.forEach(tile =>
			tile.position.iterate(tile.entity.size)
				.forEach(emptyPosition => {
					let tile = this.getTile(emptyPosition)!;
					if (replaceTiles.includes(tile))
						this.container.removeChild(tile.entity.container);
					else if (!tile.emptyEntity) {
						this.container.removeChild(tile.entity.container);
						this.addEntity(emptyPosition, new Empty());
					}
				}));

		this.addEntity(position, entity);
	}

	private addEntity(position: Vector, entity: Entity) {
		position.iterate(entity.size)
			.map(subPosition => this.getTile(subPosition)!)
			.forEach(tile => {
				tile.entity = entity;
				tile.position = position.copy;
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
		return position.boundBy(new Vector(), this.size.subtract(size).add(new Vector(1)));
	}

	getTile(position: Vector): Tile | null {
		return this.inBounds(position, new Vector(1)) ?
			this.grid[position.x][position.y] :
			null;
	}

	clearAllEntities() {
		// unlike `replaceEntity()`, this does not add the `Empty` sprites to `container`
		this.grid = WorldLayer.emptyGrid(this.width, this.height);
		this.container.removeChildren();
	}

	tick() {
		this.grid.forEach((column, x) => column.forEach((tile, y) => {
			let position = new Vector(x, y);
			if (tile.position.equals(position))
				tile.entity.tick(this, tile);
		}));
	}
}

export class World {
	live: WorldLayer;
	queue: WorldLayer;

	constructor(grid: Tile[][], container: Container) {
		this.live = new WorldLayer(grid);
		container.addChild(this.live.container);
		this.queue = new WorldLayer(WorldLayer.emptyGrid(this.width, this.height));
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
