import {Container, Particle, ParticleContainer, Sprite} from 'pixi.js';
import Painter from '../graphics/Painter.js';
import TextLine from '../ui/TextLine.js';
import {generateTerrain} from '../util/Noise.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity} from './Entity.js';
import {EntityBuildableAttribute, TooltipType} from './EntityAttribute.js';
import MobLogic from './MobLogic.js';
import PlayerLogic from './PlayerLogic.js';
import {Rotation} from './Rotation.js';

export interface Tileable {
	readonly name: string;
	readonly size: Vector;
	readonly container: Container | null;
	readonly particle: Particle | null;
}

export class SpriteHolder implements Tileable {
	private entity!: Entity;
	rotation!: Rotation;
	private sprite: Sprite | null = null;
	readonly container = new Container();
	readonly particle = null;

	setEntity(entity: Entity, rotation: Rotation) {
		if (this.entity?.name !== entity.name) {
			this.entity = entity;
			this.rotation = rotation;
			this.sprite = this.entity.container?.children[0] ? new Sprite((this.entity.container.children[0] as Sprite).texture) : null;
			if (this.sprite)
				Entity.rotateSprite(this.sprite, rotation);
			this.container.removeChildren();
			if (this.sprite)
				this.container.addChild(this.sprite);
		} else if (this.rotation !== rotation) {
			this.rotation = rotation;
			if (this.sprite)
				Entity.rotateSprite(this.sprite, rotation);
		}
		return this;
	}

	get name(): string {
		return this.entity.name;
	}

	get size(): Vector {
		return this.entity.size;
	}

	tooltip(type: TooltipType): TextLine[] {
		return this.entity.tooltip(type);
	}

	get selectable(): boolean {
		return this.entity.selectable;
	}
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

	protected addGraphics(tileable: Tileable, position: Vector, size: Vector) {
		this.updateGraphics(tileable, position, size);
		if (tileable.container)
			this.container.addChild(tileable.container);
	}

	protected updateGraphics(tileable: Tileable, position: Vector, size: Vector) {
		if (tileable.container) {
			tileable.container.position = position.multiply(this.size.invert);
			size = this.size.invert.multiply(size);
			tileable.container.width = size.x;
			tileable.container.height = size.y;
		}
	}

	protected removeGraphics(tileable: Tileable) {
		if (tileable.container)
			this.container.removeChild(tileable.container);
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

		if (tileable.name === this.defaultTileable.name) {
			let tile = this.getTileUnchecked(position);
			this.removeTile(tile);
			return;
		}

		let endPosition = position.add(tileable.size);
		for (let x = position.x; x < endPosition.x; x++) {
			for (let y = position.y; y < endPosition.y; y++) {
				let tile = this.getTileUnchecked(new Vector(x, y));
				this.removeTile(tile);
				tile.position = position;
				tile.tileable = tileable;
			}
		}

		this.addGraphics(tileable, position, tileable.size);
		this.addedTile(position);
	}

	private removeTile(tile: Tile<T>) {
		let originalPosition = tile.position;
		if (tile.tileable.name === this.defaultTileable.name) return;
		this.removeGraphics(tile.tileable);
		let endPosition = tile.position.add(tile.tileable.size);
		for (let xx = originalPosition.x; xx < endPosition.x; xx++) {
			for (let yy = originalPosition.y; yy < endPosition.y; yy++) {
				let position = new Vector(xx, yy);
				let tile = this.getTileUnchecked(position);
				tile.position = position;
				tile.tileable = this.defaultTileable;
			}
		}
		this.removedTile(originalPosition);
	}

	protected removedTile(position: Vector) {}

	protected addedTile(position: Vector) {}

	addTileableUnchecked(position: Vector, tileable: T) {
		// caller must make sure position is in bounds and empty
		let end = position.add(tileable.size);
		for (let x = position.x; x < end.x; x++)
			for (let y = position.y; y < end.y; y++) {
				let tile = this.getTileUnchecked(new Vector(x, y));
				tile.position = position;
				tile.tileable = tileable;
			}

		if (tileable.name !== this.defaultTileable.name)
			this.addGraphics(tileable, position, tileable.size);
	}

	inBounds(position: Vector, size: Vector) {
		return position.boundBy(Vector.V0, this.size.subtract(size).add(Vector.V1));
	}

	getTileUnchecked(position: Vector): Tile<T> {
		// caller must make sure position is in bounds
		return this.grid[position.x][position.y];
	}

	getTileBounded(position: Vector): Tile<T> | null {
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

export class LiveGridWorldLayer<T extends Tileable> extends GridWorldLayer<T> {
	readonly nonEmptyPositions: Set<Vector> = new Set();

	protected removedTile(position: Vector) {
		this.nonEmptyPositions.delete(position);
	}

	protected addedTile(position: Vector) {
		this.nonEmptyPositions.add(position);
	}
}

export class OrderedGridWorldLayer<T extends Tileable> extends GridWorldLayer<T> {
	order: Vector[] = [];

	protected removedTile(position: Vector) {
		let index = this.order.findIndex(orderedPosition => orderedPosition.equals(position));
		console.assert(index >= 0);
		this.order.splice(index, 1);
	}

	protected addedTile(position: Vector) {
		this.order.push(position);
	}

	removeOrdered(index: number) {
		this.replaceTileable(this.order[index], this.defaultTileable);
	}
}

export class FreeWorldLayerChunkOverlay<T extends Tileable, S> {
	private readonly chunkSize: number;
	readonly chunks: S[][][];
	private readonly mapper: (t: T) => S | null;

	constructor(size: Vector, chunkSize: number, mapper: (t: T) => S | null) {
		this.chunkSize = chunkSize;
		let chunkCounts = size.scale(1 / chunkSize).ceil;
		this.chunks = util.arr(chunkCounts.x).map(() => util.arr(chunkCounts.y).map(() => []));
		this.mapper = mapper;
	}

	chunkPosition(position: Vector): Vector {
		return position.scale(1 / this.chunkSize).floor;
	}

	private chunk(position: Vector) {
		let chunkPosition = this.chunkPosition(position);
		return this.chunks[chunkPosition.x][chunkPosition.y];
	}

	add(tile: Tile<T>) {
		let value = this.mapper(tile.tileable);
		if (!value) return;
		this.chunk(tile.position).push(value);
	}

	update(newPosition: Vector, tile: Tile<T>) {
		let value = this.mapper(tile.tileable);
		if (!value) return;
		let oldChunk = this.chunk(tile.position);
		let newChunk = this.chunk(newPosition);
		if (oldChunk !== newChunk) {
			oldChunk.splice(oldChunk.indexOf(value), 1);
			newChunk.push(value);
		}
	}

	remove(tile: Tile<T>) {
		let value = this.mapper(tile.tileable);
		if (!value) return;
		let chunk = this.chunk(tile.position);
		chunk.splice(chunk.indexOf(value), 1);
	}
}

export class FreeWorldLayer<T extends Tileable> extends WorldLayer {
	readonly tiles: Tile<T>[] = [];
	readonly container = new Container();
	readonly particleContainer: Record<string, ParticleContainer> = {};
	private readonly chunkOverlays: FreeWorldLayerChunkOverlay<T, any>[] = [];

	protected addGraphics(tileable: Tileable, position: Vector, size: Vector) {
		super.addGraphics(tileable, position, size);
		if (tileable.particle) {
			tileable.particle.scaleX *= this.size.invert.x;
			tileable.particle.scaleY *= this.size.invert.y;
			let key = tileable.particle.texture.uid;
			if (!this.particleContainer[key]) {
				this.particleContainer[key] = new ParticleContainer();
				this.container.addChild(this.particleContainer[key]);
			}
			this.particleContainer[key].addParticle(tileable.particle);
		}
	}

	protected updateGraphics(tileable: Tileable, position: Vector, size: Vector) {
		super.updateGraphics(tileable, position, size);
		if (tileable.particle) {
			position = position.multiply(this.size.invert);
			tileable.particle.x = position.x;
			tileable.particle.y = position.y;
		}
	}

	protected removeGraphics(tileable: Tileable) {
		super.removeGraphics(tileable);
		if (tileable.particle)
			this.particleContainer[tileable.particle.texture.uid].removeParticle(tileable.particle);
	}

	addTileable(position: Vector, tileable: T) {
		let tile = new Tile(position, tileable);
		this.tiles.push(tile);
		this.chunkOverlays.forEach(chunkOverlay => chunkOverlay.add(tile));
		this.addGraphics(tileable, position, tileable.size);
	}

	updateTile(position: Vector, tile: Tile<T>) {
		this.chunkOverlays.forEach(chunkOverlay => chunkOverlay.update(position, tile));
		tile.position = position;
		this.updateGraphics(tile.tileable, position, tile.tileable.size);
	}

	removeTile(tile: Tile<T>) {
		let index = this.tiles.indexOf(tile);
		if (index === -1) return;
		this.tiles.splice(index, 1);
		this.chunkOverlays.forEach(chunkOverlay => chunkOverlay.remove(tile));
		this.removeGraphics(tile.tileable);
	}

	addChunkOverlay<S>(chunkSize: number, mapper: (t: T) => S | null) {
		let chunkOverlay = new FreeWorldLayerChunkOverlay(this.size, chunkSize, mapper);
		this.chunkOverlays.push(chunkOverlay);
		return chunkOverlay;
	}
}

export class World {
	readonly size: Vector;
	readonly playerLogic;
	readonly terrain: GridWorldLayer<Entity>;
	readonly live: LiveGridWorldLayer<Entity>;
	readonly queue: OrderedGridWorldLayer<Entity>;
	readonly planning: GridWorldLayer<SpriteHolder>;
	readonly free: FreeWorldLayer<Entity>;
	readonly mobLogic;

	constructor(size: Vector, painter: Painter, cameraContainer: Container) {
		this.size = size;
		this.playerLogic = new PlayerLogic(painter);

		this.terrain = new GridWorldLayer(new Empty(), size);
		cameraContainer.addChild(this.terrain.container);
		generateTerrain(this.terrain);

		this.live = new LiveGridWorldLayer(new Empty(), size);
		cameraContainer.addChild(this.live.container);
		this.live.replaceTileable(size.scale(.5).floor, this.playerLogic.base);

		this.queue = new OrderedGridWorldLayer(new Empty(), size);
		cameraContainer.addChild(this.queue.container);
		this.queue.container.alpha = .4;

		this.planning = new GridWorldLayer(new SpriteHolder().setEntity(new Empty(), Rotation.UP), size);
		cameraContainer.addChild(this.planning.container);
		this.planning.container.alpha = .4;

		this.free = new FreeWorldLayer<Entity>(size);
		cameraContainer.addChild(this.free.container);

		this.mobLogic = new MobLogic(painter, this);
	}

	get width() {
		return this.size.x;
	}

	get height() {
		return this.size.y;
	}

	tick() {
		this.mobLogic.tick(this);
		this.playerLogic.tick();
		this.tickLive();
		this.tickQueue();
		this.tickMobLayer();
	}

	private tickLive() {
		this.live.nonEmptyPositions.forEach(position => {
			let tile = this.live.getTileUnchecked(position);
			if (tile.position.equals(position))
				tile.tileable.tick(this, tile);
		});
	}

	private tickQueue() {
		let i = 0;
		while (i < this.queue.order.length) {
			let position = this.queue.order[i];
			let liveTile = this.live.getTileUnchecked(position);
			let queueTile = this.queue.getTileUnchecked(position);
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
				liveTile.tileable.name !== queueTile.tileable.name && liveTile.tileable.size.equals(Vector.V1) && queueTile.tileable.size.equals(Vector.V1) ||
				position.iterate(queueTile.tileable.size).every(p => this.live.getTileUnchecked(p).tileable.name === this.live.defaultTileable.name);
			if (!allowed) {
				this.queue.removeOrdered(i);
				continue;
			}
			if (buildableAttribute.doneBuilding) {
				this.live.replaceTileable(position, queueTile.tileable);
				this.queue.removeOrdered(i);
				continue;
			}
			buildableAttribute.tick(this, queueTile);
			if (buildableAttribute.doneBuilding)
				break;
			i++;
		}
		// todo slower building if further from player base
		// todo cancel in-progress building if queued for removal
		// todo allow replacing queued buildings
		// todo recycle materials on destruction
	}

	private tickMobLayer() {
		this.free.tiles.forEach(tile => tile.tileable.tick(this, tile));
	}
}

