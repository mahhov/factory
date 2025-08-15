import {Container, Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import SpriteLoader from '../graphics/SpriteLoader.js';
import TooltipLine from '../ui/TooltipLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityAttribute,
	EntityContainerAttribute,
	EntityExtractorAttribute,
	EntityProduceAttribute,
	EntityResourceDisplayAttribute,
	EntityResourceFullSpriteAttribute,
	EntityResourcePickerAttribute,
	EntitySourceAttribute,
	EntityTransportAttribute,
} from './EntityAttribute.js';
import {Resource, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, World} from './World.js';

export class Entity {
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
	private readonly containerAttribute: EntityContainerAttribute;

	constructor(rotation: Rotation) {
		super(rotation);
		this.containerAttribute = new EntityContainerAttribute(1, Infinity, {}, util.enumKeys(Rotation).filter(r => r !== RotationUtils.opposite(rotation)));
		this.attributes.push(this.containerAttribute);
		this.attributes.push(new EntityTransportAttribute(this.containerAttribute, 10, true, [], [rotation], true));
		this.attributes.push(new EntityResourceFullSpriteAttribute(this.containerAttribute,
			Conveyor.sprite, resource => Conveyor.spriteFull(resource)));
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'conveyor.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'conveyor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Distributor extends Entity {
	private readonly containerAttribute: EntityContainerAttribute;

	constructor() {
		super();
		this.containerAttribute = new EntityContainerAttribute(1);
		this.attributes.push(this.containerAttribute);
		this.attributes.push(new EntityTransportAttribute(this.containerAttribute, 5, true, [], util.enumKeys(Rotation), true));
		this.attributes.push(new EntityResourceFullSpriteAttribute(this.containerAttribute,
			Distributor.sprite, resource => Distributor.spriteFull(resource)));
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'distributor.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'distributor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Junction extends Entity {
	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'junction.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'junction-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Bridge extends Entity {
	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'bridge.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'bridge-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Extractor extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityContainerAttribute(Infinity, 10, {}, []);
		this.attributes.push(containerAttribute);
		this.attributes.push(new EntityExtractorAttribute(containerAttribute, 80));
		this.attributes.push(new EntityTransportAttribute(containerAttribute, 1));
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
		this.attributes.push(new EntityContainerAttribute());
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'void.png', [Color.ENTITY_VOID]);}
}

export class GlassFactory extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityContainerAttribute(Infinity, 0, {
			[Resource.IRON]: 10,
			[Resource.CARBON]: 10,
			[Resource.STEEL]: 10,
		});
		this.attributes.push(containerAttribute);
		let outputs = ResourceUtils.Count.fromTuples([[Resource.STEEL, 1]]);
		this.attributes.push(new EntityProduceAttribute(containerAttribute, 40,
			ResourceUtils.Count.fromTuples([[Resource.IRON, 1], [Resource.CARBON, 1]]),
			outputs));
		this.attributes.push(new EntityTransportAttribute(containerAttribute, 1, false, outputs.map(resourceCount => resourceCount.resource)));
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'factory-2.png',
			[ResourceUtils.color(Resource.STEEL), ResourceUtils.color(Resource.IRON), ResourceUtils.color(Resource.CARBON)]);
	}
}

export class MegaFactory extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityContainerAttribute(Infinity, 0, {
			[Resource.A]: 10,
			[Resource.B]: 10,
			[Resource.X]: 10,
			[Resource.Y]: 10,
		});
		this.attributes.push(containerAttribute);
		let outputs = ResourceUtils.Count.fromTuples([[Resource.X, 2], [Resource.Y, 1]]);
		this.attributes.push(new EntityProduceAttribute(containerAttribute, 40,
			ResourceUtils.Count.fromTuples([[Resource.A, 2], [Resource.B, 1]]),
			outputs));
		this.attributes.push(new EntityTransportAttribute(containerAttribute, 1, false, outputs.map(resourceCount => resourceCount.resource)));
	}

	static get size() {
		// todo make rotate-able
		return new Vector(4, 4);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'factory-2.png',
			[ResourceUtils.color(Resource.X), ResourceUtils.color(Resource.A), ResourceUtils.color(Resource.B)]);
	}
}

export class ResourceDeposit extends Entity {
	readonly resource: Resource;

	constructor(resource: Resource) {
		super();
		this.sprite = SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'resource-deposit.png', [ResourceUtils.color(resource)]);
		this.resource = resource;
		this.attributes.push(new EntityResourceDisplayAttribute(resource));
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
