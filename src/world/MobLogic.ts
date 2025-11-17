import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Mob} from './Entity.js';
import {EntityMobHerdPositionAttribute} from './EntityAttribute.js';
import {World} from './World.js';

export default class MobLogic {
	private herdManager;
	private mobs: Mob[] = [];

	constructor(painter: Painter, world: World) {
		this.herdManager = new HerdManager(world.size);
		util.arr(1000).forEach(() => {
			let position = new Vector(util.randInt(0, world.width), util.randInt(0, world.height));
			let mob = new Mob();
			this.mobs.push(mob);
			world.free.addTileable(position, mob);
			this.herdManager.addPosition(position);
		});
	}

	tick(world: World) {
		this.target(world);
	}


	private target(world: World) {
		this.herdManager.update();
		this.mobs.forEach((mob, i) => {
			let mobChaseTargetAttribute = mob.getAttribute(EntityMobHerdPositionAttribute)!;
			mobChaseTargetAttribute.position = this.herdManager.positionVelocities[i][0];
		});
	}
}

let herdConfig = {
	NEARBY_RADIUS_2: 100,
	COHESION_MAX_NEIGHBOR_COUNT: 5,
	COHESION_WEIGHT: .008,
	ALIGNMENT_WEIGHT: 1,
	SEPARATION_RADIUS_2: 10,
	SEPARATION_WEIGHT: .01,
	FRICTION: .99,
	MIN_SPEED: .09,
	MAX_SPEED: .11,
};

class HerdManager {
	private readonly size: Vector;
	positionVelocities: [Vector, Vector][] = [];

	constructor(size: Vector) {
		this.size = size;
	}

	addPosition(position: Vector) {
		this.positionVelocities.push([position, Vector.V0]);
	}

	update() {
		this.positionVelocities = this.positionVelocities.map(([position, velocity]) => {
				let nearbyDeltas = this.getNearbyDeltas(position);
				let cohesion = this.calculateCohesion(nearbyDeltas);
				let separation = this.calculateSeparation(nearbyDeltas);
				velocity = velocity
					.scale(herdConfig.FRICTION)
					.add(cohesion[0].scale(herdConfig.COHESION_WEIGHT))
					.add(cohesion[1].scale(herdConfig.ALIGNMENT_WEIGHT))
					.add(separation.scale(herdConfig.SEPARATION_WEIGHT));
				if (velocity.magnitude && velocity.magnitude < herdConfig.MIN_SPEED)
					velocity = velocity.setMagnitude(herdConfig.MIN_SPEED);
				if (velocity.magnitude > herdConfig.MAX_SPEED)
					velocity = velocity.setMagnitude(herdConfig.MAX_SPEED);
				position = position.add(velocity);
				return this.bound(position, velocity);
			},
		);
	}

	private getNearbyDeltas(self: Vector): [Vector, Vector][] {
		// todo use freeLayer chunks for performance
		return this.positionVelocities
			.map(([position, velocity]) => [position.subtract(self), velocity] as [Vector, Vector])
			.filter(([delta]) => delta.magnitude2 < herdConfig.NEARBY_RADIUS_2)
			.sort(([a], [b]) => a.magnitude2 - b.magnitude2); // todo check if sorting and slicing is a net performance loss or gain
	}

	private calculateSeparation(deltas: [Vector, Vector][]): Vector {
		return deltas.reduce((separation, [delta]) =>
				delta.magnitude2 && delta.magnitude2 < herdConfig.SEPARATION_RADIUS_2 ?
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

// todo add some randomness if still
// todo figure out why fast initially
// todo figure out performance
