import {Container, Sprite} from 'pixi.js';
import {EntityAttribute, EntityContainerAttribute, EntityConveyorTransportAttribute, EntityProduceAttribute, EntitySourceAttribute, ResourceCount, ResourceType} from './EntityAttribute.js';
import spriteLoader from './spriteLoader.js';
import Vector from './Vector.js';
import {WorldLayer} from './World.js';

enum Rotation { RIGHT, DOWN, LEFT, UP }

let rotationToPositionShift = (rotation: Rotation) => {
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

class Entity {
	static Rotation = Rotation;
	protected readonly rotation: Rotation;
	protected readonly attributes: EntityAttribute[] = [];
	readonly container = new Container();

	constructor(rotation: Rotation = Rotation.RIGHT) {
		this.rotation = rotation;
		this.container.rotation = Entity.rotationToAngle(rotation);
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'empty.png');}

	set sprite(sprite: Sprite) {
		this.container.removeChildren();
		this.container.addChild(sprite);
		sprite.anchor.set(.5);
	}

	static rotationToAngle(rotation: Rotation) {
		return [...Array(4)].map((_, i) => i * Math.PI / 2)[rotation];
	}

	getAttribute<T extends EntityAttribute>(attributeClass: new (...args: any[]) => T): T | undefined {
		return this.attributes.find(attribute => attribute instanceof attributeClass) as T;
	}

	tick(worldLayer: WorldLayer, position: Vector) {
		this.attributes.forEach(attribute => attribute.tick(worldLayer, position));
	}
}

class Empty extends Entity {
	constructor() {
		super();
		this.sprite = Empty.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'empty.png');}
}

class Wall extends Entity {
	constructor(rotation: Rotation) {
		super(rotation);
		this.sprite = Wall.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'wall.png');}
}

class Conveyor extends Entity {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(rotation: Rotation) {
		super(rotation);
		this.containerAttribute = new EntityContainerAttribute(1);
		this.attributes.push(this.containerAttribute);
		this.attributes.push(new EntityConveyorTransportAttribute(this.containerAttribute, 10, rotation));
		this.sprite = Conveyor.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor.png');}

	static get spriteFull() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'conveyor-full.png');}

	tick(worldLayer: WorldLayer, position: Vector) {
		super.tick(worldLayer, position);
		this.sprite = this.containerAttribute.empty ? Conveyor.sprite : Conveyor.spriteFull;
	}
}

class Source extends Entity {
	constructor(rotation: Rotation) {
		super(rotation);
		this.attributes.push(new EntitySourceAttribute(40, ResourceType.COPPER));
		this.sprite = Source.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'source.png');}
}

class Void extends Entity {
	constructor(rotation: Rotation) {
		super(rotation);
		this.attributes.push(new EntityContainerAttribute(Infinity));
		this.sprite = Void.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'void.png');}
}

class GlassFactory extends Entity {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(rotation: Rotation) {
		super(rotation);
		this.containerAttribute = new EntityContainerAttribute(10);
		this.attributes.push(this.containerAttribute);
		this.attributes.push(new EntityProduceAttribute(this.containerAttribute, 40,
			ResourceCount.fromTuples([[ResourceType.LEAD, 1], [ResourceType.SAND, 1]]),
			ResourceCount.fromTuples([[ResourceType.GLASS, 1]])));
		this.attributes.push(new EntityConveyorTransportAttribute(this.containerAttribute, 10, rotation));
		this.sprite = GlassFactory.sprite;
	}

	static get sprite() {return spriteLoader.frame(spriteLoader.Resource.TERRAIN, 'glassFactory.png');}

	// todo output in all directions
	// todo check resource types
}

// class AnimatedConveyor extends Entity {
// 	constructor(rotation: Rotation) {
// 		super(AnimatedConveyor.sprite, rotation, 10);
// 	}
//
// 	private static get sprite() {
// 		let animation = spriteLoader.animation(spriteLoader.Resource.CONVEYOR, 'move');
// 		animation.animationSpeed = .1;
// 		animation.play();
// 		return animation;
// 	}
// }

export {Entity, Empty, Wall, Conveyor, Source, Void, GlassFactory};

// todo
//   larger entities
//   factories
//   source select resource type
//   different sprites for different resource types
//   glass factory to emit glass
//   show material quantity on hover
