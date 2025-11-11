import {Container} from 'pixi.js';
import Painter from '../graphics/Painter.js';
import {generateTerrain} from '../util/Noise.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity} from './Entity.js';
import {EntityBuildableAttribute} from './EntityAttribute.js';
import {MobLogic} from './MobLogic.js';
import {PlayerLogic} from './PlayerLogic.js';

export interface Tileable {
	readonly container: Container;
	readonly size: Vector;

	tick(world: World, tile: Tile<Tileable>): void;
}

export class Tile<T extends Tileable> {
	position: Vector;
	tileable: T;

	constructor(position: Vector, tileable: T) {
		this.position = position;
		this.tileable = tileable;
	}

	equals(tile: Tile<T>) {
		return this.position.equals(tile.position) && this.tileable.constructor === tile.tileable.constructor;
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
	private readonly defaultTileable: T;
	private readonly showDefaultTileable: boolean;
	readonly grid: Tile<T>[][] = [];

	constructor(defaultTileable: T, showDefaultTileable: boolean, size: Vector) {
		super(size);
		this.defaultTileable = defaultTileable;
		this.showDefaultTileable = showDefaultTileable;
		this.grid = util.arr(size.x).map(x => util.arr(size.y).map(y => new Tile(new Vector(x, y), defaultTileable)));
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
					else if (tile.tileable.constructor !== this.defaultTileable.constructor) {
						this.container.removeChild(tile.tileable.container);
						this.addTileable(emptyPosition, this.defaultTileable);
					}
				}));

		this.addTileable(position, tileable);
	}

	protected addTileable(position: Vector, tileable: T) {
		position.iterate(tileable.size)
			.map(subPosition => this.getTile(subPosition)!)
			.forEach(tile => {
				tile.tileable = tileable;
				tile.position = position;
			});

		if (this.showDefaultTileable || tileable.constructor !== this.defaultTileable.constructor)
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

	clearAllEntities() {
		this.grid.forEach(column => column.forEach(tile => tile.tileable = this.defaultTileable));
		this.container.removeChildren();
		// doesn't add default grid to `this.container`
	}
}

class OrderedGridWorldLayer<T extends Tileable> extends GridWorldLayer<T> {
	order: Vector[] = [];

	protected addTileable(position: Vector, tileable: T) {
		super.addTileable(position, tileable);
		this.order = this.order.filter(p => !p.equals(position));
		this.order.push(position);
	}
}

class FreeWorldLayer<T extends Tileable> extends WorldLayer {
	readonly tiles: Tile<T>[] = [];
	readonly container = new Container();

	addTileable(position: Vector, tileable: T) {
		let tile = new Tile(position, tileable);
		tile.position = position;
		this.tiles.push(tile);
		this.addContainer(tileable.container, position, tileable.size);
	}

	updateTile(position: Vector, tile: Tile<T>) {
		tile.position = position;
		this.addContainer(tile.tileable.container, position, tile.tileable.size);
	}

	removeTile(tile: Tile<T>) {
		let index = this.tiles.indexOf(tile);
		if (index === -1) return;
		this.tiles.splice(index, 1);
		this.container.removeChild(tile.tileable.container);
	}
}

export class World {
	readonly mobLogic = new MobLogic();
	readonly playerLogic;
	readonly terrain: GridWorldLayer<Entity>;
	readonly live: GridWorldLayer<Entity>;
	readonly queue: OrderedGridWorldLayer<Entity>;
	readonly planning: GridWorldLayer<Entity>;
	readonly mobLayer: FreeWorldLayer<Entity>;

	constructor(size: Vector, painter: Painter, cameraContainer: Container) {
		this.playerLogic = new PlayerLogic(painter);

		this.terrain = new GridWorldLayer(new Empty(), false, size);
		cameraContainer.addChild(this.terrain.container);
		generateTerrain(this.terrain);

		this.live = new GridWorldLayer(new Empty(), false, size);
		cameraContainer.addChild(this.live.container);
		this.live.replaceTileable(new Vector(20), this.playerLogic.base);

		this.queue = new OrderedGridWorldLayer(new Empty(), true, size);
		cameraContainer.addChild(this.queue.container);
		this.queue.container.alpha = .4;

		this.planning = new GridWorldLayer(new Empty(), true, size);
		cameraContainer.addChild(this.planning.container);
		this.planning.container.alpha = .4;

		this.mobLayer = new FreeWorldLayer<Entity>(size);
		cameraContainer.addChild(this.mobLayer.container);
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
		this.playerLogic.tick();
		this.tickLive();
		this.tickQueue();
		this.tickMobLayer();
	}

	private tickLive() {
		this.live.grid.forEach((column, x) => column.forEach((tile, y) => {
			let position = new Vector(x, y);
			if (tile.position.equals(position))
				tile.tileable.tick(this, tile);
		}));
	}

	private tickQueue() {
		this.queue.order.some((position, i) => {
			let liveTile = this.live.getTile(position)!;
			let queueTile = this.queue.getTile(position)!;
			if (liveTile.equals(queueTile)) return false;
			let buildableAttribute = queueTile.tileable.getAttribute(EntityBuildableAttribute);
			if (!buildableAttribute || buildableAttribute.doneBuilding) {
				this.live.replaceTileable(position, queueTile.tileable);
				this.queue.order.splice(i, 1);
				// todo not properly cleaning queue.order
				// todo remove from queue.grid
				return true;
			} else {
				buildableAttribute.reset();
				return buildableAttribute.tick(this, queueTile);
			}
		});
		// todo slower building if further from player base
		// todo cancel in-progress building if queued for removal
		// todo allow replacing queued buildings
		// todo recycle materials on destruction
	}

	private tickMobLayer() {
		this.mobLayer.tiles.forEach(tile => tile.tileable.tick(this, tile));
	}
}
