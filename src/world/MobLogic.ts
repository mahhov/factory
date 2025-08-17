import Vector from '../util/Vector.js';
import {EntityMobChaseTargetAttribute} from './EntityAttribute.js';
import {World} from './World.js';

export class MobLogic {
	position = new Vector();
	first = true;

	constructor() {
	}

	tick(world: World) {
		if (this.first) {
			this.first = false;
			this.position = world.randPosition;
		}
		world.mobLayer.tiles.forEach(tile => {
			let x = tile.tileable.getAttribute<EntityMobChaseTargetAttribute>(EntityMobChaseTargetAttribute);
			if (x)
				x.target = this.position;
		});
	}
}
