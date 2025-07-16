import Camera from './Camera.js';
import {Conveyor, Entity, SimpleEntityCtor} from './Entity.js';
import {Input} from './Input.js';
import Vector from './Vector.js';
import {World, WorldLayer} from './World.js';

class Placer {
	private camera: Camera;
	private input: Input;
	private world: World;

	private rotation = Entity.Rotation.RIGHT;
	private entityClass: SimpleEntityCtor = Conveyor;
	private startPosition = new Vector();

	constructor(camera: Camera, input: Input, world: World) {
		this.camera = camera;
		this.input = input;
		this.world = world;
	}

	private get position() {
		return this.camera.canvasToWorld(this.input.mousePosition.copy);
	}

	selectEntity(clazz: SimpleEntityCtor) {
		this.entityClass = clazz;
	}

	start() {
		this.startPosition = this.position;
	}

	move() {
		this.world.queue.clearAllEntities();
		this.place(this.world.queue);
	}

	end() {
		this.world.queue.clearAllEntities();
		this.place(this.world.live);
	}

	private place(worldLayer: WorldLayer) {
		let endPosition = this.position;
		let gridStartPosition = this.startPosition.copy.scale(this.world.size).floor();
		let gridEndPosition = endPosition.copy.scale(this.world.size).floor();
		let gridDelta = gridEndPosition.copy.subtract(gridStartPosition);
		if (gridDelta.x || gridDelta.y)
			this.rotation =
				Math.abs(gridDelta.y) > Math.abs(gridDelta.x) ?
					gridDelta.y > 0 ? Entity.Rotation.DOWN : Entity.Rotation.UP :
					gridDelta.x > 0 ? Entity.Rotation.RIGHT : Entity.Rotation.LEFT;
		let n = Math.max(Math.abs(gridDelta.x), Math.abs(gridDelta.y));
		let iterDelta: Vector;
		switch (this.rotation) {
			case Entity.Rotation.RIGHT:
				iterDelta = new Vector(1, 0);
				break;
			case Entity.Rotation.DOWN:
				iterDelta = new Vector(0, 1);
				break;
			case Entity.Rotation.LEFT:
				iterDelta = new Vector(-1, 0);
				break;
			case Entity.Rotation.UP:
				iterDelta = new Vector(0, -1);
				break;
		}

		let gridPosition = gridStartPosition.copy;
		for (let i = 0; i <= n; i++) {
			worldLayer.setEntity(gridPosition, new this.entityClass(this.rotation));
			gridPosition.add(iterDelta);
		}
	}
}

export default Placer;

// todo:
//  - only add if word empty or replaceable
//  - add after build time & cost
//  - mouse wheel to rotate
//  - display entity selection shortcuts
