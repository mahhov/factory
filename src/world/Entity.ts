import {AnimatedSprite, Container, Sprite} from 'pixi.js';
import {animatedGeneratedTextures} from '../graphics/generatedTextures.js';
import SpriteLoader from '../graphics/SpriteLoader.js';
import TextLine from '../ui/TextLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityActiveSpriteAttribute,
	EntityAttribute,
	EntityBuildableAttribute,
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityDamageAttribute,
	EntityDescriptionAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityHealthAttribute,
	EntityInflowAttribute,
	EntityJunctionTransportAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidDisplayAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidExtractorAttribute,
	EntityLiquidStorageAttribute,
	EntityLiquidTransportAttribute,
	EntityMaterialConsumeAttribute,
	EntityMaterialDisplayAttribute,
	EntityMaterialExtractorAttribute,
	EntityMaterialFullSpriteAttribute,
	EntityMaterialPickerAttribute,
	EntityMaterialProduceAttribute,
	EntityMaterialSourceAttribute,
	EntityMaterialStorageAttribute,
	EntityMobChaseTargetAttribute,
	EntityMobHealthAttribute,
	EntityNameAttribute,
	EntityNonEmptyLiquidStorage,
	EntityNonEmptyMaterialStorage,
	EntityOutflowAttribute,
	EntityPowerConductAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerProduceAttribute,
	EntityPowerStorageAttribute,
	EntityPowerStorageAttributePriority,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	EntityTransportAttribute,
	TooltipType,
} from './EntityAttribute.js';
import {Liquid, Material, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, Tileable, World} from './World.js';

export let getMaterialCounts = (count: number): ResourceUtils.Count<Material>[] =>
	util.enumValues(Material).map(material => new ResourceUtils.Count(material, count));

export class Entity implements Tileable {
	readonly size: Vector;
	protected readonly rotation: Rotation;
	protected readonly attributes: EntityAttribute[][] = [];
	readonly container = new Container();

	constructor(name: string, description: string, size: Vector = Vector.V1, rotation: Rotation = Rotation.UP) {
		this.size = size;
		this.rotation = rotation;
		if (name) {
			this.attributes.push([new EntityNameAttribute(name)]);
			let spriteName = util.titleCaseToCamelCase(name);
			if (spriteName in animatedGeneratedTextures) {
				let animatedSprite = new AnimatedSprite(animatedGeneratedTextures[spriteName as keyof typeof animatedGeneratedTextures]);
				this.setSprite(animatedSprite);
			}
		}
		if (description)
			this.attributes.push([new EntityDescriptionAttribute(description)]);
	}

	setSprite(sprite: Sprite) {
		console.assert(!this.container.children.length);
		let halfSize = new Vector(sprite.width, sprite.height).scale(new Vector(.5));
		sprite.pivot = halfSize;
		sprite.position = halfSize;
		sprite.rotation = this.rotation * Math.PI / 2;
		this.container.addChild(sprite);
	}

	addOverlaySprite(sprite: Sprite | null) {
		if (this.container.children.length > 1)
			this.container.removeChildAt(1);
		if (sprite)
			this.container.addChild(sprite);
	}

	getAttribute<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T | undefined {
		return this.attributes.flat().find(attribute => attribute.constructor === attributeClass) as T;
	}

	tick(world: World, tile: Tile<Entity>) {
		this.attributes
			.filter(attributeChain => attributeChain.every(attribute => attribute.tick(world, tile)))
			.forEach(attributeChain => attributeChain.forEach(attribute => attribute.reset()));
	}

	tooltip(type: TooltipType): TextLine[] {
		return this.attributes.flat().flatMap(attribute => attribute.tooltip(type));
	}

	get selectable(): boolean {
		return this.attributes.flat().some(attribute => attribute.selectable);
	}
}

export class Empty extends Entity {
	constructor() {
		super('', '');
	}
}

export abstract class Building extends Entity {
	protected constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rotation: Rotation = Rotation.UP) {
		super(name, description, size, rotation);
		this.attributes.push([new EntityBuildableAttribute(buildTime, buildCost)]);
		this.attributes.push([new EntityHealthAttribute(health)]);
	}

	tick(world: World, tile: Tile<Entity>) {
		let buildableAttribute = this.getAttribute(EntityBuildableAttribute)!;
		if (buildableAttribute.doneBuilding)
			super.tick(world, tile);
		else {
			buildableAttribute.reset();
			buildableAttribute.tick(world, tile);
		}
	}
}

export class Wall extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number) {
		super(name, description, size, buildTime, buildCost, health);
	}
}

export class Extractor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, powerInput: number, heatOutput: number, outputPerTier: number[]) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, getMaterialCounts(10), [], false);
		this.attributes.push([materialStorageAttribute]);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput * 400, EntityPowerStorageAttributePriority.CONSUME);
			this.attributes.push([powerStorageAttribute]);
		}
		let timedAttribute = new EntityTimedAttribute(400);
		this.attributes.push([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput * 400) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 400) : null,
			timedAttribute,
			new EntityMaterialExtractorAttribute(materialStorageAttribute, outputPerTier),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityOutflowAttribute(materialStorageAttribute, getMaterialCounts(1))]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Conveyor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialCounts(Infinity), RotationUtils.except(RotationUtils.opposite(rotation)), true);
		this.attributes.push([materialStorageAttribute]);
		let timedAttribute = new EntityTimedAttribute(40 / rate);
		this.attributes.push([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			timedAttribute,
			new EntityTransportAttribute(materialStorageAttribute, [rotation]),
		]);
		this.attributes.push([new EntityMaterialFullSpriteAttribute(materialStorageAttribute, timedAttribute, rotation)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Distributor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialCounts(Infinity), util.enumValues(Rotation), true);
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			new EntityTimedAttribute(40 / rate),
			new EntityTransportAttribute(materialStorageAttribute, util.enumValues(Rotation)),
		]);
	}
}

export class Junction extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialCounts(Infinity), util.enumValues(Rotation), true);
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			new EntityTimedAttribute(40 / rate),
			new EntityJunctionTransportAttribute(materialStorageAttribute),
		]);
	}
}

export class Factory extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, materialInput: ResourceUtils.Count<Material>[], powerInput: number, heatOutput: number, materialOutput: ResourceUtils.Count<Material>) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, materialInput.concat(materialOutput).map(materialCount => new ResourceUtils.Count(materialCount.resource, 10)), util.enumValues(Rotation), false);
		this.attributes.push([materialStorageAttribute]);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput * 40, EntityPowerStorageAttributePriority.CONSUME);
			this.attributes.push([powerStorageAttribute]);
		}
		let timedAttribute = new EntityTimedAttribute(40);
		this.attributes.push([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			new EntityMaterialConsumeAttribute(materialStorageAttribute, materialInput),
			timedAttribute,
			new EntityMaterialProduceAttribute(materialStorageAttribute, [materialOutput]),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityOutflowAttribute(materialStorageAttribute, [materialOutput])]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Storage extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, getMaterialCounts(capacity), util.enumValues(Rotation), true);
		this.attributes.push([materialStorageAttribute]);
	}
}

export class Dispenser extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(1, getMaterialCounts(Infinity), [], true);
		this.attributes.push([materialStorageAttribute]);
		let materialPickerAttribute = new EntityMaterialPickerAttribute();
		this.attributes.push([materialPickerAttribute]);
		this.attributes.push([new EntityInflowAttribute(materialPickerAttribute, materialStorageAttribute, [rotation])]);
		let timedAttribute = new EntityTimedAttribute(40 / rate);
		this.attributes.push([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			timedAttribute,
			new EntityTransportAttribute(materialStorageAttribute, [rotation]),
		]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Generator extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, materialInput: ResourceUtils.Count<Material>[], powerInput: number, heatOutput: number, powerOutput: number) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute;
		if (materialInput.length) {
			materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, materialInput.map(materialCount => new ResourceUtils.Count(materialCount.resource, 10)), util.enumValues(Rotation), false);
			this.attributes.push([materialStorageAttribute]);
		}
		let inputPowerStorageAttribute;
		if (powerInput) {
			inputPowerStorageAttribute = new EntityPowerStorageAttribute(powerInput * 40, EntityPowerStorageAttributePriority.CONSUME);
			this.attributes.push([inputPowerStorageAttribute]);
		}
		let outputPowerStorageAttribute = new EntityPowerStorageAttribute(powerOutput * 40, EntityPowerStorageAttributePriority.PRODUCE);
		this.attributes.push([outputPowerStorageAttribute]);
		let timedAttribute = new EntityTimedAttribute(40);
		this.attributes.push([
			inputPowerStorageAttribute ? new EntityPowerConsumeAttribute(inputPowerStorageAttribute, powerInput * 40) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput * 40) : null,
			materialStorageAttribute ? new EntityMaterialConsumeAttribute(materialStorageAttribute, materialInput) : null,
			timedAttribute,
			new EntityPowerProduceAttribute(outputPowerStorageAttribute, powerOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([new EntityPowerConductAttribute(0)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Conductor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, range: number) {
		super(name, description, size, buildTime, buildCost, health);
		this.attributes.push([new EntityPowerConductAttribute(range)]);
	}
}

export class Battery extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		this.attributes.push([new EntityPowerStorageAttribute(capacity * 40, EntityPowerStorageAttributePriority.STORAGE)]);
		this.attributes.push([new EntityPowerConductAttribute(0)]);
	}
}

export class Vent extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, liquidInput: ResourceUtils.Count<Liquid>, powerInput: number, coolantOutput: number) {
		super(name, description, size, buildTime, buildCost, health);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput * 40, EntityPowerStorageAttributePriority.CONSUME);
			this.attributes.push([powerStorageAttribute]);
		}
		let liquidStorageAttribute;
		if (liquidInput) {
			liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidInput.resource], 200 * 40, util.enumValues(Rotation));
			this.attributes.push([liquidStorageAttribute]);
		}
		let timedAttribute = new EntityTimedAttribute(40);
		this.attributes.push([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput * 40) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, liquidInput) : null,
			timedAttribute,
			new EntityCoolantProduceAttribute(coolantOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

// todo restrict pump to water only
export class Pump extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, powerInput: number, liquidOutput: number) {
		super(name, description, size, buildTime, buildCost, health);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput * 40, EntityPowerStorageAttributePriority.CONSUME);
			this.attributes.push([powerStorageAttribute]);
		}
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), liquidOutput, []);
		this.attributes.push([liquidStorageAttribute]);
		let timedAttribute = new EntityTimedAttribute(40);
		this.attributes.push([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput * 40) : null,
			timedAttribute,
			new EntityLiquidExtractorAttribute(liquidStorageAttribute, liquidOutput * 40),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Well extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, powerInput: number, liquidOutput: ResourceUtils.Count<Liquid>) {
		super(name, description, size, buildTime, buildCost, health);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput * 40, EntityPowerStorageAttributePriority.CONSUME);
			this.attributes.push([powerStorageAttribute]);
		}
		let liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidOutput.resource], liquidOutput.quantity, []);
		this.attributes.push([liquidStorageAttribute]);
		let timedAttribute = new EntityTimedAttribute(40);
		this.attributes.push([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput * 40) : null,
			timedAttribute,
			new EntityLiquidDryExtractorAttribute(liquidStorageAttribute, new ResourceUtils.Count(liquidOutput.resource, liquidOutput.quantity * 40)),
		].filter(v => v) as EntityAttribute[]);
		this.attributes.push([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]);
		if (powerInput)
			this.attributes.push([new EntityPowerConductAttribute(0)]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

export class Pipe extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, RotationUtils.except(RotationUtils.opposite(rotation)));
		this.attributes.push([liquidStorageAttribute]);
		let timedAttribute = new EntityTimedAttribute(40);
		this.attributes.push([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			timedAttribute,
			new EntityLiquidTransportAttribute(liquidStorageAttribute, [rotation]),
		]);
		this.attributes.push([new EntityActiveSpriteAttribute(this.container.children[0] as AnimatedSprite, timedAttribute)]);
	}
}

// todo PipeDistributor not working
export class PipeDistributor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		util.enumValues(Rotation).forEach(rotation => {
			let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, [rotation]);
			this.attributes.push([liquidStorageAttribute]);
			this.attributes.push([
				new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
				new EntityTimedAttribute(40),
				new EntityLiquidTransportAttribute(liquidStorageAttribute, RotationUtils.except(RotationUtils.opposite(rotation))),
			]);
		});
	}
}

// todo PipeJunction not working
export class PipeJunction extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		util.enumValues(Rotation).forEach(rotation => {
			let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, [rotation]);
			this.attributes.push([liquidStorageAttribute]);
			this.attributes.push([
				new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
				new EntityTimedAttribute(40),
				new EntityLiquidTransportAttribute(liquidStorageAttribute, [rotation]),
			]);
		});
	}
}

export class Tank extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, util.enumValues(Rotation));
		this.attributes.push([liquidStorageAttribute]);
		this.attributes.push([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityTimedAttribute(40),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]);
	}
}

export class Turret extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, attackRate: number, damage: number, materialInput: number, accuracy: number, range: number, projectileSpeed: number) {
		super(name, description, size, buildTime, buildCost, health);

		// todo
		//   attackRate
		//   damage
		//   materialInput
		//   accuracy
		//   range
		//   projectileSpeed

		let materialStorageAttribute = new EntityMaterialStorageAttribute(Infinity, [new ResourceUtils.Count(Material.IRON, 10)], util.enumValues(Rotation), false);
		this.attributes.push([materialStorageAttribute]);
		this.attributes.push([
			new EntityMaterialConsumeAttribute(materialStorageAttribute, [new ResourceUtils.Count(Material.IRON, 1)]),
			new EntityTimedAttribute(30),
			new EntitySpawnProjectileAttribute(.1, 100, 1, 1, 2, true),
		]);
	}
}

export class Source extends Entity {
	constructor() {
		super('Source', '');
		let materialPickerAttribute = new EntityMaterialPickerAttribute();
		this.attributes.push([materialPickerAttribute]);
		this.attributes.push([
			new EntityTimedAttribute(40),
			new EntityMaterialSourceAttribute(materialPickerAttribute),
		]);
	}

}

export class Void extends Entity {
	constructor() {
		super('Void', '');
		this.attributes.push([new EntityMaterialStorageAttribute(Infinity, getMaterialCounts(Infinity), util.enumValues(Rotation), false)]);
	}

}

export class MaterialDeposit extends Entity {
	readonly material: Material;

	constructor(material: Material) {
		super('', '');
		this.setSprite(SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'resource-deposit.png', [ResourceUtils.materialColor(material)]));
		this.material = material;
		this.attributes.push([new EntityMaterialDisplayAttribute(material)]);
	}

	get materialTier(): number {
		switch (this.material) {
			case Material.IRON:
			case Material.FLUX_SAND:
			case Material.SULPHUR:
				return 0;
			case Material.TITANIUM:
				return 1;
			case Material.GRAPHITE:
				return 2;
			case Material.STEEL:
			case Material.METAGLASS:
			case Material.PLASTEEL:
			case Material.THERMITE:
			case Material.EXIDIUM:
				return -1;
		}
	}
}

export class LiquidDeposit extends Entity {
	readonly liquid: Liquid;

	constructor(liquid: Liquid) {
		super('', '');
		this.setSprite(SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'resource-deposit.png', [ResourceUtils.liquidColor(liquid)]));
		this.liquid = liquid;
		this.attributes.push([new EntityLiquidDisplayAttribute(liquid)]);
	}
}

export class Mob extends Entity {
	constructor() {
		super('Low Tier Mob', '');
		this.attributes.push([new EntityMobChaseTargetAttribute(.1, 6)]);
		this.attributes.push([
			new EntityTimedAttribute(30),
			new EntitySpawnProjectileAttribute(.1, 100, 1, 1, 2, false),
		]);
		this.attributes.push([new EntityMobHealthAttribute(10)]);
	}
}

export class Projectile extends Entity {
	constructor(velocity: Vector, duration: number, range: number, maxTargets: number, damage: number, friendly: boolean) {
		super('', '');
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
}

// todo allow boosting entities with eg water
