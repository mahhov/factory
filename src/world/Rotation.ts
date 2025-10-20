import Vector2 from '../util/Vector2.js';

export enum Rotation { RIGHT, DOWN, LEFT, UP }

export namespace RotationUtils {
	export let positionShift = (rotation: Rotation): Vector2 => {
		switch (rotation) {
			case Rotation.RIGHT:
				return new Vector2(1, 0);
			case Rotation.DOWN:
				return new Vector2(0, 1);
			case Rotation.LEFT:
				return new Vector2(-1, 0);
			case Rotation.UP:
				return new Vector2(0, -1);
		}
	};

	export let opposite = (rotation: Rotation): Rotation => (rotation + 2) % 4;
}
