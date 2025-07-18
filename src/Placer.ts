import Camera from './Camera.js';
import {Conveyor, Empty, Entity, SimpleEntityCtor, Source, Void, Wall} from './Entity.js';
import {Input} from './Input.js';
import Painter from './Painter.js';
import spriteLoader from './spriteLoader.js';
import Vector from './Vector.js';
import {World, WorldLayer} from './World.js';

class Placer {
	static entityClasses = [Empty, Wall, Conveyor, Source, Void];

	private painter: Painter;
	private camera: Camera;
	private input: Input;
	private world: World;

	private started = false;
	private rotation = Entity.Rotation.RIGHT;
	private entityClass: SimpleEntityCtor = Conveyor;
	private startPosition = new Vector();
	private endPosition = new Vector();

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;

		Placer.entityClasses.forEach((clazz, i) => {
			let sprite = spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'wall.png');
			sprite.x = i * 100 / 1400;
			sprite.y = i * 100 / 1400;
			sprite.width = 50 / 1400;
			sprite.height = 50 / 1400;
			painter.uiContainer.addChild(sprite);
		});
	}

	private get position() {
		let canvasPosition = this.input.mousePosition.copy.scale(new Vector(1 / this.painter.canvasWidth));
		return this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
	}

	selectEntity(clazz: SimpleEntityCtor) {
		this.entityClass = clazz;
	}

	rotate(delta: number) {
		if (this.started) {
			this.rotation = (this.rotation + delta + 4) % 4;
			this.place(this.world.queue);
		}
	}

	start() {
		this.started = true;
		this.startPosition = this.position;
	}

	move() {
		this.world.queue.clearAllEntities();
		this.place(this.world.queue);
	}

	end() {
		this.started = false;
		this.world.queue.clearAllEntities();
		this.place(this.world.live);
	}

	private place(worldLayer: WorldLayer) {
		let endPosition = this.position;
		let delta = endPosition.copy.subtract(this.startPosition);
		let rotation = Math.abs(delta.y) > Math.abs(delta.x) ?
			delta.y > 0 ? Entity.Rotation.DOWN : Entity.Rotation.UP :
			delta.x > 0 ? Entity.Rotation.RIGHT : Entity.Rotation.LEFT;
		let n = Math.max(Math.abs(delta.x), Math.abs(delta.y));

		if (endPosition.x !== this.endPosition.x || endPosition.y !== this.endPosition.y) {
			this.endPosition = endPosition;
			this.rotation = rotation;
		}

		let iterDelta: Vector;
		switch (rotation) {
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

		let position = this.startPosition.copy;
		for (let i = 0; i <= n; i++) {
			worldLayer.setEntity(position, new this.entityClass(this.rotation));
			position.add(iterDelta);
		}
	}
}

export default Placer;

// todo:
//  - only add if word empty or replaceable
//  - add after build time & cost
//  - display entity selection shortcuts
