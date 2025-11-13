import {Container} from 'pixi.js';
import Painter from '../graphics/Painter.js';
import {generateTerrain} from '../util/Noise.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Clear, Empty, Entity} from './Entity.js';
import {EntityBuildableAttribute} from './EntityAttribute.js';
import {MobLogic} from './MobLogic.js';
import {PlayerLogic} from './PlayerLogic.js';
import {Rotation} from './Rotation.js';

export interface Tileable {
	readonly name: string;
	readonly container: Container;
	readonly size: Vector;
	readonly rotation: Rotation;

	tick(world: World, tile: Tile<Tileable>): void;
}

export class Tile<T extends Tileable> {
	position: Vector;
	tileable: T;

	constructor(position: Vector, tileable: T) {
		this.position = position;
		this.tileable = tileable;
	}
}

abstract class WorldLayer {
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
	readonly defaultTileable: T;
	readonly grid: Tile<T>[][] = [];

	constructor(defaultTileable: T, size: Vector) {
		super(size);
		this.defaultTileable = defaultTileable;
		this.grid = util.arr(size.x).map(x => util.arr(size.y).map(y => new Tile(new Vector(x, y), defaultTileable)));
	}

	replaceTileable(position: Vector, tileable: T) {
		if (!this.inBounds(position, tileable.size)) return;

		let replaceTiles = position.iterate(tileable.size).map(p => this.getTile(p)!);
		replaceTiles.forEach(replaceTile =>
			replaceTile.position.iterate(replaceTile.tileable.size)
				.forEach(emptyPosition => {
					let tile = this.getTile(emptyPosition)!;
					if (replaceTiles.includes(tile))
						this.container.removeChild(tile.tileable.container);
					else if (tile.tileable.name !== this.defaultTileable.name) {
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

		if (tileable.name !== this.defaultTileable.name)
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

export class OrderedGridWorldLayer<T extends Tileable> extends GridWorldLayer<T> {
	order: Vector[] = [];

	protected addTileable(position: Vector, tileable: T) {
		super.addTileable(position, tileable);
		this.order = this.order.filter(p => !p.equals(position));
		if (tileable !== this.defaultTileable)
			this.order.push(position);
	}

	removeOrdered(index: number) {
		this.replaceTileable(this.order[index], this.defaultTileable);
	}
}

export class FreeWorldLayer<T extends Tileable> extends WorldLayer {
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

		this.terrain = new GridWorldLayer(new Empty(), size);
		cameraContainer.addChild(this.terrain.container);
		generateTerrain(this.terrain);

		this.live = new GridWorldLayer(new Empty(), size);
		cameraContainer.addChild(this.live.container);
		this.live.replaceTileable(new Vector(20), this.playerLogic.base);

		this.queue = new OrderedGridWorldLayer(new Empty(), size);
		cameraContainer.addChild(this.queue.container);
		this.queue.container.alpha = .4;

		this.planning = new GridWorldLayer(new Empty(), size);
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
		let i = 0;
		while (i < this.queue.order.length) {
			let position = this.queue.order[i];
			let liveTile = this.live.getTile(position)!;
			let queueTile = this.queue.getTile(position)!;
			let buildableAttribute = queueTile.tileable.getAttribute(EntityBuildableAttribute);
			if (!buildableAttribute) {
				console.assert(queueTile.tileable.name === 'Clear');
				if (liveTile.tileable !== this.playerLogic.base)
					this.live.replaceTileable(position, this.live.defaultTileable);
				this.queue.removeOrdered(i);
				continue;
			}
			let allowed =
				liveTile.tileable.name === queueTile.tileable.name && liveTile.position.equals(queueTile.position) && liveTile.tileable.rotation !== queueTile.tileable.rotation ||
				position.iterate(queueTile.tileable.size).every(p => this.live.getTile(p)!.tileable.name === this.live.defaultTileable.name);
			if (!allowed) {
				this.queue.removeOrdered(i);
				continue;
			}
			if (buildableAttribute.doneBuilding) {
				this.live.replaceTileable(position, queueTile.tileable);
				this.queue.removeOrdered(i);
				continue;
			}
			buildableAttribute.reset();
			if (buildableAttribute.tick(this, queueTile))
				break;
			i++;
		}
		// todo slower building if further from player base
		// todo cancel in-progress building if queued for removal
		// todo allow replacing queued buildings
		// todo recycle materials on destruction
	}

	private tickMobLayer() {
		this.mobLayer.tiles.forEach(tile => tile.tileable.tick(this, tile));
	}
}

