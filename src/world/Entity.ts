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
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityDamageAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityHasAnyOfResourceAttribute,
	EntityHealthAttribute,
	EntityInflowAttribute,
	EntityJunctionTransportAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidExtractorAttribute,
	EntityLiquidStorageAttribute,
	EntityMaterialConsumeAttribute,
	EntityMaterialExtractorAttribute,
	EntityMaterialProduceAttribute,
	EntityMaterialSourceAttribute,
	EntityMaterialStorageAttribute,
	EntityMobChaseTargetAttribute,
	EntityMobHealthAttribute,
	EntityNameAttribute,
	EntityOutflowAttribute,
	EntityPowerConductAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerProduceAttribute,
	EntityPowerStorageAttribute,
	EntityResourceDisplayAttribute,
	EntityResourceFullSpriteAttribute,
	EntityResourcePickerAttribute,
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

	constructor(name: string, size: Vector = Vector.V1, rotation: Rotation = Rotation.RIGHT) {
		this.size = size;
		this.rotation = rotation;
		let sprite = (this.constructor as typeof Entity).sprite;
		if (sprite)
			this.sprite = sprite;
		if (name)
			this.attributes.push([new EntityNameAttribute(name)]);
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
		super('');
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'square.png', [Color.ENTITY_EMPTY]);}
}

export class Building extends Entity {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rotation: Rotation = Rotation.RIGHT) {
		super(name, size, rotation);
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
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number) {
		super(name, size, buildTime, buildCost, health);
	}

	static get sprite() {
		return new Sprite(generatedTextures.wallIron.texture);
	}
}

export class Extractor extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, heatOutput: number, outputPerTier: number[]) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, getMaterialResourceCounts(10), []);
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			new EntityMaterialExtractorAttribute(materialStorageAttribute, outputPerTier),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityOutflowAttribute(materialStorageAttribute, getMaterialResourceCounts(1))]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.extractorT1.texture);
	}
}

export class Conveyor extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number, rotation: Rotation) {
		super(name, size, buildTime, buildCost, health, rotation);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialResourceCounts(Infinity), util.enumValues(Rotation).filter(r => r !== RotationUtils.opposite(rotation)));
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(materialStorageAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(materialStorageAttribute, [rotation]),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(materialStorageAttribute, Conveyor.sprite, resource => Conveyor.spriteFull(resource))]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transConveyorT1.texture);
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'conveyor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Distributor extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialResourceCounts(Infinity));
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(materialStorageAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(materialStorageAttribute, util.enumValues(Rotation)),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(materialStorageAttribute, Distributor.sprite, resource => Distributor.spriteFull(resource))]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transDistributor.texture);
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'distributor-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Junction extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialResourceCounts(Infinity));
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(materialStorageAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityJunctionTransportAttribute(materialStorageAttribute),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(materialStorageAttribute, Junction.sprite, resource => Junction.spriteFull(resource))]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transJunction.texture);
	}

	static spriteFull(resource: Resource) {
		return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'junction-full.png', [ResourceUtils.color(resource)]);
	}
}

export class Factory extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, materialInput: ResourceUtils.Count[], powerInput: number, heatOutput: number, materialOutput: ResourceUtils.Count) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, materialInput.concat(materialOutput).map(resourceCount => new ResourceUtils.Count(resourceCount.resource, 10)));
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			new EntityMaterialConsumeAttribute(materialStorageAttribute, materialInput),
			new EntityMaterialProduceAttribute(materialStorageAttribute, [materialOutput]),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityOutflowAttribute(materialStorageAttribute, [materialOutput])]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.factorySteel.texture);
	}
}

export class Storage extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, capacity: number) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(capacity, getMaterialResourceCounts(Infinity));
		this.attributes.push([materialStorageAttribute]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.storageMat.texture);
	}
}

export class Dispenser extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, rate: number, rotation: Rotation) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialResourceCounts(Infinity), []);
		this.attributes.push([materialStorageAttribute]);
		let resourcePickerAttribute = new EntityResourcePickerAttribute();
		this.attributes.push([resourcePickerAttribute]);
		this.attributes.push([new EntityInflowAttribute(resourcePickerAttribute, materialStorageAttribute, [rotation])]);
		this.attributes.push([
			new EntityHasAnyOfResourceAttribute(materialStorageAttribute, getMaterialResourceCounts(1)),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(materialStorageAttribute, [rotation]),
		]);
		this.attributes.push([new EntityResourceFullSpriteAttribute(materialStorageAttribute, Dispenser.sprite, resource => Dispenser.sprite)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.storageDispense.texture);
	}
}

export class Generator extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, materialInput: ResourceUtils.Count[], powerInput: number, heatOutput: number, powerOutput: number) {
		super(name, size, buildTime, buildCost, health);
		let materialStorageAttribute;
		if (materialInput.length) {
			materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, materialInput.map(resourceCount => new ResourceUtils.Count(resourceCount.resource, 10)));
			this.attributes.push([materialStorageAttribute]);
		}
		let powerStorageAttribute = new EntityPowerStorageAttribute(powerOutput * 40, 0);
		this.attributes.push([powerStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			materialStorageAttribute ? new EntityMaterialConsumeAttribute(materialStorageAttribute, materialInput) : null,
			new EntityPowerProduceAttribute(powerStorageAttribute, powerOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.genMethane.texture);
	}
}

export class Conductor extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, range: number) {
		super(name, size, buildTime, buildCost, health);
		this.attributes.push([new EntityPowerConductAttribute(range)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.transConductor.texture);
	}
}

export class Battery extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, capacity: number) {
		super(name, size, buildTime, buildCost, health);
		let powerStorageAttribute = new EntityPowerStorageAttribute(capacity * 40, 1);
		this.attributes.push([powerStorageAttribute]);
		this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.storageBatt.texture);
	}
}

export class Vent extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, liquidInput: ResourceUtils.Count, powerInput: number, coolantOutput: number) {
		super(name, size, buildTime, buildCost, health);
		let liquidStorageAttribute;
		if (liquidInput) {
			liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidInput.resource], 200 * 40);
			this.attributes.push([liquidStorageAttribute]);
		}
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, liquidInput) : null,
			new EntityCoolantProduceAttribute(coolantOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.ventAir.texture);
	}
}

export class Pump extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, liquidOutput: number) {
		super(name, size, buildTime, buildCost, health);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute([Resource.WATER, Resource.METHANE], liquidOutput);
		this.attributes.push([liquidStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			new EntityLiquidExtractorAttribute(liquidStorageAttribute, liquidOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.pumpBase.texture);
	}
}

export class Well extends Building {
	constructor(name: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count[], health: number, powerInput: number, liquidOutput: ResourceUtils.Count) {
		super(name, size, buildTime, buildCost, health);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidOutput.resource], liquidOutput.quantity);
		this.attributes.push([liquidStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			powerInput ? new EntityPowerConsumeAttribute(powerInput * 40) : null,
			new EntityLiquidDryExtractorAttribute(liquidStorageAttribute, new ResourceUtils.Count(liquidOutput.resource, liquidOutput.quantity * 40)),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
	}

	static get sprite() {
		return new Sprite(generatedTextures.pumpWell.texture);
	}
}

export class Turret extends Entity {
	constructor() {
		super('Turret', new Vector(2));
		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, [new ResourceUtils.Count(Resource.IRON, 10)]);
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(30),
			new EntityMaterialConsumeAttribute(materialStorageAttribute, [new ResourceUtils.Count(Resource.IRON, 1)]),
			new EntitySpawnProjectileAttribute(.1, 100, 1, 1, 2, true),
		]);
	}

	static get sprite() {
		return SpriteLoader.getSprite(SpriteLoader.Resource.TERRAIN, 'turret.png');
	}
}

export class Source extends Entity {
	constructor() {
		super('Source');
		let resourcePickerAttribute = new EntityResourcePickerAttribute();
		this.attributes.push([resourcePickerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			new EntityMaterialSourceAttribute(resourcePickerAttribute),
		]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'source.png', [Color.ENTITY_SOURCE]);}
}

export class Void extends Entity {
	constructor() {
		super('Void');
		this.attributes.push([new EntityMaterialStorageAttribute(Infinity, getMaterialResourceCounts(Infinity))]);
	}

	static get sprite() {return SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'void.png', [Color.ENTITY_VOID]);}
}

export class ResourceDeposit extends Entity {
	readonly resource: Resource;

	constructor(resource: Resource) {
		super('');
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
		super('');
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
		super('');
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
