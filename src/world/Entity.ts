import {AnimatedSprite, Container, Particle, Sprite, Texture} from 'pixi.js';
import {AnimatedGeneratedTextures, generatedTextures} from '../graphics/generatedTextures.js';
import uiColors from '../graphics/uiColors.js';
import TextLine from '../ui/TextLine.js';
import {toCamelCase} from '../util/stringCase.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	EntityAttribute,
	EntityChainAttribute,
	EntityDamageTargetAttribute,
	EntityDescriptionAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityFindTargetAttribute,
	EntityHealthAttribute,
	EntityIfElseAttribute,
	EntityLiquidDisplayAttribute,
	EntityMaterialDisplayAttribute,
	EntityMaterialStorageAttribute,
	EntityMaterialStorageAttributeType,
	EntityMobHerdPositionActivateAttribute,
	EntityMobHerdPositionAttribute,
	EntityMobMoveTowardsPositionAttribute,
	EntityNameAttribute,
	EntityParallelAttribute,
	EntitySpawnParticleAttribute,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	TooltipType,
} from './EntityAttribute.js';
import {Liquid, Material, ResourceUtils} from './Resource.js';
import {Rotation} from './Rotation.js';
import {Tile, Tileable, World} from './World.js';

export let standardDuration = 40;

export let getMaterialCounts = (count: number): ResourceUtils.Count<Material>[] =>
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
		this.attribute.addAttribute(this, attribute);
	}

	addAttributeToMap(attribute: EntityAttribute) {
		let key = attribute.constructor.name;
		this.attributesMap[key] ||= [];
		this.attributesMap[key].push(attribute);
		attribute.childAttributes.forEach(childAttribute => this.addAttributeToMap(childAttribute));
	}

	getAttribute<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T | undefined {
		return this.attributesMap[attributeClass.name]?.[0] as T;
	}

	getAttributes<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T[] | undefined {
		return this.attributesMap[attributeClass.name] as T[];
	}

	setSprite(sprite: Sprite) {
		console.assert(!this.container);
		this.container = new Container();
		Entity.rotateSprite(sprite, this.rotation);
		this.container.addChild(sprite);
	}

	// positioned and sized with tile coordinates
	// todo merge with addInitialOverlayParticle & addOverlayParticle
	setParticle(texture: Texture) {
		console.assert(!this.particles.length);
		let particle = new Particle(texture);
		particle.scaleX = this.size.x / texture.width;
		particle.scaleY = this.size.y / texture.height;
		this.particles.push(particle);
	}

	// positioned and sized with (8,8) being tile coordinate (1,1)
	addOverlaySprites(label: string, sprites: Sprite[]) {
		this.container!.getChildrenByLabel(label).forEach(child => child.removeFromParent());
		sprites.forEach(sprite => {
			sprite.label = label;
			this.container!.addChild(sprite);
		});
	}

	addInitialOverlayParticle(texture: Texture, size: Vector) {
		let particle = new Particle(texture);
		particle.scaleX = size.x / texture.width;
		particle.scaleY = size.y / texture.height;
		this.particles.push(particle);
		return particle;
	}

	addOverlayParticle(texture: Texture, size: Vector, world: World) {
		let particle = this.addInitialOverlayParticle(texture, size);
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

	getAttribute<T extends EntityAttribute>(attributeClass: { new(...args: any[]): T }): T | undefined {
		return undefined;
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

export class Base extends Entity {
	constructor() {
		super('Base', '', new Vector(5));
		this.addAttribute(new EntityHealthAttribute(4000, true));
		this.addAttribute(new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(util.debug ? 500000 : 2000), util.enumValues(Rotation), true));
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
