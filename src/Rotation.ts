import Vector from './Vector.js';

enum Rotation { RIGHT, DOWN, LEFT, UP }

namespace Rotation {
	export let positionShift = (rotation: Rotation): Vector => {
		switch (rotation) {
			case Rotation.RIGHT:
				return new Vector(1, 0);
			case Rotation.DOWN:
				return new Vector(0, 1);
			case Rotation.LEFT:
				return new Vector(-1, 0);
			case Rotation.UP:
				return new Vector(0, -1);
		}
	};

	export let opposite = (rotation: Rotation): Rotation => (rotation + 2) % 4;
}

export default Rotation;
