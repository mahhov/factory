import {Container, Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import SpriteLoader from '../graphics/SpriteLoader.js';
import TextLine from '../ui/TextLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityAttribute,
	EntityBuildableAttribute,
	EntityConsumeAttribute,
	EntityContainerAttribute,
	EntityDamageAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityExtractorAttribute,
	EntityHasAnyOfResourceAttribute,
	EntityHealthAttribute,
	EntityJunctionTransportAttribute,
	EntityMobChaseTargetAttribute,
	EntityMobHealthAttribute,
	EntityOutflowAttribute,
	EntityProduceAttribute,
	EntityResourceDisplayAttribute,
	EntityResourceFullSpriteAttribute,
	EntityResourcePickerAttribute,
	EntitySourceAttribute,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	EntityTransportAttribute,
	getResourceCounts,
} from './EntityAttribute.js';
import {Resource, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, Tileable, World} from './World.js';

export class Entity implements Tileable {
	readonly size: Vector;
	protected readonly rotation: Rotation;
	protected readonly attributes: EntityAttribute[][] = [];
	readonly container = new Container();

	constructor(size: Vector = Vector.V1, rotation: Rotation = Rotation.RIGHT) {
		this.size = size;
		this.rotation = rotation;
		let sprite = (this.constructor as typeof Entity).sprite;
		if (sprite)
			this.sprite = sprite;
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

	getAttribute<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T | undefined {
		return this.attributes.flat().find(attribute => attribute instanceof attributeClass) as T;
	}

	tick(world: World, tile: Tile<Entity>) {
		this.attributes
			.filter(attributeChain => attributeChain.every(attribute => attribute.tick(world, tile)))
			.forEach(attributeChain => attributeChain.forEach(attribute => attribute.reset()));
	}

	get tooltip(): TextLine[] {
		return this.attributes.flat().map(attribute => attribute.tooltip).flat();
	}

	get selectable(): boolean {
		return this.attributes.flat().some(attribute => attribute.selectable);
	}
}

export class Empty extends Entity {
	constructor() {
		super();
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'square.png', [Color.ENTITY_EMPTY]);}
}

export class Wall extends Entity {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number) {
		super(size);
		this.attributes.push([new EntityBuildableAttribute(buildTime, buildCost)]);
		this.attributes.push([new EntityHealthAttribute(health)]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'square.png', [Color.ENTITY_WALL]);}
}

export class Extractor extends Entity {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, heatOutput: number, outputPerTier: number[]) {
		super(size);
		// todo move health and buildable attributes to a super class
		this.attributes.push([new EntityBuildableAttribute(buildTime, buildCost)]);
		this.attributes.push([new EntityHealthAttribute(health)]);
		let containerAttribute = new EntityContainerAttribute(Infinity, getResourceCounts(10), []);
		this.attributes.push([containerAttribute]);
		// todo don't extract while still being built
		this.attributes.push([
			new EntityTimedAttribute(80),
			new EntityConsumeAttribute(containerAttribute, ResourceUtils.Count.fromTuples([
				[Resource.POWER, powerInput],
				[Resource.COOLANT, heatOutput]])),
			new EntityExtractorAttribute(containerAttribute, outputPerTier),
		]);
		this.attributes.push([new EntityOutflowAttribute(containerAttribute, getResourceCounts(1))]);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'extractor.png', [Color.ENTITY_EXTRACTOR]);
	}
}

export class Conveyor extends Entity {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number,rotation: Rotation) {
		super(size, rotation);
		this.attributes.push([new EntityBuildableAttribute(buildTime, buildCost)]);
		this.attributes.push([new EntityHealthAttribute(health)]);
		let containerAttribute = new EntityContainerAttribute(1, getResourceCounts(Infinity), util.enumValues(Rotation).filter(r => r !== RotationUtils.opposite(rotation)));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(containerAttribute, [rotation]),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Conveyor.sprite, resource => Conveyor.spriteFull(resource))]);
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'conveyor.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'conveyor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Distributor extends Entity {
	constructor() {
		super();
		this.attributes.push([new EntityHealthAttribute(1)]);
		let containerAttribute = new EntityContainerAttribute(1, getResourceCounts(Infinity));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getResourceCounts(1)),
			new EntityTimedAttribute(10),
			new EntityTransportAttribute(containerAttribute, util.enumValues(Rotation)),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Distributor.sprite, resource => Distributor.spriteFull(resource))]);
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'distributor.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'distributor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Junction extends Entity {
	constructor() {
		super();
		this.attributes.push([new EntityHealthAttribute(1)]);
		let containerAttribute = new EntityContainerAttribute(1, getResourceCounts(Infinity));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getResourceCounts(1)),
			new EntityTimedAttribute(10),
			new EntityJunctionTransportAttribute(containerAttribute),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Junction.sprite, resource => Junction.spriteFull(resource))]);
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'junction.png');
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'junction-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Source extends Entity {
	constructor() {
		super();
		let entityResourcePickerAttribute = new EntityResourcePickerAttribute();
		this.attributes.push([entityResourcePickerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			new EntitySourceAttribute(entityResourcePickerAttribute),
		]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'source.png', [Color.ENTITY_SOURCE]);}
}

export class Void extends Entity {
	constructor() {
		super();
		this.attributes.push([new EntityContainerAttribute(Infinity, getResourceCounts(Infinity))]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'void.png', [Color.ENTITY_VOID]);}
}

export class GlassFactory extends Entity {
	constructor() {
		super();
		let containerAttribute = new EntityContainerAttribute(Infinity, getResourceCounts(0, {
			[Resource.IRON]: 10,
			[Resource.STEEL]: 10,
		}));
		this.attributes.push([new EntityHealthAttribute(10)]);
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			new EntityConsumeAttribute(containerAttribute, ResourceUtils.Count.fromTuples([[Resource.IRON, 1], [Resource.STEEL, 1]])),
			new EntityProduceAttribute(containerAttribute, ResourceUtils.Count.fromTuples([[Resource.STEEL, 1]])),
		]);
		this.attributes.push([new EntityOutflowAttribute(containerAttribute, getResourceCounts(0, {
			[Resource.STEEL]: 1,
		}))]);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'factory-2.png',
			[ResourceUtils.color(Resource.STEEL), ResourceUtils.color(Resource.IRON), ResourceUtils.color(Resource.STEEL)]);
	}
}

export class Turret extends Entity {
	constructor() {
		super(new Vector(2));
		let containerAttribute = new EntityContainerAttribute(Infinity, getResourceCounts(0, {[Resource.IRON]: 10}));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(30),
			new EntityConsumeAttribute(containerAttribute, getResourceCounts(0, {[Resource.IRON]: 1})),
			new EntitySpawnProjectileAttribute(.1, 100, 1, 1, 2, true),
		]);
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'turret.png');
	}
}

export class ResourceDeposit extends Entity {
	readonly resource: Resource;

	constructor(resource: Resource) {
		super();
		this.sprite = SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'resource-deposit.png', [ResourceUtils.color(resource)]);
		this.resource = resource;
		this.attributes.push([new EntityResourceDisplayAttribute(resource)]);
	}

	get resourceTier() {
		switch (this.resource) {
			case Resource.IRON:
			case Resource.FLUX_SAND:
			case Resource.SULPHUR:
				return 0;
			case Resource.TITANIUM:
				return 1;
			case Resource.GRAPHITE:
				return 2;
			case Resource.STEEL:
			case Resource.METAGLASS:
			case Resource.PLASTEEL:
			case Resource.THERMITE:
			case Resource.EXIDIUM:
			case Resource.WATER:
			case Resource.METHANE:
			case Resource.POWER:
			case Resource.COOLANT:
				return -1;
		}
	}
}

export class Mob extends Entity {
	constructor() {
		super();
		this.attributes.push([new EntityMobChaseTargetAttribute(.1, 6)]);
		this.attributes.push([
			new EntityTimedAttribute(30),
			new EntitySpawnProjectileAttribute(.1, 100, 1, 1, 2, false),
		]);
		this.attributes.push([new EntityMobHealthAttribute(10)]);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'circle.png', [Color.MOB_YELLOW]);
	}
}

export class Projectile extends Entity {
	constructor(velocity: Vector, duration: number, range: number, maxTargets: number, damage: number, friendly: boolean) {
		super();
		this.attributes.push([new EntityDirectionMovementAttribute(velocity)]);
		this.attributes.push([
			new EntityDamageAttribute(range, maxTargets, damage, friendly),
			new EntityExpireProjectileAttribute(),
		]);
		this.attributes.push([
			new EntityTimedAttribute(duration),
			new EntityExpireProjectileAttribute(),
		]);
	}

	static get sprite() {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'circle.png', [Color.PROJECTILE_RED]);
	}
}

// todo allow boosting entities with eg water
