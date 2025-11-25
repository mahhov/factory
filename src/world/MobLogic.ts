import Painter from '../graphics/Painter.js';
import EntityCreator, {MobType} from '../ui/EntityCreator.js';
import MultilineText, {Anchor} from '../ui/MultilineText.js';
import TextLine from '../ui/TextLine.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Entity} from './Entity.js';
import {EntityMobHerdPositionAttribute} from './EntityAttribute.js';
import {FreeWorldLayer, FreeWorldLayerChunkOverlay, World} from './World.js';

export default class MobLogic {
	private herdManager;
	private spawner = new Spawner();
	private readonly multilineText: MultilineText;

	constructor(painter: Painter, world: World) {
		this.herdManager = new HerdManager(world.size);
		this.multilineText = new MultilineText(painter, new Vector(.5, .005), [], Anchor.TOP_CENTER);
	}

	sendWave() {
		this.spawner.sendWave();
	}

	tick(world: World) {
		this.spawner.tick(world.free);
		this.multilineText.lines = this.spawner.textLines();
		this.multilineText.tick();
		this.herdManager.tick(world.freeMobHerdPositionAttributeOverlay);
	}
}

class SpawnerStage {
	readonly sleep: number;
	readonly clusterCount: number;
	readonly mobsPerCluster: number;
	readonly clusterRadius: number;

	constructor(sleep: number, clusterCount: number, mobsPerCluster: number, clusterRadius: number) {
		this.sleep = sleep;
		this.clusterCount = clusterCount;
		this.mobsPerCluster = mobsPerCluster;
		this.clusterRadius = clusterRadius;
	}
}

class Spawner {
	private counter = new Counter(1);
	private stageIndex = -1;
	private readonly stages = [
		// new SpawnerStage(300 * 100, 1, 400, 0),
		new SpawnerStage(300 * 100, 0, 0, 0),
		new SpawnerStage(60 * 100, 3, 5, 5),
		new SpawnerStage(60 * 100, 3, 5, 5),
		new SpawnerStage(60 * 100, 6, 10, 10),
		new SpawnerStage(50 * 100, 9, 15, 15),
		new SpawnerStage(50 * 100, 12, 20, 20),
		new SpawnerStage(40 * 100, 15, 25, 25),
		new SpawnerStage(40 * 100, 18, 30, 30),
	];

	static spawn(free: FreeWorldLayer<any>, stage: SpawnerStage) {
		let min = new Vector(stage.clusterRadius);
		let delta = free.size.subtract(Vector.V1).subtract(min.scale(2));
		console.assert(delta.atLeast(Vector.V1));
		for (let i = 0; i < stage.clusterCount; i++) {
			let spawnCenter = min.add(Vector.rand.multiply(delta));
			for (let j = 0; j < stage.mobsPerCluster; j++) {
				let offset = Vector.rand.scale(stage.clusterRadius * 2).subtract(min);
				free.addTileable(spawnCenter.add(offset), EntityCreator.createMobEntity(MobType.SWARM_DRONE));
			}
		}
	}

	textLines(): TextLine[] {
		return [
			new TextLine(`Stage ${this.stageIndex}`),
			new TextLine(`Enemies in: ${Math.floor(this.counter.i / 100)} / ${Math.floor(this.counter.n / 100)}`),
		];
	}

	sendWave() {
		this.counter.reset(true);
	}

	tick(free: FreeWorldLayer<any>) {
		if (this.counter.tick()) {
			this.stageIndex++;
			let stage = this.stages[Math.min(this.stageIndex, this.stages.length - 1)];
			Spawner.spawn(free, stage);
			this.counter.resize(stage.sleep);
		}
	}
}

let herdConfig = {
	NEIGHBOR_RADIUS: 3,
	NEIGHBOR_RADIUS_2: 3 ** 2,
	MAX_NEIGHBOR_COUNT: 3,

	COHESION_WEIGHT: .008,
	ALIGNMENT_WEIGHT: .15,
	SEPARATION_WEIGHT: .015,
	RAND_WEIGHT: .04,

	CLUMP_DURATION: 600,
	SCATTER_WEIGHT: -.1,
	SCATTER_DURATION: 8,

	MIN_SPEED: .091,
	MIN_SPEED_2: .091 ** 2,
	MAX_SPEED: .11,
	MAX_SPEED_2: .11 ** 2,

	MAX_VELOCITY_UPDATES: 1000,
};
console.assert(!(herdConfig.CLUMP_DURATION % 2));
console.assert(!(herdConfig.SCATTER_DURATION % 2));

class HerdManager {
	private readonly size1: Vector;
	private clumping = true;
	private clumpCounter = new Counter(1);
	private lastHerdSize = 0;

	constructor(size: Vector) {
		this.size1 = size.subtract(Vector.V1);
	}

	tick(freeMobHerdOverlay: FreeWorldLayerChunkOverlay<Entity, EntityMobHerdPositionAttribute>) {
		if (this.clumpCounter.tick()) {
			this.clumping = !this.clumping;
			let duration = this.clumping ? herdConfig.CLUMP_DURATION : herdConfig.SCATTER_DURATION;
			this.clumpCounter = new Counter(util.randInt(duration / 2, duration * 1.5));
		}
		let scatterWeight = !this.clumping ? herdConfig.SCATTER_WEIGHT : 1;

		let velocityUpdateFrequency = herdConfig.MAX_VELOCITY_UPDATES / this.lastHerdSize;
		this.lastHerdSize = 0;
		freeMobHerdOverlay.chunks.forEach(chunkColumn =>
			chunkColumn.forEach(chunk =>
				chunk.forEach(([tile, mobHerdPositionAttribute]) => {
					this.lastHerdSize++;
					if (!mobHerdPositionAttribute.active) return;
					let position = tile.position;
					let velocity = mobHerdPositionAttribute.velocity;

					if (Math.random() < velocityUpdateFrequency) {
						let deltas = this.getNeighborDeltas(freeMobHerdOverlay, position);
						let cohesion = this.calculateCohesion(deltas);
						let separation = this.calculateSeparation(deltas);
						velocity = velocity
							.add(cohesion[0].scale(herdConfig.COHESION_WEIGHT * scatterWeight))
							.add(cohesion[1].scale(herdConfig.ALIGNMENT_WEIGHT * scatterWeight))
							.add(separation.scale(herdConfig.SEPARATION_WEIGHT))
							.add(new Vector(util.randWidth(herdConfig.RAND_WEIGHT), util.randWidth(herdConfig.RAND_WEIGHT)));
						if (velocity.magnitude && velocity.magnitude2 < herdConfig.MIN_SPEED_2)
							velocity = velocity.setMagnitude(herdConfig.MIN_SPEED);
						if (velocity.magnitude2 > herdConfig.MAX_SPEED_2)
							velocity = velocity.setMagnitude(herdConfig.MAX_SPEED);
					}

					position = position.add(velocity.scale(mobHerdPositionAttribute.speed * 10));
					[position, velocity] = this.bound(position, velocity);
					mobHerdPositionAttribute.newPosition = position;
					mobHerdPositionAttribute.velocity = velocity;
				})));
	}

	private getNeighborDeltas(freeMobHerdOverlay: FreeWorldLayerChunkOverlay<Entity, EntityMobHerdPositionAttribute>, self: Vector): [Vector, Vector][] {
		// return up to MAX_NEIGHBOR_COUNT random neighbors within NEIGHBOR_RADIUS
		let output: [Vector, Vector][] = [];
		let searchRadius = new Vector(herdConfig.NEIGHBOR_RADIUS);
		let chunks = freeMobHerdOverlay.chunkRange(self.subtract(searchRadius), self.add(searchRadius));
		util.shuffleInPlace(chunks);
		for (let chunk of chunks)
			for (let [tile, mobHerdPositionAttribute] of chunk) {
				let delta = tile.position.subtract(self);
				if (delta.magnitude2 < herdConfig.NEIGHBOR_RADIUS_2) {
					output.push([delta, mobHerdPositionAttribute.velocity]);
					if (output.length === herdConfig.MAX_NEIGHBOR_COUNT)
						return output;
				}
			}
		return output;
	}

	private calculateSeparation(deltas: [Vector, Vector][]): Vector {
		// return unnormalized sum of separation vectors, each inversely proportion to distance from neighbor
		return deltas.reduce((separation, [delta]) =>
				delta.magnitude2 ?
					separation.subtract(delta.scale(1 / delta.magnitude2)) :
					separation,
			Vector.V0);
	}

	private calculateCohesion(deltas: [Vector, Vector][]): [Vector, Vector] {
		// return unnormalized vector to center of neighbors, and unnormalized & unaveraged sum of neighbor velocities
		if (!deltas.length) return [Vector.V0, Vector.V0];
		let sumDeltas = deltas.reduce(([sumDelta, sumVelocity], [delta, velocity]) => [sumDelta.add(delta), sumVelocity.add(velocity)], [Vector.V0, Vector.V0]);
		sumDeltas[0] = sumDeltas[0].scale(1 / deltas.length);
		return sumDeltas;
	}

	private bound(position: Vector, velocity: Vector): [Vector, Vector] {
		let flipX = position.x < 0 || position.x >= this.size1.x;
		let flipY = position.y < 0 || position.y >= this.size1.y;
		return flipX || flipY ? [
			position.clamp(Vector.V0, this.size1),
			velocity.multiply(new Vector(flipX ? -1 : 1, flipY ? -1 : 1)),
		] : [position, velocity];
	}
}
