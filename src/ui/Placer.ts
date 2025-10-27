import {Container, Graphics, Text} from 'pixi.js';
import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import Vector from '../util/Vector.js';
import {Conveyor, Distributor, Empty, Entity, Extractor, GlassFactory, Junction, Turret, Wall} from '../world/Entity.js';
import {Rotation, RotationUtils} from '../world/Rotation.js';
import {GridWorldLayer, World} from '../world/World.js';
import {Input} from './Input.js';

enum State {
	EMPTY, ENTITY_SELECTED, STARTED
}

export default class Placer {
	static readonly State = State;
	static readonly entityClasses: typeof Entity[] =
		[Wall, Conveyor, Distributor, Junction, Extractor, GlassFactory, Turret];

	private readonly painter: Painter;
	private readonly camera: Camera;
	private readonly input: Input;
	private readonly world: World;

	private readonly entityClassRect = new Container();

	private started = false;
	private rotation = Rotation.RIGHT;
	private entityClass: typeof Entity = Empty;
	private startPosition = Vector.V0;
	private endPosition = Vector.V0;

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
			if (sprite) {
				[sprite.width, sprite.height] = coordinates[1];
				container.addChild(sprite);
			}

			let rect = new Graphics()
				.rect(0, 0, ...coordinates[1])
				.stroke({width: 1 / painter.canvasWidth, color: Color.RECT_OUTLINE});
			container.addChild(rect);

			let textContainer = new Container();
			[textContainer.x, textContainer.y] = coordinates[0].map(v => v * 1000);
			painter.textUiContainer.addChild(textContainer);

			let text = new Text({
				text: i + 1,
				style: {
					fontFamily: 'Arial',
					fontSize: 14,
					fill: Color.DEFAULT_TEXT,
				},
				x: 3,
				y: 1,
			});
			textContainer.addChild(text);
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
		let canvasPosition = this.input.mousePosition.scale(new Vector(1 / this.painter.canvasWidth));
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

		if (this.state !== State.EMPTY || this.started)
			this.place(this.world.planning, false);
		else
			this.world.planning.clearAllEntities();
	}

	rotate(delta: number) {
		if (this.started) {
			this.rotation = (this.rotation + delta + 4) % 4;
			this.place(this.world.planning, false);
		}
	}

	start() {
		this.started = true;
		this.endPosition = this.startPosition = this.position;
	}

	move() {
		let position = this.position;
		if (position.equals(this.endPosition)) return;

		if (!this.started)
			this.startPosition = position;
		this.endPosition = position;

		if (this.state !== State.EMPTY || this.started)
			this.place(this.world.planning, this.started);
	}

	end() {
		if (this.started) {
			this.started = false;
			this.place(this.world.queue, false);
		}
	}

	pick() {
		let tile = this.world.queue.getTile(this.position);
		if (tile?.tileable instanceof Empty)
			tile = this.world.live.getTile(this.position);
		this.setEntity(tile ? tile.tileable.constructor as typeof Entity : Empty);
	}

	private place(worldLayer: GridWorldLayer<Entity>, updateRotation: boolean) {
		let delta = this.endPosition.subtract(this.startPosition);
		let iterations = delta
			.scale(this.entityClass.size.invert())
			.floor()
			.abs()
			.add(Vector.V1);
		let vertical = Math.abs(iterations.y) > Math.abs(iterations.x);
		let rotation = vertical ?
			delta.y > 0 ? Rotation.DOWN : Rotation.UP :
			delta.x > 0 ? Rotation.RIGHT : Rotation.LEFT;
		if (updateRotation && (delta.y || delta.x))
			this.rotation = rotation;

		this.world.planning.clearAllEntities();
		let position = this.startPosition;
		let n = vertical ? iterations.y : iterations.x;
		let iterDelta = RotationUtils.positionShift(rotation).scale(this.entityClass.size);
		for (let i = 0; i < n; i++) {
			worldLayer.replaceTileable(position, new this.entityClass(this.rotation));
			position = position.add(iterDelta);
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

// todo only add if world empty or replaceable
