import {AnimatedSprite, Container, Particle, Sprite} from 'pixi.js';
import Color from '../graphics/Color.js';
import {animatedGeneratedTextures, coloredGeneratedTextures} from '../graphics/generatedTextures.js';
import SpriteLoader from '../graphics/SpriteLoader.js';
import TextLine from '../ui/TextLine.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityActiveSpriteAttribute,
	EntityAttribute,
	EntityBuildableAttribute,
	EntityChainAttribute,
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityDamageAttribute,
	EntityDescriptionAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityFindTargetAttribute,
	EntityHealthAttribute,
	EntityIfElseAttribute,
	EntityInflowAttribute,
	EntityLiquidBridgeConnectAttribute,
	EntityLiquidBridgeTransportAttribute,
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
	EntityMaterialStorageAttribute,
	EntityMaterialStorageAttributeType,
	EntityMobHealthAttribute,
	EntityMobHerdPositionActivateAttribute,
	EntityMobHerdPositionAttribute,
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
	TickResult,
	TooltipType,
} from './EntityAttribute.js';
import {Liquid, Material, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, Tileable, World} from './World.js';

export let getMaterialCounts = (count: number): ResourceUtils.Count<Material>[] =>
	util.enumValues(Material).map(material => new ResourceUtils.Count(material, count));

export class Entity implements Tileable {
	readonly name: string;
	readonly size: Vector;
	readonly tilingSize: Vector;
	readonly rotation: Rotation;
	private readonly attributes: EntityAttribute[] = [];
	private readonly attributesMap: Record<string, EntityAttribute[]> = {};
	container: Container | null = null;
	particle: Particle | null = null;

	constructor(name: string, description: string, size: Vector = Vector.V1, rotation: Rotation = Rotation.UP, tilingSize: Vector = size) {
		console.assert(!!name);
		this.name = name;
		this.size = size;
		this.tilingSize = tilingSize;
		this.rotation = rotation;

		this.addAttribute(new EntityNameAttribute(name));
		if (description)
			this.addAttribute(new EntityDescriptionAttribute(description));
		let spriteName = util.titleCaseToCamelCase(name);
		if (spriteName in animatedGeneratedTextures)
			this.setSprite(new AnimatedSprite(animatedGeneratedTextures[spriteName as keyof typeof animatedGeneratedTextures]));
	}

	static rotateSprite(sprite: Sprite, rotation: Rotation) {
		let halfSize = new Vector(sprite.width, sprite.height).scale(.5);
		sprite.pivot = halfSize;
		sprite.position = halfSize;
		sprite.angle = rotation * 90;
	}

	addAttribute(attribute: EntityAttribute) {
		this.attributes.push(attribute);
		this.addAttributeToMap(attribute);
	}

	private addAttributeToMap(attribute: EntityAttribute) {
		let key = attribute.constructor.name;
		this.attributesMap[key] ||= [];
		this.attributesMap[key].push(attribute);
		attribute.childAttributes.forEach(childAttribute => this.addAttributeToMap(childAttribute));
	}

	getAttribute<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T | null {
		return this.attributesMap[attributeClass.name]?.[0] as T || null;
	}

	getAttributes<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T[] {
		return this.attributesMap[attributeClass.name] as T[] || [];
	}

	setSprite(sprite: Sprite) {
		console.assert(!this.container);
		this.container = new Container();
		Entity.rotateSprite(sprite, this.rotation);
		this.container.addChild(sprite);
	}

	setParticle(particle: Particle, size: Vector = this.size) {
		console.assert(!this.particle);
		this.particle = particle;
		this.particle.scaleX = size.x / particle.texture.width;
		this.particle.scaleY = size.y / particle.texture.height;
	}

	addOverlaySprites(label: string, sprites: Sprite[]) {
		this.container!.getChildrenByLabel(label).forEach(child => child.removeFromParent());
		sprites.forEach(sprite => {
			sprite.label = label;
			this.container!.addChild(sprite);
		});
	}

	tooltip(type: TooltipType): TextLine[] {
		return this.attributes.flatMap(attribute => attribute.tooltip(type));
	}

	get selectable(): boolean {
		return this.attributes.some(attribute => attribute.selectable);
	}

	tick(world: World, tile: Tile<Entity>) {
		for (let attribute of this.attributes) {
			attribute.tick(world, tile);
			if (attribute.tickResult === TickResult.END_TICK) {
				attribute.tickResult = TickResult.NOT_DONE;
				return;
			}
		}
	}
}

export class Empty extends Entity {
	constructor() {
		super('Empty', '');
	}

	getAttribute<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T | null {
		return null;
	}

	getAttributes<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T[] {
		return [];
	}

	tooltip(type: TooltipType): TextLine[] {
		return [];
	}

	get selectable(): boolean {
		return false;
	}

	tick(world: World, tile: Tile<Entity>) {}
}

export class Clear extends Entity {
	constructor() {
		super('Clear', '');
	}
}

export abstract class Building extends Entity {
	protected constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rotation: Rotation = Rotation.UP, tilingSize: Vector = size) {
		super(name, description, size, rotation, tilingSize);
		this.addAttribute(new EntityBuildableAttribute(buildTime, buildCost));
		this.addAttribute(new EntityHealthAttribute(health));
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
		let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(10), [], true);
		this.addAttribute(materialStorageAttribute);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput, EntityPowerStorageAttributePriority.CONSUME);
			this.addAttribute(powerStorageAttribute);
		}
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput) : null,
			timedAttribute,
			new EntityMaterialExtractorAttribute(materialStorageAttribute, outputPerTier),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityOutflowAttribute(materialStorageAttribute));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Conveyor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number, packed: boolean, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let type = packed ? EntityMaterialStorageAttributeType.PACKED : EntityMaterialStorageAttributeType.NORMAL;
		let materialStorageAttribute = new EntityMaterialStorageAttribute(type, 1, getMaterialCounts(Infinity), RotationUtils.except(RotationUtils.opposite(rotation)), true);
		this.addAttribute(materialStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(40 / rate);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			timedAttribute,
			new EntityTransportAttribute(materialStorageAttribute, [rotation]),
		]));
		this.addAttribute(new EntityMaterialFullSpriteAttribute(materialStorageAttribute, timedAttribute, rotation));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Distributor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number) {
		super(name, description, size, buildTime, buildCost, health);
		util.enumValues(Rotation).forEach(rotation => {
			let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, 1, getMaterialCounts(Infinity), [rotation], true);
			this.addAttribute(materialStorageAttribute);
			this.addAttribute(new EntityChainAttribute([
				new EntityNonEmptyMaterialStorage(materialStorageAttribute),
				new EntityTimedAttribute(40 / rate),
				new EntityTransportAttribute(materialStorageAttribute, RotationUtils.except(RotationUtils.opposite(rotation))),
			]));
		});
	}
}

export class Junction extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number) {
		super(name, description, size, buildTime, buildCost, health);
		util.enumValues(Rotation).forEach(rotation => {
			let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, 1, getMaterialCounts(Infinity), [rotation], true);
			this.addAttribute(materialStorageAttribute);
			this.addAttribute(new EntityChainAttribute([
				new EntityNonEmptyMaterialStorage(materialStorageAttribute),
				new EntityTimedAttribute(40 / rate),
				new EntityTransportAttribute(materialStorageAttribute, [rotation]),
			]));
		});
	}
}

export class Factory extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, materialInput: ResourceUtils.Count<Material>[], powerInput: number, heatOutput: number, materialOutput: ResourceUtils.Count<Material>) {
		super(name, description, size, buildTime, buildCost, health);
		let inputMaterialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, materialInput.map(materialCount => new ResourceUtils.Count(materialCount.resource, 10)), util.enumValues(Rotation), false);
		this.addAttribute(inputMaterialStorageAttribute);
		let outputMaterialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, [new ResourceUtils.Count(materialOutput.resource, 10)], [], true);
		this.addAttribute(outputMaterialStorageAttribute);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput, EntityPowerStorageAttributePriority.CONSUME);
			this.addAttribute(powerStorageAttribute);
		}
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput) : null,
			new EntityMaterialConsumeAttribute(inputMaterialStorageAttribute, materialInput),
			timedAttribute,
			new EntityMaterialProduceAttribute(outputMaterialStorageAttribute, [materialOutput]),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityOutflowAttribute(outputMaterialStorageAttribute));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Storage extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		this.addAttribute(new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(capacity), util.enumValues(Rotation), true));
	}
}

export class Dispenser extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rate: number, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.ANY, 1, getMaterialCounts(Infinity), [], true);
		this.addAttribute(materialStorageAttribute);
		let materialPickerAttribute = new EntityMaterialPickerAttribute();
		this.addAttribute(materialPickerAttribute);
		this.addAttribute(new EntityInflowAttribute(materialPickerAttribute, materialStorageAttribute, [rotation]));
		let timedAttribute = new EntityTimedAttribute(40 / rate);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			timedAttribute,
			new EntityTransportAttribute(materialStorageAttribute, [rotation]),
		]));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Generator extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, materialInput: ResourceUtils.Count<Material>[], powerInput: number, heatOutput: number, liquidInput: ResourceUtils.Count<Liquid> | undefined, powerOutput: number) {
		super(name, description, size, buildTime, buildCost, health);
		let materialStorageAttribute;
		if (materialInput.length) {
			materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, materialInput.map(materialCount => new ResourceUtils.Count(materialCount.resource, 10)), util.enumValues(Rotation), false);
			this.addAttribute(materialStorageAttribute);
		}
		let inputPowerStorageAttribute;
		if (powerInput) {
			inputPowerStorageAttribute = new EntityPowerStorageAttribute(powerInput, EntityPowerStorageAttributePriority.CONSUME);
			this.addAttribute(inputPowerStorageAttribute);
		}
		let liquidStorageAttribute;
		if (liquidInput) {
			liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidInput.resource], liquidInput.quantity, util.enumValues(Rotation));
			this.addAttribute(liquidStorageAttribute);
		}
		let outputPowerStorageAttribute = new EntityPowerStorageAttribute(powerOutput, EntityPowerStorageAttributePriority.PRODUCE);
		this.addAttribute(outputPowerStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			materialStorageAttribute ? new EntityMaterialConsumeAttribute(materialStorageAttribute, materialInput) : null,
			inputPowerStorageAttribute ? new EntityPowerConsumeAttribute(inputPowerStorageAttribute, powerInput) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, liquidInput!) : null,
			timedAttribute,
			new EntityPowerProduceAttribute(outputPowerStorageAttribute, powerOutput),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Conductor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, range: number) {
		super(name, description, size, buildTime, buildCost, health, Rotation.UP, new Vector(range));
		this.addAttribute(new EntityPowerConductAttribute(range));
	}
}

export class Battery extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		this.addAttribute(new EntityPowerStorageAttribute(capacity, EntityPowerStorageAttributePriority.STORAGE));
		this.addAttribute(new EntityPowerConductAttribute(0));
	}
}

export class Vent extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, liquidInput: ResourceUtils.Count<Liquid> | undefined, powerInput: number, coolantOutput: number) {
		super(name, description, size, buildTime, buildCost, health);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput, EntityPowerStorageAttributePriority.CONSUME);
			this.addAttribute(powerStorageAttribute);
		}
		let liquidStorageAttribute;
		if (liquidInput) {
			liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidInput.resource], liquidInput.quantity, util.enumValues(Rotation));
			this.addAttribute(liquidStorageAttribute);
		}
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, liquidInput!) : null,
			timedAttribute,
			new EntityCoolantProduceAttribute(coolantOutput),
		].filter(v => v) as EntityAttribute[]));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Pump extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, powerInput: number, outputPerTier: number[]) {
		super(name, description, size, buildTime, buildCost, health);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput, EntityPowerStorageAttributePriority.CONSUME);
			this.addAttribute(powerStorageAttribute);
		}
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), outputPerTier[0] * size.x * size.y, []);
		this.addAttribute(liquidStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			timedAttribute,
			new EntityLiquidExtractorAttribute(liquidStorageAttribute, outputPerTier),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Well extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, powerInput: number, liquidOutput: ResourceUtils.Count<Liquid>) {
		super(name, description, size, buildTime, buildCost, health);
		let powerStorageAttribute;
		if (powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(powerInput, EntityPowerStorageAttributePriority.CONSUME);
			this.addAttribute(powerStorageAttribute);
		}
		let liquidStorageAttribute = new EntityLiquidStorageAttribute([liquidOutput.resource], liquidOutput.quantity, []);
		this.addAttribute(liquidStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			timedAttribute,
			new EntityLiquidDryExtractorAttribute(liquidStorageAttribute, new ResourceUtils.Count(liquidOutput.resource, liquidOutput.quantity)),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class Pipe extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, RotationUtils.except(RotationUtils.opposite(rotation)));
		this.addAttribute(liquidStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			timedAttribute,
			new EntityLiquidTransportAttribute(liquidStorageAttribute, [rotation]),
		]));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class PipeBridge extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number, rotation: Rotation, range: number) {
		super(name, description, size, buildTime, buildCost, health, rotation, new Vector(range));
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, RotationUtils.except(RotationUtils.opposite(rotation)));
		this.addAttribute(liquidStorageAttribute);
		let liquidBridgeConnectAttribute = new EntityLiquidBridgeConnectAttribute(rotation, range);
		this.addAttribute(liquidBridgeConnectAttribute);
		let timedAttribute = new EntityTimedAttribute(40);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			timedAttribute,
			new EntityLiquidBridgeTransportAttribute(liquidStorageAttribute, liquidBridgeConnectAttribute),
		]));
		this.addAttribute(new EntityActiveSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute));
	}
}

export class PipeDistributor extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		util.enumValues(Rotation).forEach(rotation => {
			let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, [rotation]);
			this.addAttribute(liquidStorageAttribute);
			this.addAttribute(new EntityChainAttribute([
				new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
				new EntityTimedAttribute(40),
				new EntityLiquidTransportAttribute(liquidStorageAttribute, RotationUtils.except(RotationUtils.opposite(rotation))),
			]));
		});
	}
}

export class PipeJunction extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		util.enumValues(Rotation).forEach(rotation => {
			let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, [rotation]);
			this.addAttribute(liquidStorageAttribute);
			this.addAttribute(new EntityChainAttribute([
				new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
				new EntityTimedAttribute(40),
				new EntityLiquidTransportAttribute(liquidStorageAttribute, [rotation]),
			]));
		});
	}
}

export class Tank extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number) {
		super(name, description, size, buildTime, buildCost, health);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, util.enumValues(Rotation));
		this.addAttribute(liquidStorageAttribute);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityTimedAttribute(40),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]));
	}
}

export class Base extends Entity {
	constructor() {
		super('Base', '', new Vector(5));
		this.addAttribute(new EntityHealthAttribute(4000));
		this.addAttribute(new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(util.debug ? 500000 : 500), util.enumValues(Rotation), true));
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
		//   damage range
		//   projectileSpeed
		// todo attack styles
		//   single projectile
		//   3 projectiles
		//   piercing laser
		//   sweeping laser
		//   chaining laser
		//   aoe around projectile
		//   aoe around self
		// todo area damage not working
		// todo area visual

		let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, [new ResourceUtils.Count(Material.IRON, 10)], util.enumValues(Rotation), false);
		this.addAttribute(materialStorageAttribute);
		let findTargetAttribute = new EntityFindTargetAttribute(21, 1, false);
		this.addAttribute(new EntityIfElseAttribute(
			findTargetAttribute,
			new EntityChainAttribute([
				new EntityMaterialConsumeAttribute(materialStorageAttribute, [new ResourceUtils.Count(Material.IRON, 1)]),
				new EntitySpawnProjectileAttribute(findTargetAttribute, .1, 200, 1, 1, 10, true),
				new EntityTimedAttribute(40),
			]),
			new EntityTimedAttribute(40)));
	}
}

export class MaterialDeposit extends Entity {
	readonly material: Material;

	constructor(material: Material) {
		super('Material Deposit', '');
		this.setSprite(SpriteLoader.getColoredSprite(SpriteLoader.Resource.TERRAIN, 'resource-deposit.png', [ResourceUtils.materialColor(material)]));
		this.material = material;
		this.addAttribute(new EntityMaterialDisplayAttribute(material));
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
		super('Liquid Deposit', '');
		this.setSprite(new AnimatedSprite(liquid === Liquid.WATER ? animatedGeneratedTextures.waterDeposit : animatedGeneratedTextures.methaneDeposit));
		this.liquid = liquid;
		this.addAttribute(new EntityLiquidDisplayAttribute(liquid));
	}

	get liquidTier(): number {
		switch (this.liquid) {
			case Liquid.WATER:
				return 0;
			case Liquid.METHANE:
				return 1;
		}
	}
}

export class Mob extends Entity {
	constructor(position: Vector) {
		super('Low Tier Mob No Sprite', '');
		this.setParticle(new Particle(animatedGeneratedTextures.lowTierMob.textures[0]));
		let mobHerdPositionAttribute = new EntityMobHerdPositionAttribute(position);
		this.addAttribute(mobHerdPositionAttribute);
		let findTargetAttribute = new EntityFindTargetAttribute(11, 1, true);
		this.addAttribute(new EntityIfElseAttribute(
			findTargetAttribute,
			new EntityChainAttribute([
				new EntityMobHerdPositionActivateAttribute(mobHerdPositionAttribute, false),
				new EntitySpawnProjectileAttribute(findTargetAttribute, .1, 100, 1, 1, 2, false),
				new EntityTimedAttribute(200),
			]),
			new EntityChainAttribute([
				new EntityMobHerdPositionActivateAttribute(mobHerdPositionAttribute, true),
				new EntityTimedAttribute(40),
			])));
		this.addAttribute(new EntityMobHealthAttribute(10));
	}
}

export class Projectile extends Entity {
	constructor(velocity: Vector, duration: number, range: number, maxTargets: number, damage: number, sourceFriendly: boolean) {
		super('Projectile', '', new Vector(.2));
		this.setParticle(new Particle(coloredGeneratedTextures.fullRect.texture(Color.PROJECTILE_RED)));
		this.addAttribute(new EntityDirectionMovementAttribute(velocity));
		this.addAttribute(new EntityChainAttribute([
			new EntityDamageAttribute(range, maxTargets, damage, sourceFriendly),
			new EntityExpireProjectileAttribute(),
		]));
		this.addAttribute(new EntityChainAttribute([
			new EntityTimedAttribute(duration),
			new EntityExpireProjectileAttribute(),
		]));
	}
}

// todo allow boosting entities with eg water
