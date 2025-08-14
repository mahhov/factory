import {Container, Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import SpriteLoader from '../graphics/SpriteLoader.js';
import TooltipLine from '../ui/TooltipLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityAttribute,
	EntityBoxContainerAttribute,
	EntityConveyorTransportAttribute,
	EntityExtractorAttribute,
	EntityFilteredTransportAttribute,
	EntityLineContainerAttribute,
	EntityOutContainerAttribute,
	EntityProduceAttribute,
	EntityResourcePickerAttribute,
	EntitySourceAttribute,
	EntityUnfilteredTransportAttribute,
	EntityVoidContainerAttribute,
} from './EntityAttribute.js';
import Resource from './Resource.js';
import Rotation from './Rotation.js';
import {Tile, World} from './World.js';

export class Entity {
	static readonly Rotation = Rotation;
	protected readonly rotation: Rotation;
	protected readonly attributes: EntityAttribute[] = [];
	readonly container = new Container();

	constructor(rotation: Rotation = Rotation.RIGHT) {
		this.rotation = rotation;
		let sprite = (this.constructor as typeof Entity).sprite;
		if (sprite)
			this.sprite = sprite;
	}

	static get size() {
		return new Vector(1);
	}

	static get sprite(): Sprite | null {return null;}

	set sprite(sprite: Sprite) {
		let halfSize = new Vector(sprite.width, sprite.height).scale(new Vector(.5));
		sprite.pivot = halfSize;
		sprite.position = halfSize;
		sprite.rotation = Entity.rotationToAngle(this.rotation);
		this.container.removeChildren();
		this.container.addChild(sprite);
	}

	static rotationToAngle(rotation: Rotation) {
		return [...Array(4)].map((_, i) => i * Math.PI / 2)[rotation];
	}

	get size() {
		return (this.constructor as typeof Entity).size;
	}

	getAttribute<T extends EntityAttribute>(attributeClass: typeof EntityAttribute): T | undefined {
		return this.attributes.find(attribute => attribute instanceof attributeClass) as T;
	}

	tick(world: World, tile: Tile) {
		this.attributes.forEach(attribute => attribute.tick(world, tile));
	}

	get tooltip(): TooltipLine[] {
		return this.attributes.map(attribute => attribute.tooltip).flat();
	}

	get selectable(): boolean {
		return this.attributes.some(attribute => attribute.selectable);
	}
}

export class Empty extends Entity {
	constructor() {
		super();
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'square.png', [Color.ENTITY_EMPTY]);}
}

export class Wall extends Entity {
	constructor() {
		super();
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'square.png', [Color.ENTITY_WALL]);}
}

export class Conveyor extends Entity {
	private readonly containerAttribute: EntityLineContainerAttribute;

	constructor(rotation: Rotation) {
		super(rotation);
		this.containerAttribute = new EntityLineContainerAttribute(1, util.enumKeys(Rotation).filter(r => r !== Rotation.opposite(rotation)));
		this.attributes.push(this.containerAttribute);
		this.attributes.push(new EntityConveyorTransportAttribute(this.containerAttribute, 10, rotation));
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'conveyor.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'conveyor-full.png', [Resource.color(resource)]);
	}

	tick(world: World, tile: Tile) {
		super.tick(world, tile);
		this.sprite = this.containerAttribute.empty ?
			Conveyor.sprite :
			Conveyor.spriteFull(this.containerAttribute.peek.resource);
	}
}

export class Extractor extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityOutContainerAttribute(10);
		this.attributes.push(containerAttribute);
		this.attributes.push(new EntityExtractorAttribute(containerAttribute, 80));
		this.attributes.push(new EntityUnfilteredTransportAttribute(containerAttribute, 1));
	}

	static get size() {
		return new Vector(4, 4);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'extractor.png', [Color.ENTITY_EXTRACTOR]);
	}
}

export class Source extends Entity {
	constructor() {
		super();
		let entityResourcePickerAttribute = new EntityResourcePickerAttribute();
		this.attributes.push(entityResourcePickerAttribute);
		this.attributes.push(new EntitySourceAttribute(40, entityResourcePickerAttribute));
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'source.png', [Color.ENTITY_SOURCE]);}
}

export class Void extends Entity {
	constructor() {
		super();
		this.attributes.push(new EntityVoidContainerAttribute());
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'void.png', [Color.ENTITY_VOID]);}
}

export class GlassFactory extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityBoxContainerAttribute({
			[Resource.LEAD]: 10,
			[Resource.SAND]: 10,
			[Resource.GLASS]: 10,
		});
		this.attributes.push(containerAttribute);
		let outputs = Resource.Count.fromTuples([[Resource.GLASS, 1]]);
		this.attributes.push(new EntityProduceAttribute(containerAttribute, 40,
			Resource.Count.fromTuples([[Resource.LEAD, 1], [Resource.SAND, 1]]),
			outputs));
		this.attributes.push(new EntityFilteredTransportAttribute(containerAttribute, 1, outputs));
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'factory-2.png',
			[Resource.color(Resource.GLASS), Resource.color(Resource.LEAD), Resource.color(Resource.SAND)]);
	}
}

export class MegaFactory extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityBoxContainerAttribute({
			[Resource.A]: 10,
			[Resource.B]: 10,
			[Resource.X]: 10,
			[Resource.Y]: 10,
		});
		this.attributes.push(containerAttribute);
		let outputs = Resource.Count.fromTuples([[Resource.X, 2], [Resource.Y, 1]]);
		this.attributes.push(new EntityProduceAttribute(containerAttribute, 40,
			Resource.Count.fromTuples([[Resource.A, 2], [Resource.B, 1]]),
			outputs));
		this.attributes.push(new EntityFilteredTransportAttribute(containerAttribute, 1, outputs));
	}

	static get size() {
		// todo make rotate-able
		return new Vector(4, 4);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'factory-2.png',
			[Resource.color(Resource.X), Resource.color(Resource.A), Resource.color(Resource.B)]);
	}
}

export class ResourceDeposit extends Entity {
	readonly resource: Resource;

	constructor(resource: Resource) {
		super();
		this.sprite = SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'resource-deposit.png', [Resource.color(resource)]);
		this.resource = resource;
	}
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
