import {Container} from 'pixi.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity, Mob, ResourceDeposit} from './Entity.js';
import {MobLogic} from './MobLogic.js';
import {Resource} from './Resource.js';

export interface Tileable {
	container: Container;

	get size(): Vector;

	tick(world: World, tile: Tile<Tileable>): void;
}

export class Tile<T extends Tileable> {
	tileable: T;
	position: Vector = Vector.V0;

	constructor(tileable: T) {
		this.tileable = tileable;
	}
}

class WorldLayer {
	readonly size: Vector;
	readonly container = new Container();

	constructor(size: Vector) {
		this.size = size;
	}

	get width() {
		return this.size.x;
	}

	get height() {
		return this.size.y;
	}

	protected addContainer(container: Container, position: Vector, size: Vector) {
		let sizeInv = this.size.invert();
		position = position.scale(sizeInv);
		container.x = position.x;
		container.y = position.y;
		size = sizeInv.scale(size);
		container.width = size.x;
		container.height = size.y;
		this.container.addChild(container);
	}
}

export class GridWorldLayer<T extends Tileable> extends WorldLayer {
	private readonly defaultTileableCtr: { new(): T };
	private readonly showDefaultTileable: boolean;
	grid: Tile<T>[][] = [];

	constructor(defaultTileableCtr: { new(): T }, showDefaultTileable: boolean, size: Vector) {
		super(size);
		this.defaultTileableCtr = defaultTileableCtr;
		this.showDefaultTileable = showDefaultTileable;
		this.clearAllEntities(size);
	}

	defaultGrid(size: Vector): Tile<T>[][] {
		return util.arr(size.x).map(_ => util.arr(size.y).map(_ => new Tile(new this.defaultTileableCtr())));
	}

	replaceTileable(position: Vector, tileable: T) {
		if (!this.inBounds(position, tileable.size)) return;

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
				tile.position = position;
			});

		if (this.showDefaultTileable || !(tileable instanceof this.defaultTileableCtr))
			this.addContainer(tileable.container, position, tileable.size);
	}

	inBounds(position: Vector, size: Vector) {
		return position.boundBy(Vector.V0, this.size.subtract(size).add(Vector.V1));
	}

	getTile(position: Vector): Tile<T> | null {
		return this.inBounds(position, Vector.V1) ?
			this.grid[position.x][position.y] :
			null;
	}

	clearAllEntities(size: Vector = this.size) {
		this.grid = this.defaultGrid(size);
		this.container.removeChildren();
		// doesn't add default grid to `this.container`
	}
}

export class FreeWorldLayer<T extends Tileable> extends WorldLayer {
	readonly tiles: Tile<T>[] = [];
	readonly container = new Container();

	addTileable(position: Vector, tileable: T) {
		let tile = new Tile(tileable);
		tile.position = position;
		this.tiles.push(tile);
		this.addContainer(tileable.container, position, tileable.size);
	}

	updateTile(position: Vector, tile: Tile<T>) {
		tile.position = position;
		this.addContainer(tile.tileable.container, position, tile.tileable.size);
	}
}

export class World {
	terrain: GridWorldLayer<Entity>;
	live: GridWorldLayer<Entity>;
	queue: GridWorldLayer<Entity>;
	mobLayer: FreeWorldLayer<Entity>;
	mobLogic = new MobLogic();

	constructor(size: Vector, container: Container) {
		this.terrain = new GridWorldLayer(Empty, false, size);
		container.addChild(this.terrain.container);
		this.live = new GridWorldLayer(Empty, false, size);
		container.addChild(this.live.container);
		this.queue = new GridWorldLayer(Empty, true, size);
		container.addChild(this.queue.container);
		this.queue.container.alpha = .5;
		this.mobLayer = new FreeWorldLayer<Entity>(size);
		container.addChild(this.mobLayer.container);

		for (let i = 0; i < 100; i++)
			this.terrain.replaceTileable(this.randPosition, new ResourceDeposit(Resource.COPPER));
		for (let i = 0; i < 100; i++)
			this.terrain.replaceTileable(this.randPosition, new ResourceDeposit(Resource.IRON));
		for (let i = 0; i < 100; i++)
			this.terrain.replaceTileable(this.randPosition, new ResourceDeposit(Resource.CARBON));
		for (let i = 0; i < 100; i++) {
			let position = this.randPosition;
			this.mobLayer.addTileable(position, new Mob(position));
		}
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

	get randPosition() {
		return new Vector(util.randInt(0, this.width), util.randInt(0, this.height));
	}

	tick() {
		this.mobLogic.tick(this);
		this.live.grid.forEach((column, x) => column.forEach((tile, y) => {
			let position = new Vector(x, y);
			if (tile.position.equals(position))
				tile.tileable.tick(this, tile);
		}));
		this.mobLayer.tiles.forEach(tile => tile.tileable.tick(this, tile));
	}
}
