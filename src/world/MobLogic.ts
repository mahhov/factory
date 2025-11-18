import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Entity, Mob} from './Entity.js';
import {EntityMobHerdPositionAttribute} from './EntityAttribute.js';
import {FreeWorldLayer, World} from './World.js';

export default class MobLogic {
	private herdManager;
	private mobs: Mob[] = [];

	constructor(painter: Painter, world: World) {
		this.herdManager = new HerdManager(world.size);
		util.arr(6000).forEach(() => {
			let position = new Vector(util.randInt(0, world.width), util.randInt(0, world.height));
			let mob = new Mob();
			this.mobs.push(mob);
			world.free.addTileable(position, mob);
			this.herdManager.add(position, mob.getAttribute(EntityMobHerdPositionAttribute)!);
		});
	}

	tick(world: World) {
		this.target(world.free);
	}


	private target(freeLayer: FreeWorldLayer<Entity>) {
		this.herdManager.update(freeLayer);
	}
}

let herdConfig = {
	NEARBY_RADIUS: 3,
	NEARBY_RADIUS_2: 3 ** 2,
	COHESION_MAX_NEIGHBOR_COUNT: 3,
	COHESION_WEIGHT: .008,
	ALIGNMENT_WEIGHT: .1,
	SEPARATION_WEIGHT: .015,
	RAND_WEIGHT: .04,
	MIN_SPEED: .09,
	MIN_SPEED_2: .09 ** 2,
	MAX_SPEED: .11,
	MAX_SPEED_2: .11 ** 2,
};

class HerdManager {
	private readonly size: Vector;
	mobHerdPositionAttributes: EntityMobHerdPositionAttribute[] = [];

	constructor(size: Vector) {
		this.size = size;
	}

	add(position: Vector, mobHerdPositionAttribute: EntityMobHerdPositionAttribute) {
		mobHerdPositionAttribute.position = position;
		this.mobHerdPositionAttributes.push(mobHerdPositionAttribute);
	}

	update(freeLayer: FreeWorldLayer<Entity>) {
		this.mobHerdPositionAttributes.forEach(mobHerdPositionAttribute => {
			let position = mobHerdPositionAttribute.position;
			let velocity = mobHerdPositionAttribute.velocity;
			let nearbyDeltas = this.getNearbyDeltas(position, freeLayer);
			let cohesion = this.calculateCohesion(nearbyDeltas);
			let separation = this.calculateSeparation(nearbyDeltas);
			velocity = velocity
				.add(cohesion[0].scale(herdConfig.COHESION_WEIGHT))
				.add(cohesion[1].scale(herdConfig.ALIGNMENT_WEIGHT))
				.add(separation.scale(herdConfig.SEPARATION_WEIGHT))
				.add(new Vector(util.rand(herdConfig.RAND_WEIGHT) - herdConfig.RAND_WEIGHT / 2, util.rand(herdConfig.RAND_WEIGHT) - herdConfig.RAND_WEIGHT / 2));
			if (velocity.magnitude && velocity.magnitude2 < herdConfig.MIN_SPEED_2)
				velocity = velocity.setMagnitude(herdConfig.MIN_SPEED);
			if (velocity.magnitude2 > herdConfig.MAX_SPEED_2)
				velocity = velocity.setMagnitude(herdConfig.MAX_SPEED);
			position = position.add(velocity);
			[position, velocity] = this.bound(position, velocity);
			mobHerdPositionAttribute.position = position;
			mobHerdPositionAttribute.velocity = velocity;
		});
	}

	private getNearbyDeltas(self: Vector, freeLayer: FreeWorldLayer<Entity>): [Vector, Vector][] {
		let output: [Vector, Vector][] = [];
		let nearby = new Vector(herdConfig.NEARBY_RADIUS);
		let searchStart = self.subtract(nearby).clamp(Vector.V0, this.size.subtract(Vector.V1));
		let searchEnd = self.add(nearby).clamp(Vector.V0, this.size.subtract(Vector.V1));
		let chunkStart = freeLayer.chunkPosition(searchStart);
		let chunkEnd = freeLayer.chunkPosition(searchEnd);
		for (let chunkX = chunkStart.x; chunkX <= chunkEnd.x; chunkX++)
			for (let chunkY = chunkStart.y; chunkY <= chunkEnd.y; chunkY++)
				for (let tile of freeLayer.chunks[chunkX][chunkY]) {
					let delta = tile.position.subtract(self);
					if (delta.magnitude2 < herdConfig.NEARBY_RADIUS_2) {
						let mobHerdPositionAttribute = tile.tileable.getAttribute(EntityMobHerdPositionAttribute)!;
						output.push([delta, mobHerdPositionAttribute.velocity]);
						if (output.length === herdConfig.COHESION_MAX_NEIGHBOR_COUNT)
							return output;
					}
				}
		return output;
	}

	private calculateSeparation(deltas: [Vector, Vector][]): Vector {
		return deltas.reduce((separation, [delta]) =>
				delta.magnitude2 ?
					separation.subtract(delta.scale(1 / delta.magnitude2)) :
					separation,
			Vector.V0);
	}

	private calculateCohesion(deltas: [Vector, Vector][]): [Vector, Vector] {
		deltas = deltas.slice(0, herdConfig.COHESION_MAX_NEIGHBOR_COUNT);
		let sumDeltas = deltas.reduce(([sumDelta, sumVelocity], [delta, velocity]) => [sumDelta.add(delta), sumVelocity.add(velocity)], [Vector.V0, Vector.V0]);
		sumDeltas[0] = sumDeltas[0].scale(1 / deltas.length);
		return sumDeltas;
	}

	private bound(position: Vector, velocity: Vector): [Vector, Vector] {
		let flipX = position.x < 0 || position.x >= this.size.x;
		let flipY = position.y < 0 || position.y >= this.size.y;
		return flipX || flipY ? [
			position.clamp(Vector.V0, this.size.subtract(Vector.V1)),
			velocity.multiply(new Vector(flipX ? -5 : 1, flipY ? -5 : 1)),
		] : [position, velocity];
	}
}

// todo tune chunk size
