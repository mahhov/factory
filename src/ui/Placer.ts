import {Container, Graphics} from 'pixi.js';
import Camera from '../Camera.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Conveyor, Empty, Entity, GlassFactory, Source, Void, Wall} from '../world/Entity.js';
import {World, WorldLayer} from '../world/World.js';
import {Input} from './Input.js';

export default class Placer {
	static readonly entityClasses: typeof Entity[] = [Empty, Wall, Conveyor, Source, Void, GlassFactory];

	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;

	private entityClassRect = new Container();

	started = false;
	private rotation = Entity.Rotation.RIGHT;
	private entityClass: typeof Entity | null = null;
	private startPosition = new Vector();
	private endPosition = new Vector();

	constructor(painter: Painter, camera: Camera, input: Input, world: World) {
		this.painter = painter;
		this.camera = camera;
		this.input = input;
		this.world = world;

		Placer.entityClasses.forEach((clazz, i) => {
			let coordinates = Placer.entityClassUiCoordinates(i);

			let container = new Container();
			[container.x, container.y] = coordinates[0];
			painter.uiContainer.addChild(container);

			let sprite = clazz.sprite;
			[sprite.width, sprite.height] = coordinates[1];
			container.addChild(sprite);

			let rect = new Graphics()
				.rect(0, 0, ...coordinates[1])
				.stroke({width: 1 / painter.canvasWidth, color: 0xffffff});
			container.addChild(rect);
		});

		this.entityClassRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.entityClassUiCoordinates(0)[1])
			.stroke({width: 3 / painter.canvasWidth, color: 0xffff00}));
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

	selectEntity(clazz: typeof Entity | null) {
		this.entityClass = this.entityClass === clazz ? null : clazz;

		if (this.entityClass) {
			let index = Placer.entityClasses.indexOf(this.entityClass);
			[this.entityClassRect.x, this.entityClassRect.y] = Placer.entityClassUiCoordinates(index)[0];
			this.painter.uiContainer.addChild(this.entityClassRect);
		} else {
			this.painter.uiContainer.removeChild(this.entityClassRect);
			this.started = false;
			this.world.queue.clearAllEntities();
		}
	}

	rotate(delta: number) {
		if (this.started) {
			this.rotation = (this.rotation + delta + 4) % 4;
			this.place(this.world.queue);
		}
	}

	start() {
		if (this.entityClass) {
			this.started = true;
			this.endPosition = this.startPosition = this.position;
		}
	}

	move() {
		if (this.started) {
			this.world.queue.clearAllEntities();
			this.place(this.world.queue);
		}
	}

	end() {
		if (this.started) {
			this.started = false;
			this.world.queue.clearAllEntities();
			this.place(this.world.live);
		}
	}

	private place(worldLayer: WorldLayer) {
		this.endPosition = this.position;
		let delta = this.endPosition.copy.subtract(this.startPosition);
		if (delta.magnitude2)
			this.rotation = Math.abs(delta.y) > Math.abs(delta.x) ?
				delta.y > 0 ? Entity.Rotation.DOWN : Entity.Rotation.UP :
				delta.x > 0 ? Entity.Rotation.RIGHT : Entity.Rotation.LEFT;
		let n = Math.max(Math.abs(delta.x), Math.abs(delta.y));

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

		let position = this.startPosition.copy;
		for (let i = 0; i <= n; i++) {
			worldLayer.setEntity(position, new this.entityClass!(this.rotation));
			position.add(iterDelta);
		}
	}
}

// todo:
//  - only add if word empty or replaceable
//  - add after build time & cost
//  - display entity selection shortcuts
