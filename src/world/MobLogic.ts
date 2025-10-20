import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {EntityMobChaseTargetAttribute} from './EntityAttribute.js';
import {World} from './World.js';
import arr = util.arr;

let scoreMapping: Record<string, number> = {
	Empty: 0,
	Wall: -2,
	Conveyor: .1,
	Distributor: .1,
	Junction: .1,
	Bridge: .1,
	Extractor: 1,
	Source: 0,
	Void: 0,
	GlassFactory: 2,
	MegaFactory: 3,
	ResourceDeposit: 0,
};

export class MobLogic {
	private counter = new Counter(10);

	tick(world: World) {
		if (!this.counter.tick()) return;

		let density = arr(world.width).map(() => arr(world.height).map(() => 0));
		let targets: Vector[] = [];
		for (let x = 0; x < world.width; x++)
			for (let y = 0; y < world.height; y++) {
				let position = new Vector(x, y);
				let tile = world.live.grid[position.x][position.y];
				let score = scoreMapping[tile.tileable.constructor.name] || 0;
				if (!score) continue;
				new Vector(-5).iterate(new Vector(11)).forEach(delta => {
					let p = position.add(delta);
					if (world.live.inBounds(p, Vector.V1)) {
						let added = density[p.x][p.y] > 5;
						density[p.x][p.y] += score / delta.magnitude2;
						if (!added && density[p.x][p.y] > 5)
							targets.push(p);
					}
				});
			}
		targets.sort((t1, t2) => density[t2.x][t2.y] - density[t1.x][t1.y]);
		targets = targets.filter(target => {
			let score = density[target.x][target.y];
			if (!score) return false;
			target.subtract(new Vector(10)).iterate(new Vector(21)).forEach(p => {
				if (world.live.inBounds(p, Vector.V1))
					density[p.x][p.y] = 0;
			});
			return true;
		});

		world.mobLayer.tiles.forEach(mobTile => {
			let mobPosition = mobTile.position;
			let maxScore = -Infinity;
			let bestTargetPosition = mobPosition;
			targets.forEach(position => {
				let liveTile = world.live.getTile(position);
				if (!liveTile) return;
				let score = scoreMapping[liveTile.tileable.constructor.name] || 0;
				let distance = mobPosition.subtract(position).magnitude2;
				let currentScore = score - distance / 20000;
				if (currentScore > maxScore) {
					maxScore = currentScore;
					bestTargetPosition = position;
				}
			});

			let targetAttribute = mobTile.tileable.getAttribute<EntityMobChaseTargetAttribute>(EntityMobChaseTargetAttribute);
			if (targetAttribute)
				targetAttribute.target = bestTargetPosition;
		});
	}
}
