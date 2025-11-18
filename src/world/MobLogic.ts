import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Entity, Mob} from './Entity.js';
import {EntityMobHerdPositionAttribute} from './EntityAttribute.js';
import {FreeWorldLayerChunkOverlay, World} from './World.js';

export default class MobLogic {
	private herdManager;

	constructor(painter: Painter, world: World) {
		let herdOverlay = world.free.addChunkOverlay(6, entity => entity.getAttribute(EntityMobHerdPositionAttribute));
		this.herdManager = new HerdManager(world.size, herdOverlay);
		util.arr(8000).forEach(() => {
			let position = new Vector(util.rand(world.width - 1), util.rand(world.height - 1));
			let mob = new Mob(position);
			world.free.addTileable(position, mob);
		});
	}

	tick(world: World) {
		this.target();
	}


	private target() {
		this.herdManager.tick();
	}
}

let herdConfig = {
	NEIGHBOR_RADIUS: 3,
	NEIGHBOR_RADIUS_2: 3 ** 2,
	MAX_NEIGHBOR_COUNT: 3,
	COHESION_WEIGHT: .008,
	ALIGNMENT_WEIGHT: .1,
	SEPARATION_WEIGHT: .015,
	RAND_WEIGHT: .04,
	MIN_SPEED: .09,
	MIN_SPEED_2: .09 ** 2,
	MAX_SPEED: .11,
	MAX_SPEED_2: .11 ** 2,
	VELOCITY_UPDATE_FREQUENCY: .1,
};

class HerdManager {
	private readonly size1: Vector;
	private readonly herdOverlay: FreeWorldLayerChunkOverlay<Entity, EntityMobHerdPositionAttribute>;

	constructor(size: Vector, herdOverlay: FreeWorldLayerChunkOverlay<Entity, EntityMobHerdPositionAttribute>) {
		this.size1 = size.subtract(Vector.V1);
		this.herdOverlay = herdOverlay;
	}

	tick() {
		this.herdOverlay.chunks.forEach(chunkColumn => {
			chunkColumn.forEach(chunk => {
				chunk.forEach(mobHerdPositionAttribute => {
					let position = mobHerdPositionAttribute.position;
					let velocity = mobHerdPositionAttribute.velocity;

					if (Math.random() < herdConfig.VELOCITY_UPDATE_FREQUENCY) {
						let deltas = this.getNeighborDeltas(position);
						let cohesion = this.calculateCohesion(deltas);
						let separation = this.calculateSeparation(deltas);
						velocity = velocity
							.add(cohesion[0].scale(herdConfig.COHESION_WEIGHT))
							.add(cohesion[1].scale(herdConfig.ALIGNMENT_WEIGHT))
							.add(separation.scale(herdConfig.SEPARATION_WEIGHT))
							.add(new Vector(util.rand(herdConfig.RAND_WEIGHT) - herdConfig.RAND_WEIGHT / 2, util.rand(herdConfig.RAND_WEIGHT) - herdConfig.RAND_WEIGHT / 2));
						if (velocity.magnitude && velocity.magnitude2 < herdConfig.MIN_SPEED_2)
							velocity = velocity.setMagnitude(herdConfig.MIN_SPEED);
						if (velocity.magnitude2 > herdConfig.MAX_SPEED_2)
							velocity = velocity.setMagnitude(herdConfig.MAX_SPEED);
					}

					position = position.add(velocity);
					[position, velocity] = this.bound(position, velocity);
					mobHerdPositionAttribute.position = position;
					mobHerdPositionAttribute.velocity = velocity;
				});
			});
		});
	}

	private getNeighborDeltas(self: Vector): [Vector, Vector][] {
		// return up to MAX_NEIGHBOR_COUNT random neighbors within NEIGHBOR_RADIUS
		let output: [Vector, Vector][] = [];
		let searchRadius = new Vector(herdConfig.NEIGHBOR_RADIUS);
		let searchStart = self.subtract(searchRadius).clamp(Vector.V0, this.size1);
		let searchEnd = self.add(searchRadius).clamp(Vector.V0, this.size1);
		let chunkStart = this.herdOverlay.chunkPosition(searchStart);
		let chunkEnd = this.herdOverlay.chunkPosition(searchEnd);
		let chunks = [];
		for (let chunkX = chunkStart.x; chunkX <= chunkEnd.x; chunkX++)
			for (let chunkY = chunkStart.y; chunkY <= chunkEnd.y; chunkY++)
				chunks.push(this.herdOverlay.chunks[chunkX][chunkY]);
		util.shuffleInPlace(chunks);
		for (let chunk of chunks)
			for (let mobHerdPositionAttribute of chunk) {
				let delta = mobHerdPositionAttribute.position.subtract(self);
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
