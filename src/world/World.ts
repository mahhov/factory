import {Container} from 'pixi.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity, ResourceDeposit} from './Entity.js';
import {Resource} from './Resource.js';
import randInt = util.randInt;

export interface Tileable {
	container: Container;

	get size(): Vector;

	tick(world: World, tile: Tile<Tileable>): void;
}

export class Tile<T extends Tileable> {
	tileable: T;
	position: Vector = new Vector();

	constructor(tileable: T) {
		this.tileable = tileable;
	}
}

export class WorldLayer<T extends Tileable> {
	private readonly defaultTileableCtr: { new(): T };
	private readonly showDefaultTileable: boolean;
	grid: Tile<T>[][] = [];
	readonly container = new Container();

	constructor(defaultTileableCtr: { new(): T }, showDefaultTileable: boolean, size: Vector) {
		this.defaultTileableCtr = defaultTileableCtr;
		this.showDefaultTileable = showDefaultTileable;
		this.clearAllEntities(size);
	}

	defaultGrid(size: Vector): Tile<T>[][] {
		return util.arr(size.x).map(_ => util.arr(size.y).map(_ => new Tile(new this.defaultTileableCtr())));
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

	replaceTileable(position: Vector, tileable: T) {
		if (!this.inBounds(position, tileable.size))
			return;

		let replaceTiles = position.iterate(tileable.size).map(p => this.getTile(p)!);
		replaceTiles.forEach(tile =>
			tile.position.iterate(tile.tileable.size)
				.forEach(emptyPosition => {
					let tile = this.getTile(emptyPosition)!;
					if (replaceTiles.includes(tile))
						this.container.removeChild(tile.tileable.container);
					else if (!(tile.tileable instanceof this.defaultTileableCtr)) {
						this.container.removeChild(tile.tileable.container);
						this.addTileable(emptyPosition, new this.defaultTileableCtr());
					}
				}));

		this.addTileable(position, tileable);
	}

	private addTileable(position: Vector, tileable: T) {
		position.iterate(tileable.size)
			.map(subPosition => this.getTile(subPosition)!)
			.forEach(tile => {
				tile.tileable = tileable;
				tile.position = position.copy;
			});

		if (!this.showDefaultTileable && tileable instanceof this.defaultTileableCtr) return;

		let sizeInv = this.size.invert();
		position = position.copy.scale(sizeInv);
		tileable.container.x = position.x;
		tileable.container.y = position.y;
		let size = sizeInv.copy.scale(tileable.size);
		tileable.container.width = size.x;
		tileable.container.height = size.y;
		this.container.addChild(tileable.container);
	}

	private inBounds(position: Vector, size: Vector) {
		return position.boundBy(new Vector(), this.size.subtract(size).add(new Vector(1)));
	}

	getTile(position: Vector): Tile<T> | null {
		return this.inBounds(position, new Vector(1)) ?
			this.grid[position.x][position.y] :
			null;
	}

	clearAllEntities(size: Vector = this.size) {
		this.grid = this.defaultGrid(size);
		this.container.removeChildren();
		// doesn't add default grid to `this.container`
	}
}

export class World {
	terrain: WorldLayer<Entity>;
	live: WorldLayer<Entity>;
	queue: WorldLayer<Entity>;

	constructor(size: Vector, container: Container) {
		this.terrain = new WorldLayer(Empty, false, size);
		container.addChild(this.terrain.container);
		this.live = new WorldLayer(Empty, false, size);
		container.addChild(this.live.container);
		this.queue = new WorldLayer(Empty, true, size);
		container.addChild(this.queue.container);
		this.queue.container.alpha = .5;

		for (let i = 0; i < 100; i++)
			this.terrain.replaceTileable(new Vector(randInt(0, this.width), randInt(0, this.height)), new ResourceDeposit(Resource.COPPER));
		for (let i = 0; i < 100; i++)
			this.terrain.replaceTileable(new Vector(randInt(0, this.width), randInt(0, this.height)), new ResourceDeposit(Resource.IRON));
		for (let i = 0; i < 100; i++)
			this.terrain.replaceTileable(new Vector(randInt(0, this.width), randInt(0, this.height)), new ResourceDeposit(Resource.CARBON));
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
		this.live.grid.forEach((column, x) => column.forEach((tile, y) => {
			let position = new Vector(x, y);
			if (tile.position.equals(position))
				tile.tileable.tick(this, tile);
		}));
	}
}
