import util from '../util/util.js';
import Vector from '../util/Vector.js';

export enum Rotation { UP, LEFT, DOWN, RIGHT}

export namespace RotationUtils {
	export let positionShift = (rotation: Rotation): Vector => {
		switch (rotation) {
			case Rotation.UP:
				return new Vector(0, -1);
			case Rotation.LEFT:
				return new Vector(-1, 0);
			case Rotation.DOWN:
				return new Vector(0, 1);
			case Rotation.RIGHT:
				return new Vector(1, 0);
		}
	};

	export let opposite = (rotation: Rotation): Rotation => (rotation + 2) % 4;

	export let except = (rotation: Rotation): Rotation[] => util.enumValues(Rotation).filter(r => r !== rotation);
}
