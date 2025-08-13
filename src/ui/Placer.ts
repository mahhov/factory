import {Container, Graphics} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Conveyor, Empty, Entity, GlassFactory, MegaFactory, Source, Void, Wall} from '../world/Entity.js';
import Rotation from '../world/Rotation.js';
import {World, WorldLayer} from '../world/World.js';
import {Input} from './Input.js';

enum State {
	EMPTY, ENTITY_SELECTED, STARTED
}

export default class Placer {
	static readonly State = State;
	static readonly entityClasses: typeof Entity[] = [Wall, Conveyor, Source, Void, GlassFactory, MegaFactory];

	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;

	private readonly entityClassRect = new Container();

	private started = false;
	private rotation = Entity.Rotation.RIGHT;
	private entityClass: typeof Entity = Empty;
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
				.stroke({width: 1 / painter.canvasWidth, color: Color.RECT_OUTLINE});
			container.addChild(rect);
		});

		this.entityClassRect.addChild(new Graphics()
			.rect(0, 0, ...Placer.entityClassUiCoordinates(0)[1])
			.stroke({width: 3 / painter.canvasWidth, color: Color.SELECTED_RECT_OUTLINE}));
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

	private get position(): Vector {
		let canvasPosition = this.input.mousePosition.copy.scale(new Vector(1 / this.painter.canvasWidth));
		return this.camera.canvasToWorld(canvasPosition)
			.scale(this.world.size).floor();
	}

	toggleEntity(clazz: typeof Entity) {
		this.setEntity(this.entityClass === clazz ? Empty : clazz);
	}

	setEntity(clazz: typeof Entity) {
		this.entityClass = clazz;

		let index = Placer.entityClasses.indexOf(this.entityClass);
		if (index === -1)
			this.painter.uiContainer.removeChild(this.entityClassRect);
		else {
			[this.entityClassRect.x, this.entityClassRect.y] = Placer.entityClassUiCoordinates(index)[0];
			this.painter.uiContainer.addChild(this.entityClassRect);
		}

		this.place(this.world.queue, false);
	}

	rotate(delta: number) {
		if (this.started) {
			this.rotation = (this.rotation + delta + 4) % 4;
			this.place(this.world.queue, false);
		}
	}

	start() {
		this.started = true;
		this.endPosition = this.startPosition = this.position;
	}

	move() {
		let position = this.position;
		if (position.equals(this.endPosition))
			return;

		if (!this.started)
			this.startPosition = position;
		this.endPosition = position;

		if (this.state !== State.EMPTY || this.started)
			this.place(this.world.queue, this.started);
	}

	end() {
		if (this.started) {
			this.started = false;
			this.place(this.world.live, false);
		}
	}

	pick() {
		let tile = this.world.live.getTile(this.position);
		this.setEntity(tile ? tile.entity.constructor as typeof Entity : Empty);
	}

	private place(worldLayer: WorldLayer, updateRotation: boolean) {
		let delta = this.endPosition.copy.subtract(this.startPosition);
		let iterations = delta
			.copy
			.scale(this.entityClass.size.invert())
			.floor()
			.abs()
			.add(new Vector(1));
		let vertical = Math.abs(iterations.y) > Math.abs(iterations.x);
		let rotation = vertical ?
			delta.y > 0 ? Entity.Rotation.DOWN : Entity.Rotation.UP :
			delta.x > 0 ? Entity.Rotation.RIGHT : Entity.Rotation.LEFT;
		if (updateRotation && (delta.y || delta.x))
			this.rotation = rotation;

		this.world.queue.clearAllEntities();
		let position = this.startPosition.copy;
		let n = vertical ? iterations.y : iterations.x;
		let iterDelta = Rotation.positionShift(rotation).scale(this.entityClass.size);
		for (let i = 0; i < n; i++) {
			worldLayer.replaceEntity(position, new this.entityClass(this.rotation));
			position.add(iterDelta);
		}
	}

	get state() {
		if (this.started)
			return State.STARTED;
		if (this.entityClass !== Empty)
			return State.ENTITY_SELECTED;
		return State.EMPTY;
	}
}

// todo:
//  - only add if world empty or replaceable
//  - add after build time & cost
//  - display entity selection shortcuts
