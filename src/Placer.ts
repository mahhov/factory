import {Container, Graphics} from 'pixi.js';
import Camera from './Camera.js';
import {Conveyor, Empty, Entity, Source, Void, Wall} from './Entity.js';
import {Input} from './Input.js';
import Painter from './Painter.js';
import Vector from './Vector.js';
import {World, WorldLayer} from './World.js';

class Placer {
	static readonly entityClasses: typeof Entity[] = [Empty, Wall, Conveyor, Source, Void];

	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;

	private entityClassRect = new Container();

	private started = false;
	private rotation = Entity.Rotation.RIGHT;
	private entityClass!: typeof Entity;
	private startPosition = new Vector();
	private endPosition = new Vector();

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;

		Placer.entityClasses.forEach((clazz, i) => {
			let sprite = clazz.sprite;
			[sprite.x, sprite.y, sprite.width, sprite.height] = Placer.entityClassUiCoordinates(i).flat();
			painter.uiContainer.addChild(sprite);
		});

		this.entityClassRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.entityClassUiCoordinates(0)[1])
			.stroke({width: 3 / painter.canvasWidth, color: 0xffff00}));
		painter.uiContainer.addChild(this.entityClassRect);

		this.selectEntity(Conveyor);
	}

	private static entityClassUiCoordinates(i: number): [number, number][] {
		let size = .035, margin = .005;
		return [[
			i * (size + margin) + margin,
			1 - margin - size,
		], [
			size,
			size,
		]];
	}

	private get position() {
		let canvasPosition = this.input.mousePosition.copy.scale(new Vector(1 / this.painter.canvasWidth));
		return this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
	}

	selectEntity(clazz: typeof Entity) {
		this.entityClass = clazz;

		let index = Placer.entityClasses.indexOf(clazz);
		[this.entityClassRect.x, this.entityClassRect.y] = Placer.entityClassUiCoordinates(index)[0];
	}

	rotate(delta: number) {
		if (this.started) {
			this.rotation = (this.rotation + delta + 4) % 4;
			this.place(this.world.queue);
		}
	}

	start() {
		this.started = true;
		this.endPosition = this.startPosition = this.position;
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
