import {AnimatedSprite, Container, Particle, Sprite, Texture} from 'pixi.js';
import {AnimatedGeneratedTextures, generatedTextures, textureColors} from '../graphics/generatedTextures.js';
import uiColors from '../graphics/uiColors.js';
import TextLine from '../ui/TextLine.js';
import {toCamelCase} from '../util/stringCase.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityAnimateSpriteAttribute,
	EntityAttribute,
	EntityBuildableAttribute,
	EntityChainAttribute,
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityDamageTargetAttribute,
	EntityDescriptionAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityFindTargetAttribute,
	EntityHealthAttribute,
	EntityIfElseAttribute,
	EntityLiquidBridgeConnectAttribute,
	EntityLiquidBridgeTransportAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidDisplayAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidExtractorAttribute,
	EntityLiquidOverlayAttribute,
	EntityLiquidStorageAttribute,
	EntityLiquidTransportAttribute,
	EntityMaterialConsumeAttribute,
	EntityMaterialDisplayAttribute,
	EntityMaterialExtractorAttribute,
	EntityMaterialProduceAttribute,
	EntityMaterialStorageAttribute,
	EntityMaterialStorageAttributeType,
	EntityMobHerdPositionActivateAttribute,
	EntityMobHerdPositionAttribute,
	EntityMobMoveTowardsPositionAttribute,
	EntityNameAttribute,
	EntityNonEmptyLiquidStorage,
	EntityOutflowAttribute,
	EntityParallelAttribute,
	EntityPowerConductAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerProduceAttribute,
	EntityPowerStorageAttribute,
	EntityPowerStorageAttributePriority,
	EntityRotateSpriteAttribute,
	EntitySpawnParticleAttribute,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	TooltipType,
} from './EntityAttribute.js';
import {Liquid, Material, ResourceUtils} from './Resource.js';
import {Rotation, RotationUtils} from './Rotation.js';
import {Tile, Tileable, World} from './World.js';

let standardDuration = 40;

let getMaterialCounts = (count: number): ResourceUtils.Count<Material>[] =>
	util.enumValues(Material).map(material => new ResourceUtils.Count(material, count));

export class Entity implements Tileable {
	readonly name: string;
	readonly size: Vector;
	readonly tilingSize: Vector;
	readonly rotation: Rotation;
	private readonly attribute = new EntityParallelAttribute([]);
	private readonly attributesMap: Record<string, EntityAttribute[]> = {};
	container: Container | null = null;
	particles: Particle[] = [];

	constructor(name: string, description: string, size: Vector = Vector.V1, rotation: Rotation = Rotation.UP, tilingSize: Vector = size) {
		this.name = name;
		this.size = size;
		this.tilingSize = tilingSize;
		this.rotation = rotation;

		if (name)
			this.addAttribute(new EntityNameAttribute(name));
		if (description)
			this.addAttribute(new EntityDescriptionAttribute(description));
		let spriteName = toCamelCase(name);
		let generatedTexture = generatedTextures[spriteName as keyof typeof generatedTextures];
		if (generatedTexture instanceof AnimatedGeneratedTextures)
			this.setSprite(new AnimatedSprite(generatedTexture));
	}

	static rotateSprite(sprite: Sprite, rotation: Rotation) {
		let halfSize = new Vector(sprite.width, sprite.height).scale(.5);
		sprite.pivot = halfSize;
		sprite.position = halfSize;
		sprite.angle = rotation * 90;
	}

	addAttribute(attribute: EntityAttribute) {
		this.attribute.addAttribute(attribute);
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

	setParticle(texture: Texture) {
		console.assert(!this.particles.length);
		let particle = new Particle(texture);
		particle.scaleX = this.size.x / texture.width;
		particle.scaleY = this.size.y / texture.height;
		this.particles.push(particle);
	}

	addOverlaySprites(label: string, sprites: Sprite[]) {
		this.container!.getChildrenByLabel(label).forEach(child => child.removeFromParent());
		sprites.forEach(sprite => {
			sprite.label = label;
			this.container!.addChild(sprite);
		});
	}

	addOverlayParticle(texture: Texture, size: Vector, world: World) {
		let particle = new Particle(texture);
		particle.scaleX = size.x / texture.width;
		particle.scaleY = size.y / texture.height;
		this.particles.push(particle);
		world.live.addGraphicsParticle(particle);
		return particle;
	}

	removeOverlayParticle(particle: Particle, world: World) {
		this.particles.splice(this.particles.indexOf(particle), 1);
		world.live.removeGraphicsParticle(particle);
	}

	tooltip(type: TooltipType): TextLine[] {
		return this.attribute.tooltip(type);
	}

	get tooltipRange(): number {
		return this.attribute.tooltipRange;
	}

	get selectable(): boolean {
		return this.attribute.selectable;
	}

	tick(world: World, tile: Tile<Entity>) {
		this.attribute.tick(world, tile);
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
		this.setSprite(new Sprite(generatedTextures.fullRect.texture(uiColors.PROJECTILE_RED)));
	}
}

export abstract class Building extends Entity {
	protected constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, rotation: Rotation = Rotation.UP, tilingSize: Vector = size) {
		super(name, description, size, rotation, tilingSize);
		this.addAttribute(new EntityBuildableAttribute(buildTime, buildCost));
		this.addAttribute(new EntityHealthAttribute(health, true));
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
		let timedAttribute = new EntityTimedAttribute(standardDuration);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput) : null,
			timedAttribute,
			new EntityMaterialExtractorAttribute(materialStorageAttribute, outputPerTier),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityOutflowAttribute(materialStorageAttribute));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityAnimateSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute, 1));
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
		let timedAttribute = new EntityTimedAttribute(standardDuration);
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
		this.addAttribute(new EntityAnimateSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute, 1));
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
		let timedAttribute = new EntityTimedAttribute(standardDuration);
		this.addAttribute(new EntityChainAttribute([
			materialStorageAttribute ? new EntityMaterialConsumeAttribute(materialStorageAttribute, materialInput) : null,
			inputPowerStorageAttribute ? new EntityPowerConsumeAttribute(inputPowerStorageAttribute, powerInput) : null,
			heatOutput ? new EntityCoolantConsumeAttribute(heatOutput) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, liquidInput!) : null,
			timedAttribute,
			new EntityPowerProduceAttribute(outputPowerStorageAttribute, powerOutput),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityAnimateSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute, 1));
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
		let timedAttribute = new EntityTimedAttribute(standardDuration);
		this.addAttribute(new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, powerInput) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, liquidInput!) : null,
			timedAttribute,
			new EntityCoolantProduceAttribute(coolantOutput),
		].filter(v => v) as EntityAttribute[]));
		if (powerInput)
			this.addAttribute(new EntityPowerConductAttribute(0));
		this.addAttribute(new EntityAnimateSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute, 1));
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
		let timedAttribute = new EntityTimedAttribute(standardDuration);
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
		this.addAttribute(new EntityAnimateSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute, 1));
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
		let timedAttribute = new EntityTimedAttribute(standardDuration);
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
		this.addAttribute(new EntityAnimateSpriteAttribute(this.container!.children[0] as AnimatedSprite, timedAttribute, 1));
	}
}

export class Pipe extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number, rotation: Rotation) {
		super(name, description, size, buildTime, buildCost, health, rotation);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, RotationUtils.except(RotationUtils.opposite(rotation)));
		this.addAttribute(liquidStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(standardDuration);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			timedAttribute,
			new EntityLiquidTransportAttribute(liquidStorageAttribute, [rotation]),
		]));
		this.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute));
	}
}

export class PipeBridge extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number, capacity: number, rotation: Rotation, range: number) {
		super(name, description, size, buildTime, buildCost, health, rotation, new Vector(range));
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), capacity, RotationUtils.except(RotationUtils.opposite(rotation)));
		this.addAttribute(liquidStorageAttribute);
		let liquidBridgeConnectAttribute = new EntityLiquidBridgeConnectAttribute(rotation, range);
		this.addAttribute(liquidBridgeConnectAttribute);
		let timedAttribute = new EntityTimedAttribute(standardDuration);
		this.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			timedAttribute,
			new EntityLiquidBridgeTransportAttribute(liquidStorageAttribute, liquidBridgeConnectAttribute),
		]));
		this.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute));
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
				new EntityTimedAttribute(standardDuration),
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
				new EntityTimedAttribute(standardDuration),
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
			new EntityTimedAttribute(standardDuration),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, util.enumValues(Rotation)),
		]));
		this.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute));
	}
}

export class Wall extends Building {
	constructor(name: string, description: string, size: Vector, buildTime: number, buildCost: ResourceUtils.Count<Material>[], health: number) {
		super(name, description, size, buildTime, buildCost, health);
	}
}

export class Base extends Entity {
	constructor() {
		super('Base', '', new Vector(5));
		this.addAttribute(new EntityHealthAttribute(4000, true));
		this.addAttribute(new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(util.debug ? 500000 : 2000), util.enumValues(Rotation), true));
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
		// todo area damage not working
		// todo area visual

		// todo
		//   on hit affects
		//     collision:   damage
		//     aoe:         damage, duration, aoe size, pulse frequency
		//     chain:       projectiles or lasers can chain to other targets on hitting first target. chain count, chain distance, chain count (e.g. 1 laser chains to 3 nearby targets), and relevant projectile/laser properties (accuracy, projectile size, projectile speed, thickness)

		// todo entity attributes
		//   attacks:
		//     projectiles: projectile count, attack rate, accuracy, projectile count spread, projectile travel distance, projectile size, projectile speed, homing speed
		//     laser:       essentially a projectile with instant travel time. attack rate, accuracy, max distance, thickness, does it pierce,
		//     self:        no projectile or laser, does collision, explosion, chain, pulse, etc damage style around self. frequency
		//   aim: nearby enemy, set angles, random angles
		//   effect: damage, stun, spawn chain attack, spawn cluster attack
		//   target: hit target, area

		let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, [new ResourceUtils.Count(Material.IRON, 10)], util.enumValues(Rotation), false);
		this.addAttribute(materialStorageAttribute);
		let findTargetAttribute = new EntityFindTargetAttribute(16, 3, true, false);
		this.addAttribute(new EntityIfElseAttribute(
			findTargetAttribute,
			new EntityChainAttribute([
				new EntityMaterialConsumeAttribute(materialStorageAttribute, [new ResourceUtils.Count(Material.IRON, 1)]),
				new EntitySpawnProjectileAttribute(findTargetAttribute, 3, 0, .4, 40, .2, 10, 10, true),
				new EntityTimedAttribute(40 / 4),
			]),
			new EntityTimedAttribute(standardDuration)));
	}
}

export class MaterialDeposit extends Entity {
	readonly material: Material;

	constructor(material: Material) {
		super('', '');
		this.material = material;
		this.setParticle(this.texture);
		this.addAttribute(new EntityMaterialDisplayAttribute(material));
	}

	get texture(): Texture {
		switch (this.material) {
			case Material.IRON:
				return generatedTextures.ironDeposit.textures[0];
			case Material.FLUX_SAND:
				return generatedTextures.fluxSandDeposit.textures[0];
			case Material.SULPHUR:
				return generatedTextures.sulphurDeposit.textures[0];
			case Material.TITANIUM:
				return generatedTextures.titaniumDeposit.textures[0];
			case Material.GRAPHITE:
				return generatedTextures.graphiteDeposit.textures[0];
			default:
				console.assert(false);
				return undefined as never;
		}
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
			default:
				console.assert(false);
				return undefined as never;
		}
	}
}

export class LiquidDeposit extends Entity {
	readonly liquid: Liquid;

	constructor(liquid: Liquid) {
		super('', '');
		this.liquid = liquid;
		this.setParticle(this.texture);
		this.addAttribute(new EntityLiquidDisplayAttribute(liquid));
	}

	get texture(): Texture {
		switch (this.liquid) {
			case Liquid.WATER:
				return generatedTextures.waterDeposit.textures[0];
			case Liquid.METHANE:
				return generatedTextures.methaneDeposit.textures[0];
			default:
				console.assert(false);
				return undefined as never;
		}
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

export class ProjectileMob extends Entity {
	constructor(size: number, health: number, movementSpeed: number, visualRange: number, attackRange: number, projectileCount: number, projectileDamageSize: number, projectileSpeed: number, projectileCollisionSize: number, projectileDamage: number, projectileAttackLatency: number, projectileSpreadDegrees: number) {
		super('Projectile Mob', '', new Vector(size));
		this.setParticle(generatedTextures.swarmDrone.textures[0]);
		let mobHerdPositionAttribute = new EntityMobHerdPositionAttribute(movementSpeed);
		this.addAttribute(mobHerdPositionAttribute);
		let findTargetAttribute = new EntityFindTargetAttribute(visualRange, 1, false, true);
		this.addAttribute(new EntityIfElseAttribute(
			findTargetAttribute,
			new EntityChainAttribute([
				new EntityMobHerdPositionActivateAttribute(mobHerdPositionAttribute, false),
				new EntityMobMoveTowardsPositionAttribute(findTargetAttribute, attackRange, movementSpeed),
				new EntitySpawnProjectileAttribute(findTargetAttribute, projectileCount, projectileDamageSize, projectileSpeed, attackRange / projectileSpeed, projectileCollisionSize, projectileDamage, projectileSpreadDegrees, false),
				new EntityTimedAttribute(projectileAttackLatency),
			]),
			new EntityChainAttribute([
				new EntityMobHerdPositionActivateAttribute(mobHerdPositionAttribute, true),
				new EntityTimedAttribute(standardDuration),
			])));
		this.addAttribute(new EntityHealthAttribute(health, false));
	}
}

export class Projectile extends Entity {
	constructor(velocity: Vector, damageSize: number, duration: number, collisionSize: number, damage: number, sourceFriendly: boolean) {
		super('Projectile', '', new Vector(collisionSize));
		this.setParticle(generatedTextures.fullRect.texture(sourceFriendly ? uiColors.PROJECTILE_BLUE : uiColors.PROJECTILE_RED));
		// todo homing projectile
		this.addAttribute(new EntityDirectionMovementAttribute(velocity));
		let collisionFindTargetAttribute = new EntityFindTargetAttribute(collisionSize, 1, sourceFriendly, !sourceFriendly);
		let damageFindTargetAttribute = damageSize ? new EntityFindTargetAttribute(damageSize, 10, sourceFriendly, !sourceFriendly) : collisionFindTargetAttribute;
		this.addAttribute(new EntityChainAttribute([
			collisionFindTargetAttribute,
			damageSize ? damageFindTargetAttribute : null,
			new EntityDamageTargetAttribute(damageFindTargetAttribute, damage),
			new EntitySpawnParticleAttribute(5, Vector.V0, Vector.V0, .15, .3, .015, 50, generatedTextures.fullRect.texture(uiColors.SMOKE_GRAY)),
			damageSize ? new EntitySpawnParticleAttribute(1, Vector.V0, Vector.V0, damageSize * 2, damageSize * 2, 0, 50, generatedTextures.fullRect.texture(uiColors.DAMAGE_AREA_RED)) : null,
			new EntityExpireProjectileAttribute(),
		].filter(v => v) as EntityAttribute[]));
		this.addAttribute(new EntityChainAttribute([
			new EntityTimedAttribute(duration),
			new EntityExpireProjectileAttribute(),
		]));
	}
}

export class ParticleEntity extends Entity {
	constructor(velocity: Vector, size: number, duration: number, texture: Texture) {
		super('Particle', '', new Vector(size));
		this.setParticle(texture);
		this.addAttribute(new EntityDirectionMovementAttribute(velocity));
		this.addAttribute(new EntityChainAttribute([
			new EntityTimedAttribute(duration),
			new EntityExpireProjectileAttribute(),
		]));
	}
}

// todo allow boosting entities with eg water
