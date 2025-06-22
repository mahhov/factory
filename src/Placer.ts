import Camera from './Camera.js';
import {Input} from './Input.js';
import Vector from './Vector.js';
import {Conveyor, Entity, SimpleEntityCtor, World} from './World.js';

class Placer {
	private camera: Camera;
	private input: Input;
	private world: World;

	private selectedEntityClass: SimpleEntityCtor = Conveyor;
	private lastPosition = new Vector();
	private position = new Vector();
	private rotation = Entity.Rotation.RIGHT;
	private first = false;

	constructor(camera: Camera, input: Input, world: World) {
		this.camera = camera;
		this.input = input;
		this.world = world;
	}

	selectEntity(clazz: SimpleEntityCtor) {
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
				delta.y > 0 ? Entity.Rotation.DOWN : Entity.Rotation.UP :
				delta.x > 0 ? Entity.Rotation.RIGHT : Entity.Rotation.LEFT;
		if ((this.first || delta.magnitude2) && this.position.atLeast(new Vector()) && this.position.lessThan(this.world.size))
			this.world.setEntity(this.position, new this.selectedEntityClass(this.rotation));
		this.first = false;
	}
}

export default Placer;
