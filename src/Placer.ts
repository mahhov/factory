import Camera from './Camera.js';
import {Input} from './Input.js';
import Vector from './Vector.js';
import {Entity, Wall, World} from './World.js';

enum Rotation { LEFT, UP, RIGHT, DOWN }

class Placer {
	private camera: Camera;
	private input: Input;
	private world: World;

	private selectedEntityClass: typeof Entity = Wall;
	private lastPosition = new Vector();
	private position = new Vector();
	private rotation = Rotation.RIGHT;
	private first = false;


	constructor(camera: Camera, input: Input, world: World) {
		this.camera = camera;
		this.input = input;
		this.world = world;
	}

	selectEntity(clazz: typeof Entity) {
		this.selectedEntityClass = clazz;
	}

	start() {
		this.first = true;
	}

	move() {
		this.lastPosition = this.position;
		this.position = this.camera.canvasToWorld(this.input.mousePosition.copy).scale(this.world.size).floor();
		let delta = this.position.copy.subtract(this.lastPosition);
		if (!this.first && delta.magnitude2)
			this.rotation = Math.abs(delta.y) > Math.abs(delta.x) ?
				delta.y > 0 ? Rotation.DOWN : Rotation.UP :
				delta.x > 0 ? Rotation.RIGHT : Rotation.LEFT;
		if ((this.first || delta.magnitude2) && this.position.atLeast(new Vector()) && this.position.lessThan(this.world.size)) {
			console.log(this.rotation);
			this.world.updateEntity(this.position, new this.selectedEntityClass());
		}
		this.first = false;
	}
}

export default Placer;
