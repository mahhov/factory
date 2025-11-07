import {Container, Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import {generatedTextures} from '../graphics/generatedTextures.js';
import SpriteLoader from '../graphics/SpriteLoader.js';
import TextLine from '../ui/TextLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityAttribute,
	EntityBuildableAttribute,
	EntityConductAttribute,
	EntityConsumeAttribute,
	EntityContainerAttribute,
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityDamageAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityExtractorAttribute,
	EntityHasAnyOfResourceAttribute,
	EntityHealthAttribute,
	EntityInflowAttribute,
	EntityJunctionTransportAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidContainerAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidExtractorAttribute,
	EntityMobChaseTargetAttribute,
	EntityMobHealthAttribute,
	EntityOutflowAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerStorageAttribute,
	EntityProduceAttribute,
	EntityProducePowerAttribute,
	EntityResourceDisplayAttribute,
	EntityResourceFullSpriteAttribute,
	EntityResourcePickerAttribute,
	EntitySourceAttribute,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	EntityTransportAttribute,
} from './EntityAttribute.js';
import {Resource, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, Tileable, World} from './World.js';

export let getMaterialResourceCounts = (count: number): ResourceUtils.Count[] =>
	util.arr(Resource.WATER).map((resource: Resource) => new ResourceUtils.Count(resource, count));

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
		return this.attributes.flat().find(attribute => attribute.constructor === attributeClass) as T;
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

export class Building extends Entity {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rotation: Rotation = Rotation.RIGHT) {
		super(size, rotation);
		this.attributes.push([new EntityBuildableAttribute(buildTime, buildCost)]);
		this.attributes.push([new EntityHealthAttribute(health)]);
	}

	tick(world: World, tile: Tile<Entity>) {
		if (this.getAttribute(EntityBuildableAttribute)!.doneBuilding)
			super.tick(world, tile);
		else {
			this.attributes.slice(0, 2)
				.filter(attributeChain => attributeChain.every(attribute => attribute.tick(world, tile)))
				.forEach(attributeChain => attributeChain.forEach(attribute => attribute.reset()));
		}
	}
}

export class Wall extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number) {
		super(size, buildTime, buildCost, health);
	}

	static get sprite() {
		return new Sprite(generatedTextures.wallIron.texture);
	}
}

export class Extractor extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, heatOutput: number, outputPerTier: number[]) {
		super(size, buildTime, buildCost, health);
		let containerAttribute = new EntityContainerAttribute(Infinity, getMaterialResourceCounts(10), []);
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			new EntityExtractorAttribute(containerAttribute, outputPerTier),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityOutflowAttribute(containerAttribute, getMaterialResourceCounts(1))]);
		if (powerInput)
			this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.extractorT1.texture);
	}
}

export class Conveyor extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number, rotation: Rotation) {
		super(size, buildTime, buildCost, health, rotation);
		let containerAttribute = new EntityContainerAttribute(1, getMaterialResourceCounts(Infinity), util.enumValues(Rotation).filter(r => r !== RotationUtils.opposite(rotation)));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(containerAttribute, [rotation]),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Conveyor.sprite, resource => Conveyor.spriteFull(resource))]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transConveyorT1.texture);
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'conveyor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Distributor extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number) {
		super(size, buildTime, buildCost, health);
		let containerAttribute = new EntityContainerAttribute(1, getMaterialResourceCounts(Infinity));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(containerAttribute, util.enumValues(Rotation)),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Distributor.sprite, resource => Distributor.spriteFull(resource))]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transDistributor.texture);
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'distributor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Junction extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number) {
		super(size, buildTime, buildCost, health);
		let containerAttribute = new EntityContainerAttribute(1, getMaterialResourceCounts(Infinity));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityJunctionTransportAttribute(containerAttribute),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Junction.sprite, resource => Junction.spriteFull(resource))]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transJunction.texture);
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'junction-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Factory extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, materialInput: ResourceUtils.Count[], powerInput: number, heatOutput: number, materialOutput: ResourceUtils.Count) {
		super(size, buildTime, buildCost, health);
		let containerAttribute = new EntityContainerAttribute(Infinity, materialInput.concat(materialOutput).map(resourceCount => new ResourceUtils.Count(resourceCount.resource, 10)));
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			new EntityConsumeAttribute(containerAttribute, materialInput),
			new EntityProduceAttribute(containerAttribute, [materialOutput]),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityOutflowAttribute(containerAttribute, [materialOutput])]);
		if (powerInput)
			this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.factorySteel.texture);
	}
}

export class Generator extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, materialInput: ResourceUtils.Count[], powerInput: number, heatOutput: number, powerOutput: number) {
		super(size, buildTime, buildCost, health);
		let containerAttribute;
		if (materialInput.length) {
			containerAttribute = new EntityContainerAttribute(Infinity, materialInput.map(resourceCount => new ResourceUtils.Count(resourceCount.resource, 10)));
			this.attributes.push([containerAttribute]);
		}
		let powerStorageAttribute = new EntityPowerStorageAttribute(powerOutput * 40, 0);
		this.attributes.push([powerStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			containerAttribute ? new EntityConsumeAttribute(containerAttribute, materialInput) : null,
			new EntityProducePowerAttribute(powerStorageAttribute, powerOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.genMethane.texture);
	}
}

export class Vent extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, liquidInput: ResourceUtils.Count, powerInput: number, coolantOutput: number) {
		super(size, buildTime, buildCost, health);
		let liquidContainerAttribute;
		if (liquidInput) {
			liquidContainerAttribute = new EntityLiquidContainerAttribute([liquidInput.resource], 200 * 40);
			this.attributes.push([liquidContainerAttribute]);
		}
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			liquidContainerAttribute ? new EntityLiquidConsumeAttribute(liquidContainerAttribute, liquidInput) : null,
			new EntityCoolantProduceAttribute(coolantOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.ventAir.texture);
	}
}

export class Pump extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, liquidOutput: number) {
		super(size, buildTime, buildCost, health);
		let liquidContainerAttribute = new EntityLiquidContainerAttribute([Resource.WATER, Resource.METHANE], liquidOutput);
		this.attributes.push([liquidContainerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			new EntityLiquidExtractorAttribute(liquidContainerAttribute, liquidOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.pumpBase.texture);
	}
}

export class Well extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, liquidOutput: ResourceUtils.Count) {
		super(size, buildTime, buildCost, health);
		let liquidContainerAttribute = new EntityLiquidContainerAttribute([liquidOutput.resource], liquidOutput.quantity);
		this.attributes.push([liquidContainerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			new EntityLiquidDryExtractorAttribute(liquidContainerAttribute, new ResourceUtils.Count(liquidOutput.resource, liquidOutput.quantity * 40)),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.pumpWell.texture);
	}
}

export class Storage extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, capacity: number) {
		super(size, buildTime, buildCost, health);
		let containerAttribute = new EntityContainerAttribute(capacity, getMaterialResourceCounts(Infinity));
		this.attributes.push([containerAttribute]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.storageMat.texture);
	}
}

export class Dispenser extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number, rotation: Rotation) {
		super(size, buildTime, buildCost, health);
		let containerAttribute = new EntityContainerAttribute(1, getMaterialResourceCounts(Infinity), []);
		this.attributes.push([containerAttribute]);
		let resourcePickerAttribute = new EntityResourcePickerAttribute();
		this.attributes.push([resourcePickerAttribute]);
		this.attributes.push([new EntityInflowAttribute(resourcePickerAttribute, containerAttribute, [rotation])]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(containerAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(containerAttribute, [rotation]),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(containerAttribute, Dispenser.sprite, resource => Dispenser.sprite)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.storageDispense.texture);
	}
}

export class Conductor extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, range: number) {
		super(size, buildTime, buildCost, health);
		this.attributes.push([new EntityConductAttribute(range)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transConductor.texture);
	}
}

export class Battery extends Building {
	constructor(size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, capacity: number) {
		super(size, buildTime, buildCost, health);
		let powerLargeStorageAttribute = new EntityPowerStorageAttribute(capacity * 40, 1);
		this.attributes.push([powerLargeStorageAttribute]);
		this.attributes.push([new EntityConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.storageBatt.texture);
	}
}

export class Source extends Entity {
	constructor() {
		super();
		let resourcePickerAttribute = new EntityResourcePickerAttribute();
		this.attributes.push([resourcePickerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			new EntitySourceAttribute(resourcePickerAttribute),
		]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'source.png', [Color.ENTITY_SOURCE]);}
}

export class Void extends Entity {
	constructor() {
		super();
		this.attributes.push([new EntityContainerAttribute(Infinity, getMaterialResourceCounts(Infinity))]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'void.png', [Color.ENTITY_VOID]);}
}

export class Turret extends Entity {
	constructor() {
		super(new Vector(2));
		let containerAttribute = new EntityContainerAttribute(Infinity, [new ResourceUtils.Count(Resource.IRON, 10)]);
		this.attributes.push([containerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(30),
			new EntityConsumeAttribute(containerAttribute, [new ResourceUtils.Count(Resource.IRON, 1)]),
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

	get materialResourceTier() {
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
// todo sort
