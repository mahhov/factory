import {Container, Particle, ParticleContainer, Sprite} from 'pixi.js';
import Painter from '../graphics/Painter.js';
import TextLine from '../ui/TextLine.js';
import {generateTerrain} from '../util/generateTerrain.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Empty, Entity} from './Entity.js';
import {EntityBuildableAttribute, EntityMobHerdPositionAttribute, TickResult, TooltipType} from './EntityAttribute.js';
import MobLogic from './MobLogic.js';
import PlayerLogic from './PlayerLogic.js';
import {Rotation} from './Rotation.js';

export enum ParticleType {
	DEFAULT = 'DEFAULT',
	ROTATE = 'ROTATE',
	ON_TOP = 'ON_TOP',
}

export class ParticleWrapper {
	readonly particle: Particle;
	readonly type: ParticleType;
	readonly position: Vector;

	constructor(particle: Particle, type: ParticleType, position: Vector) {
		this.particle = particle;
		this.type = type;
		this.position = position;
	}
}

export interface Tileable {
	readonly name: string;
	readonly size: Vector;
	readonly container: Container | null;
	readonly particleWrappers: ParticleWrapper[];
}

export class SpriteHolder implements Tileable {
	private entity!: Entity;
	rotation!: Rotation;
	readonly container = new Container();
	particleWrappers: ParticleWrapper[] = [];

	setEntity(entity: Entity, rotation: Rotation) {
		if (this.entity?.name !== entity.name) {
			this.entity = entity;
			this.rotation = rotation;
			this.container.removeChildren();
			this.entity.container?.children.forEach(sprite => {
				let spriteCopy = new Sprite((sprite as Sprite).texture);
				Entity.rotateSprite(spriteCopy, rotation);
				this.container.addChild(spriteCopy);
			});
			this.particleWrappers = entity.particleWrappers.map(particleWrapper => new ParticleWrapper(new Particle(particleWrapper.particle), particleWrapper.type, particleWrapper.position));
		} else if (this.rotation !== rotation) {
			this.rotation = rotation;
			this.container.children.forEach(sprite => Entity.rotateSprite(sprite as Sprite, rotation));
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

	get tooltipRange(): number {
		return this.entity.tooltipRange;
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
	readonly spriteContainer = new Container();
	protected readonly particleContainers: Record<string, ParticleContainer> = {};

	constructor(size: Vector) {
		this.size = size;
		this.container.addChild(this.spriteContainer);
	}

	addGraphics(tileable: Tileable, position: Vector, size: Vector) {
		if (tileable.container) {
			tileable.container.position = position;
			tileable.container.width = size.x;
			tileable.container.height = size.y;
			this.spriteContainer.addChild(tileable.container);
		}
		tileable.particleWrappers.forEach(particleWrapper => this.addGraphicsParticle(particleWrapper, position));
	}

	addGraphicsParticle(particleWrapper: ParticleWrapper, position: Vector) {
		let key = particleWrapper.particle.texture.uid;

		if (!this.particleContainers[key]) {
			this.particleContainers[key] = new ParticleContainer({dynamicProperties: {rotation: particleWrapper.type === ParticleType.ROTATE}});
			if (particleWrapper.type === ParticleType.ON_TOP)
				this.container.addChild(this.particleContainers[key]);
			else
				this.container.addChildAt(this.particleContainers[key], 1);
		}

		position = position.add(particleWrapper.position);
		particleWrapper.particle.x = position.x;
		particleWrapper.particle.y = position.y;
		this.particleContainers[key].addParticle(particleWrapper.particle);
	}

	protected removeGraphics(tileable: Tileable) {
		if (tileable.container)
			this.spriteContainer.removeChild(tileable.container);
		tileable.particleWrappers.forEach(particleWrapper => this.removeGraphicsParticle(particleWrapper.particle));
	}

	removeGraphicsParticle(particle: Particle) {
		let key = particle.texture.uid;
		this.particleContainers[key].removeParticle(particle);
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
		this.spriteContainer.removeChildren();
		Object.values(this.particleContainers).forEach(particleContainer => particleContainer.removeParticles());
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
	private readonly size: Vector;
	private readonly chunkSize: number;
	readonly chunks: [Tile<T>, S][][][];
	private readonly mapper: (t: T) => S | undefined;

	constructor(size: Vector, chunkSize: number, mapper: (t: T) => S | undefined) {
		this.size = size;
		this.chunkSize = chunkSize;
		let chunkCounts = size.scale(1 / chunkSize).ceil;
		this.chunks = util.arr(chunkCounts.x).map(() => util.arr(chunkCounts.y).map(() => []));
		this.mapper = mapper;
	}

	chunkPosition(position: Vector): Vector {
		return position.scale(1 / this.chunkSize).floor;
	}

	chunkRange(start: Vector, end: Vector): [Tile<T>, S][][] {
		// start & end are inclusive
		let chunkStart = this.chunkPosition(start.max(Vector.V0));
		let chunkEnd = this.chunkPosition(end.min(this.size.subtract(Vector.V1)));
		let chunks = [];
		for (let chunkX = chunkStart.x; chunkX <= chunkEnd.x; chunkX++)
			for (let chunkY = chunkStart.y; chunkY <= chunkEnd.y; chunkY++)
				chunks.push(this.chunks[chunkX][chunkY]);
		return chunks;
	}

	private chunk(position: Vector) {
		let chunkPosition = this.chunkPosition(position);
		return this.chunks[chunkPosition.x][chunkPosition.y];
	}

	add(tile: Tile<T>) {
		let value = this.mapper(tile.tileable);
		if (!value) return;
		this.chunk(tile.position).push([tile, value]);
	}

	update(newPosition: Vector, tile: Tile<T>) {
		let oldChunk = this.chunk(tile.position);
		let newChunk = this.chunk(newPosition);
		if (oldChunk === newChunk) return;

		let value = this.mapper(tile.tileable);
		if (!value) return;

		let oldIndex = oldChunk.findIndex(([t]) => t === tile);
		console.assert(oldIndex !== -1);
		let entry = oldChunk.splice(oldIndex, 1);
		newChunk.push(entry[0]);
	}

	remove(tile: Tile<T>) {
		let value = this.mapper(tile.tileable);
		if (!value) return;

		let oldChunk = this.chunk(tile.position);
		let oldIndex = oldChunk.findIndex(([t]) => t === tile);
		console.assert(oldIndex !== -1);
		oldChunk.splice(oldIndex, 1);
	}
}

export class FreeWorldLayer<T extends Tileable> extends WorldLayer {
	readonly tiles: Tile<T>[] = [];
	readonly container = new Container();
	private readonly chunkOverlays: FreeWorldLayerChunkOverlay<T, any>[] = [];

	addTileable(position: Vector, tileable: T) {
		let tile = new Tile(position, tileable);
		this.tiles.push(tile);
		this.chunkOverlays.forEach(chunkOverlay => chunkOverlay.add(tile));
		this.addGraphics(tileable, position, tileable.size);
	}

	updateTile(position: Vector, tile: Tile<T>) {
		this.chunkOverlays.forEach(chunkOverlay => chunkOverlay.update(position, tile));
		tile.position = position;
		tile.tileable.particleWrappers.forEach(particleWrapper => {
			position = position.subtract(tile.tileable.size.scale(.5));
			particleWrapper.particle.x = position.x;
			particleWrapper.particle.y = position.y;
		});
	}

	removeTile(tile: Tile<T>) {
		let index = this.tiles.indexOf(tile);
		if (index === -1) return;
		this.tiles.splice(index, 1);
		this.chunkOverlays.forEach(chunkOverlay => chunkOverlay.remove(tile));
		this.removeGraphics(tile.tileable);
	}

	inBounds(position: Vector, size: Vector) {
		let halfSize = size.scale(.5);
		return position.boundBy(halfSize, this.size.subtract(halfSize));
	}

	addChunkOverlay<S>(chunkSize: number, mapper: (t: T) => S | undefined) {
		let chunkOverlay = new FreeWorldLayerChunkOverlay(this.size, chunkSize, mapper);
		this.chunkOverlays.push(chunkOverlay);
		return chunkOverlay;
	}
}

export class World {
	readonly size: Vector;
	readonly playerLogic;
	readonly mobLogic;
	readonly terrain: GridWorldLayer<Entity>;
	readonly live: LiveGridWorldLayer<Entity>;
	readonly queue: OrderedGridWorldLayer<Entity>;
	readonly planning: GridWorldLayer<SpriteHolder>;
	readonly free: FreeWorldLayer<Entity>;
	readonly freeMobHerdPositionAttributeOverlay: FreeWorldLayerChunkOverlay<Entity, EntityMobHerdPositionAttribute>;
	private paused = false;
	readonly container = new Container();

	constructor(size: Vector, painter: Painter) {
		this.size = size;
		this.container.scale = size.invert;
		this.playerLogic = new PlayerLogic(painter);
		this.mobLogic = new MobLogic(painter, this);

		this.terrain = new GridWorldLayer(new Empty(), size);
		this.container.addChild(this.terrain.container);
		generateTerrain(this.terrain);

		this.live = new LiveGridWorldLayer(new Empty(), size);
		this.container.addChild(this.live.container);
		this.live.replaceTileable(size.scale(.5).floor, this.playerLogic.base);

		this.queue = new OrderedGridWorldLayer(new Empty(), size);
		this.container.addChild(this.queue.container);
		this.queue.container.alpha = .4;

		this.planning = new GridWorldLayer(new SpriteHolder().setEntity(new Empty(), Rotation.UP), size);
		this.container.addChild(this.planning.container);
		this.planning.container.alpha = .4;

		this.free = new FreeWorldLayer<Entity>(size);
		this.container.addChild(this.free.container);
		this.freeMobHerdPositionAttributeOverlay = this.free.addChunkOverlay(6, entity => entity.getAttribute(EntityMobHerdPositionAttribute));
	}

	get width() {
		return this.size.x;
	}

	get height() {
		return this.size.y;
	}

	pause() {
		this.paused = !this.paused;
	}

	tick() {
		if (this.paused) return;
		this.playerLogic.tick();
		this.mobLogic.tick(this);
		this.tickLive();
		this.tickQueue();
		this.tickFree();
	}

	private tickLive() {
		this.live.nonEmptyPositions.forEach(position => {
			let tile = this.live.getTileUnchecked(position);
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
			buildableAttribute.tick(this, queueTile);
			if (buildableAttribute.doneBuilding) {
				this.live.replaceTileable(position, queueTile.tileable);
				this.queue.removeOrdered(i);
			}
			if (buildableAttribute.tickResult === TickResult.END_TICK) {
				buildableAttribute.tickResult = TickResult.NOT_DONE;
				break;
			}
			i++;
		}
		// todo slower building if further from player base
		// todo cancel in-progress building if queued for removal
		// todo recycle materials on destruction
	}

	private tickFree() {
		this.free.tiles.forEach(tile => tile.tileable.tick(this, tile));
	}
}

// todo building animation
// todo fix bug with placer rotation
// todo some blocks not taking damage
