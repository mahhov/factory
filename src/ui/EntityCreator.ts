import {AnimatedSprite} from 'pixi.js';
import {generatedTextures, textureColors} from '../graphics/generatedTextures.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Clear, Empty, Entity, getMaterialCounts, ProjectileMob, standardDuration} from '../world/Entity.js';
import {
	EntityAnimateSpriteAttribute,
	EntityAttribute,
	EntityBuildableAttribute,
	EntityChainAttribute,
	EntityCirclePathParticleAttribute,
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityFindTargetAttribute,
	EntityHealthAttribute,
	EntityIfElseAttribute,
	EntityInflowAttribute,
	EntityLiquidBridgeConnectAttribute,
	EntityLiquidBridgeTransportAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidExtractorAttribute,
	EntityLiquidOverlayAttribute,
	EntityLiquidStorageAttribute,
	EntityLiquidTransportAttribute,
	EntityMaterialConsumeAttribute,
	EntityMaterialExtractorAttribute,
	EntityMaterialOverlayAttribute,
	EntityMaterialPickerAttribute,
	EntityMaterialProduceAttribute,
	EntityMaterialStorageAttribute,
	EntityMaterialStorageAttributeType,
	EntityNonEmptyLiquidStorage,
	EntityNonEmptyMaterialStorage,
	EntityOutflowAttribute,
	EntityPowerConductAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerProduceAttribute,
	EntityPowerStorageAttribute,
	EntityPowerStorageAttributePriority,
	EntityRotateParticleAttribute,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	EntityTransportAttribute,
} from '../world/EntityAttribute.js';
import {findEntityMetadata, ParsedLine, sectionFields} from '../world/EntityMetadata.js';
import {Liquid, Material, ResourceUtils} from '../world/Resource.js';
import {Rotation, RotationUtils} from '../world/Rotation.js';

export enum Tool {
	// todo copy/paste
	EMPTY, CLEAR,
	EXTRACTOR, REINFORCED_EXTRACTOR, QUADRATIC_EXTRACTOR, LASER_EXTRACTOR,
	// todo bridge
	CONVEYOR, HIGH_SPEED_CONVEYOR, PACKED_CONVEYOR, DISTRIBUTOR, JUNCTION, STORAGE, DISPENSER,
	// todo VOLTA_FABRICATOR
	STEEL_SMELTER, METAGLASS_FOUNDRY, PLASTEEL_MIXER, THERMITE_FORGE, EXIDIUM_CATALYST,
	THERMAL_GENERATOR, SOLAR_ARRAY, METHANE_BURNER, GRAPHITE_BURNER, THERMITE_REACTOR, CONDUCTOR, BATTERY,
	AIR_VENT, WATER_VENT, METHANE_VENT,
	PUMP, POWERED_PUMP, WELL,
	PIPE, PIPE_BRIDGE, PIPE_DISTRIBUTOR, PIPE_JUNCTION, TANK,
	// todo bunker
	STEEL_WALL, TITANIUM_WALL,
	SHRAPNEL_TURRET, PIERCING_TURRET, ARC_TURRET, SIEGE_TURRET, LASER_TURRET,
}

export enum MobType {
	SWARM_DRONE,
	ASSAULT_TANK,
	ARTILLERY_TRUCK,
	ZENITH,
	SCRAMBLER_BOT,
	HIVE,
	BEHEMOTH,
	BOMBER,
	HARVESTER,
}

export default class EntityCreator {
	private static cachedToolEntities_: Record<Tool, Entity>;

	static get cachedToolEntities() {
		EntityCreator.cachedToolEntities_ ||= Object.fromEntries(util.enumValues(Tool).map(tool => [tool, EntityCreator.createToolEntity(tool)])) as Record<Tool, Entity>;
		return EntityCreator.cachedToolEntities_;
	}

	static createToolEntity(tool: Tool, rotation: Rotation = Rotation.UP): Entity {
		switch (tool) {
			case Tool.EMPTY:
				return new Empty();
			case Tool.CLEAR:
				return new Clear();

			case Tool.EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Extractor'), 0);
			case Tool.REINFORCED_EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Reinforced Extractor'), 1);
			case Tool.QUADRATIC_EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Quadratic Extractor'), 2);
			case Tool.LASER_EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Laser Extractor'), 3);

			case Tool.CONVEYOR:
				return EntityCreator.createToolConveyor(findEntityMetadata('buildings', 'Conveyor'), false, rotation);
			case Tool.HIGH_SPEED_CONVEYOR:
				return EntityCreator.createToolConveyor(findEntityMetadata('buildings', 'High Speed Conveyor'), false, rotation);
			case Tool.DISTRIBUTOR:
				return EntityCreator.createToolDistributorJunction(findEntityMetadata('buildings', 'Distributor'), true);
			case Tool.JUNCTION:
				return EntityCreator.createToolDistributorJunction(findEntityMetadata('buildings', 'Junction'), false);
			case Tool.PACKED_CONVEYOR:
				return EntityCreator.createToolConveyor(findEntityMetadata('buildings', 'Packed Conveyor'), true, rotation);
			case Tool.STORAGE:
				return EntityCreator.createToolStorage(findEntityMetadata('buildings', 'Storage'));
			case Tool.DISPENSER:
				return EntityCreator.createToolDispenser(findEntityMetadata('buildings', 'Dispenser'), rotation);

			case Tool.STEEL_SMELTER:
				return EntityCreator.createToolFactory(findEntityMetadata('buildings', 'Steel Smelter'));
			case Tool.METAGLASS_FOUNDRY:
				return EntityCreator.createToolFactory(findEntityMetadata('buildings', 'Metaglass Foundry'));
			case Tool.PLASTEEL_MIXER:
				return EntityCreator.createToolFactory(findEntityMetadata('buildings', 'Plasteel Mixer'));
			case Tool.THERMITE_FORGE:
				return EntityCreator.createToolFactory(findEntityMetadata('buildings', 'Thermite Forge'));
			case Tool.EXIDIUM_CATALYST:
				return EntityCreator.createToolFactory(findEntityMetadata('buildings', 'Exidium Catalyst'));

			case Tool.THERMAL_GENERATOR:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Thermal Generator'), 0);
			case Tool.SOLAR_ARRAY:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Solar Array'), 1);
			case Tool.METHANE_BURNER:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Methane Burner'), 2);
			case Tool.GRAPHITE_BURNER:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Graphite Burner'), 3);
			case Tool.THERMITE_REACTOR:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Thermite Reactor'), 4);
			case Tool.CONDUCTOR:
				return EntityCreator.createToolConductor(findEntityMetadata('buildings', 'Conductor'));
			case Tool.BATTERY:
				return EntityCreator.createToolBattery(findEntityMetadata('buildings', 'Battery'));

			case Tool.AIR_VENT:
				return EntityCreator.createToolVent(findEntityMetadata('buildings', 'Air Vent'), 0);
			case Tool.WATER_VENT:
				return EntityCreator.createToolVent(findEntityMetadata('buildings', 'Water Vent'), 1);
			case Tool.METHANE_VENT:
				return EntityCreator.createToolVent(findEntityMetadata('buildings', 'Methane Vent'), 2);

			case Tool.PUMP:
				return EntityCreator.createToolPump(findEntityMetadata('buildings', 'Pump'), 0);
			case Tool.POWERED_PUMP:
				return EntityCreator.createToolPump(findEntityMetadata('buildings', 'Powered Pump'), 1);
			case Tool.WELL:
				return EntityCreator.createToolWell(findEntityMetadata('buildings', 'Well'));

			case Tool.PIPE:
				return EntityCreator.createToolPipe(findEntityMetadata('buildings', 'Pipe'), rotation);
			case Tool.PIPE_BRIDGE:
				return EntityCreator.createToolPipeBridge(findEntityMetadata('buildings', 'Pipe Bridge'), rotation);
			case Tool.PIPE_DISTRIBUTOR:
				return EntityCreator.createToolPipeDistributorJunction(findEntityMetadata('buildings', 'Pipe Distributor'), true);
			case Tool.PIPE_JUNCTION:
				return EntityCreator.createToolPipeDistributorJunction(findEntityMetadata('buildings', 'Pipe Distributor'), false);
			case Tool.TANK:
				return EntityCreator.createToolTank(findEntityMetadata('buildings', 'Tank'));

			case Tool.STEEL_WALL:
				return EntityCreator.createToolWall(findEntityMetadata('buildings', 'Steel Wall'));
			case Tool.TITANIUM_WALL:
				return EntityCreator.createToolWall(findEntityMetadata('buildings', 'Titanium Wall'));

			case Tool.SHRAPNEL_TURRET:
				return EntityCreator.createToolTurret(findEntityMetadata('turrets', 'Shrapnel Turret'));
			case Tool.PIERCING_TURRET:
				return EntityCreator.createToolTurret(findEntityMetadata('turrets', 'Piercing Turret'));
			case Tool.ARC_TURRET:
				return EntityCreator.createToolTurret(findEntityMetadata('turrets', 'Arc Turret'));
			case Tool.SIEGE_TURRET:
				return EntityCreator.createToolTurret(findEntityMetadata('turrets', 'Siege Turret'));
			case Tool.LASER_TURRET:
				return EntityCreator.createToolTurret(findEntityMetadata('turrets', 'Laser Turret'));
		}
	}

	private static createBuilding(metadata: ParsedLine<typeof sectionFields.buildings | typeof sectionFields.turrets>, rotation?: Rotation, tilingSize?: Vector): Entity {
		let entity = new Entity(metadata.name, metadata.description, new Vector(metadata.size), rotation, tilingSize);
		entity.addAttribute(new EntityBuildableAttribute(metadata.buildTime, metadata.buildCost));
		entity.addAttribute(new EntityHealthAttribute(metadata.health, true));
		return entity;
	}

	private static addTransportChain(entity: Entity,
	                                 metadata: ParsedLine<typeof sectionFields.buildings>,
	                                 materialStorageAttributeType: EntityMaterialStorageAttributeType,
	                                 inputRotations: Rotation[],
	                                 outputRotations: Rotation[]): [EntityMaterialStorageAttribute, EntityTimedAttribute] {
		let materialStorageAttribute = new EntityMaterialStorageAttribute(materialStorageAttributeType, 1, getMaterialCounts(Infinity), inputRotations, true);
		entity.addAttribute(materialStorageAttribute);
		let timedAttribute = new EntityTimedAttribute(standardDuration / (metadata.output as number));
		entity.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyMaterialStorage(materialStorageAttribute),
			timedAttribute,
			new EntityTransportAttribute(materialStorageAttribute, outputRotations),
		]));
		return [materialStorageAttribute, timedAttribute];
	}

	private static addConsumptionChain(entity: Entity, metadata: ParsedLine<typeof sectionFields.buildings>): [EntityTimedAttribute, EntityLiquidStorageAttribute | undefined, EntityChainAttribute] {
		let materialStorageAttribute;
		if (metadata.materialInput.length) {
			materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, metadata.materialInput.map(materialCount => new ResourceUtils.Count(materialCount.resource, 10)), util.enumValues(Rotation), false);
			entity.addAttribute(materialStorageAttribute);
		}
		let powerStorageAttribute;
		if (metadata.powerInput) {
			powerStorageAttribute = new EntityPowerStorageAttribute(metadata.powerInput, EntityPowerStorageAttributePriority.CONSUME);
			entity.addAttribute(powerStorageAttribute);
		}
		let liquidStorageAttribute;
		if (metadata.liquidInput.length) {
			liquidStorageAttribute = new EntityLiquidStorageAttribute([metadata.liquidInput[0].resource], metadata.liquidInput[0].quantity, util.enumValues(Rotation));
			entity.addAttribute(liquidStorageAttribute);
		}
		let timedAttribute = new EntityTimedAttribute(standardDuration);
		let chainAttribute = new EntityChainAttribute([
			powerStorageAttribute ? new EntityPowerConsumeAttribute(powerStorageAttribute, metadata.powerInput) : null,
			metadata.heatOutput ? new EntityCoolantConsumeAttribute(metadata.heatOutput) : null,
			materialStorageAttribute ? new EntityMaterialConsumeAttribute(materialStorageAttribute, metadata.materialInput) : null,
			liquidStorageAttribute ? new EntityLiquidConsumeAttribute(liquidStorageAttribute, metadata.liquidInput[0]!) : null,
			timedAttribute,
		].filter(v => v) as EntityAttribute[]);
		entity.addAttribute(chainAttribute);
		if (metadata.powerInput)
			entity.addAttribute(new EntityPowerConductAttribute(0));
		return [timedAttribute, liquidStorageAttribute, chainAttribute];
	}

	private static addLiquidTransportChain(entity: Entity, liquidStorageAttribute: EntityLiquidStorageAttribute, rotations: Rotation[]) {
		entity.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityTimedAttribute(standardDuration),
			new EntityLiquidTransportAttribute(liquidStorageAttribute, rotations),
		]));
	}

	private static addAnimation(entity: Entity, timedAttribute: EntityTimedAttribute) {
		entity.addAttribute(new EntityAnimateSpriteAttribute(entity.container!.children[0] as AnimatedSprite, timedAttribute, 1));
	}

	private static addPumpAnimation(entity: Entity, timedAttribute: EntityTimedAttribute, liquidStorageAttribute: EntityLiquidStorageAttribute, tier: number) {
		let colorColorSecondarySlowSize = [
			[textureColors.tier1, textureColors.tier1Secondary, 20, .25],
			[textureColors.tier2, textureColors.tier2Secondary, 10, .25],
			[textureColors.waterSecondary, textureColors.water, 40, .25],
		][tier] as [string, string, number, number];
		let particle = entity.addInitialOverlayParticle(generatedTextures.pumpTop.texture(colorColorSecondarySlowSize[0], colorColorSecondarySlowSize[1]), new Vector(2));
		particle.rotation = 1;
		particle.anchorX = .5;
		particle.anchorY = .5;
		entity.addAttribute(new EntityRotateParticleAttribute(particle, entity.size.scale(.5), timedAttribute, colorColorSecondarySlowSize[2], true));
		entity.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute, new Vector(colorColorSecondarySlowSize[3])));
	}

	private static createToolExtractor(metadata: ParsedLine<typeof sectionFields.buildings>, tier: number) {
		let entity = this.createBuilding(metadata);
		let [timedAttribute, _, chainAttribute] = this.addConsumptionChain(entity, metadata);
		let materialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(10), [], true);
		entity.addAttribute(materialStorageAttribute);
		chainAttribute.addAttribute(entity, new EntityMaterialExtractorAttribute(materialStorageAttribute, metadata.output as number[]));
		entity.addAttribute(new EntityOutflowAttribute(materialStorageAttribute));

		let colorsSlow = [
			[[textureColors.tier1Secondary], 10],
			[[textureColors.tier2Secondary], 20],
			[[textureColors.tier3Secondary], 40],
			[[textureColors.tier4, textureColors.tier4Secondary], 80],
		][tier] as [string[], number];
		colorsSlow[0].forEach((color, i) => {
			let center = entity.size.scale(.5);
			let size = i ? center : entity.size;
			let particle = entity.addInitialOverlayParticle(generatedTextures.extractorTop.texture(size.x * 8, color), size);
			particle.anchorX = .5;
			particle.anchorY = .5;
			particle.rotation = 1;
			entity.addAttribute(new EntityRotateParticleAttribute(particle, center, timedAttribute, colorsSlow[1], true));
		});
		// todo add dust particles
		return entity;
	}

	private static createToolConveyor(metadata: ParsedLine<typeof sectionFields.buildings>, packed: boolean, rotation: Rotation) {
		let entity = this.createBuilding(metadata, rotation);
		let type = packed ? EntityMaterialStorageAttributeType.PACKED : EntityMaterialStorageAttributeType.NORMAL;
		let [materialStorageAttribute, timedAttribute] = this.addTransportChain(entity, metadata, type, RotationUtils.except(RotationUtils.opposite(rotation)), [rotation]);
		entity.addAttribute(new EntityMaterialOverlayAttribute(materialStorageAttribute, timedAttribute, rotation));
		return entity;
	}

	private static createToolDistributorJunction(metadata: ParsedLine<typeof sectionFields.buildings>, distributor: boolean) {
		// todo rate should depend on what conveyor it's adjacent to
		let entity = this.createBuilding(metadata);
		util.enumValues(Rotation).forEach(rotation => {
			let outputRotations = distributor ? RotationUtils.except(RotationUtils.opposite(rotation)) : [rotation];
			this.addTransportChain(entity, metadata, EntityMaterialStorageAttributeType.NORMAL, [rotation], outputRotations);
		});
		return entity;
	}

	private static createToolStorage(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let entity = this.createBuilding(metadata);
		entity.addAttribute(new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, getMaterialCounts(metadata.output as number), util.enumValues(Rotation), true));
		return entity;
	}

	private static createToolDispenser(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		let entity = this.createBuilding(metadata, rotation);
		let [materialStorageAttribute, timedAttribute] = this.addTransportChain(entity, metadata, EntityMaterialStorageAttributeType.ANY, [], [rotation]);
		let materialPickerAttribute = new EntityMaterialPickerAttribute();
		entity.addAttribute(materialPickerAttribute);
		entity.addAttribute(new EntityInflowAttribute(materialPickerAttribute, materialStorageAttribute, [rotation]));
		this.addAnimation(entity, timedAttribute);
		return entity;
	}

	private static createToolFactory(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let entity = this.createBuilding(metadata);
		let [timedAttribute, _, chainAttribute] = this.addConsumptionChain(entity, metadata);
		let materialOutput = metadata.output as ResourceUtils.Count<Material>;
		let outputMaterialStorageAttribute = new EntityMaterialStorageAttribute(EntityMaterialStorageAttributeType.NORMAL, Infinity, [new ResourceUtils.Count(materialOutput.resource, 10)], [], true);
		entity.addAttribute(outputMaterialStorageAttribute);
		chainAttribute.addAttribute(entity, new EntityMaterialProduceAttribute(outputMaterialStorageAttribute, [materialOutput]));
		entity.addAttribute(new EntityOutflowAttribute(outputMaterialStorageAttribute));
		this.addAnimation(entity, timedAttribute);
		return entity;
	}

	private static createToolGenerator(metadata: ParsedLine<typeof sectionFields.buildings>, tier: number) {
		let entity = this.createBuilding(metadata);
		let [timedAttribute, _, chainAttribute] = this.addConsumptionChain(entity, metadata);
		let powerOutput = metadata.output as number;
		let outputPowerStorageAttribute = new EntityPowerStorageAttribute(powerOutput, EntityPowerStorageAttributePriority.PRODUCE);
		entity.addAttribute(outputPowerStorageAttribute);
		chainAttribute.addAttribute(entity, new EntityPowerProduceAttribute(outputPowerStorageAttribute, powerOutput));
		if (!metadata.powerInput)
			entity.addAttribute(new EntityPowerConductAttribute(0));

		let colorSizeAreaSlow = [
			[textureColors.tier2, .25, .75, 16],
			[textureColors.white, .25, 1.5, 20],
			[textureColors.tier3, .5, 1.75, 12],
			[textureColors.tier4, .75, 1.5, 4],
			[textureColors.white, 1, 1.25, 2],
		][tier] as [string, number, number, number];
		let size = new Vector(colorSizeAreaSlow[1]);
		let area = new Vector(colorSizeAreaSlow[2] - colorSizeAreaSlow[1]);
		let centeredCorner = entity.size.subtract(size).scale(.5);
		let particle = entity.addInitialOverlayParticle(generatedTextures.fullRect.texture(colorSizeAreaSlow[0]), size);
		entity.addAttribute(new EntityCirclePathParticleAttribute(particle, centeredCorner, area, timedAttribute, colorSizeAreaSlow[3], true));
		return entity;
	}

	private static createToolConductor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let range = metadata.output as number;
		let entity = this.createBuilding(metadata, undefined, new Vector(range));
		entity.addAttribute(new EntityPowerConductAttribute(range));
		return entity;
	}

	private static createToolBattery(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let entity = this.createBuilding(metadata);
		entity.addAttribute(new EntityPowerStorageAttribute(metadata.output as number, EntityPowerStorageAttributePriority.STORAGE));
		entity.addAttribute(new EntityPowerConductAttribute(0));
		return entity;
	}

	private static createToolVent(metadata: ParsedLine<typeof sectionFields.buildings>, tier: number) {
		let entity = this.createBuilding(metadata);
		let [_, liquidStorageAttribute, chainAttribute] = this.addConsumptionChain(entity, metadata);
		chainAttribute.addAttribute(entity, new EntityCoolantProduceAttribute(metadata.output as number));

		if (liquidStorageAttribute) {
			let size = [0, .25, .5][tier];
			entity.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute, new Vector(size)));
		}
		return entity;
	}

	private static createToolPump(metadata: ParsedLine<typeof sectionFields.buildings>, tier: number) {
		let entity = this.createBuilding(metadata);
		let [timedAttribute, __, chainAttribute] = this.addConsumptionChain(entity, metadata);
		let outputPerTier = metadata.output as number[];
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), outputPerTier[0], []);
		entity.addAttribute(liquidStorageAttribute);
		chainAttribute.addAttribute(entity, new EntityLiquidExtractorAttribute(liquidStorageAttribute, outputPerTier));
		this.addLiquidTransportChain(entity, liquidStorageAttribute, util.enumValues(Rotation));
		this.addPumpAnimation(entity, timedAttribute, liquidStorageAttribute, tier);
		return entity;
	}

	private static createToolWell(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let entity = this.createBuilding(metadata);
		let [timedAttribute, __, chainAttribute] = this.addConsumptionChain(entity, metadata);
		let liquidOutput = metadata.output as number;
		let liquidStorageAttribute = new EntityLiquidStorageAttribute([Liquid.WATER], liquidOutput, []);
		entity.addAttribute(liquidStorageAttribute);
		chainAttribute.addAttribute(entity, new EntityLiquidDryExtractorAttribute(liquidStorageAttribute, new ResourceUtils.Count(Liquid.WATER, liquidOutput)));
		this.addLiquidTransportChain(entity, liquidStorageAttribute, util.enumValues(Rotation));
		this.addPumpAnimation(entity, timedAttribute, liquidStorageAttribute, 2);
		return entity;
	}

	private static createToolPipe(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		let entity = this.createBuilding(metadata, rotation);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), metadata.output as number, RotationUtils.except(RotationUtils.opposite(rotation)));
		entity.addAttribute(liquidStorageAttribute);
		this.addLiquidTransportChain(entity, liquidStorageAttribute, [rotation]);
		entity.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute, new Vector(.25)));
		return entity;
	}

	private static createToolPipeBridge(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		// todo get 4 from metadata
		let range = 4;
		let entity = this.createBuilding(metadata, rotation, new Vector(range));
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), metadata.output as number, RotationUtils.except(RotationUtils.opposite(rotation)));
		entity.addAttribute(liquidStorageAttribute);
		let liquidBridgeConnectAttribute = new EntityLiquidBridgeConnectAttribute(rotation, range);
		entity.addAttribute(liquidBridgeConnectAttribute);
		entity.addAttribute(new EntityChainAttribute([
			new EntityNonEmptyLiquidStorage(liquidStorageAttribute),
			new EntityTimedAttribute(standardDuration),
			new EntityLiquidBridgeTransportAttribute(liquidStorageAttribute, liquidBridgeConnectAttribute),
		]));
		entity.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute, new Vector(.25)));
		return entity;
	}

	private static createToolPipeDistributorJunction(metadata: ParsedLine<typeof sectionFields.buildings>, distributor: boolean) {
		let entity = this.createBuilding(metadata);
		util.enumValues(Rotation).forEach(rotation => {
			let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), metadata.output as number, [rotation]);
			entity.addAttribute(liquidStorageAttribute);
			this.addLiquidTransportChain(entity, liquidStorageAttribute, distributor ? RotationUtils.except(RotationUtils.opposite(rotation)) : [rotation]);
		});
		return entity;
	}

	private static createToolTank(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let entity = this.createBuilding(metadata);
		let liquidStorageAttribute = new EntityLiquidStorageAttribute(util.enumValues(Liquid), metadata.output as number, util.enumValues(Rotation));
		entity.addAttribute(liquidStorageAttribute);
		this.addLiquidTransportChain(entity, liquidStorageAttribute, util.enumValues(Rotation));
		entity.addAttribute(new EntityLiquidOverlayAttribute(liquidStorageAttribute, new Vector(.75)));
		return entity;
	}

	private static createToolWall(metadata: ParsedLine<typeof sectionFields.buildings>) {
		let entity = this.createBuilding(metadata);
		return entity;
	}

	private static createToolTurret(metadata: ParsedLine<typeof sectionFields.turrets>) {
		// todo point towards enemy

		let entity = this.createBuilding(metadata);

		// todo metadata.attackRate, metadata.damage, metadata.materialInput, metadata.accuracy, metadata.range, metadata.projectileSpeed
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
		entity.addAttribute(materialStorageAttribute);
		let findTargetAttribute = new EntityFindTargetAttribute(16, 3, true, false);
		entity.addAttribute(new EntityIfElseAttribute(
			findTargetAttribute,
			new EntityChainAttribute([
				new EntityMaterialConsumeAttribute(materialStorageAttribute, [new ResourceUtils.Count(Material.IRON, 1)]),
				new EntitySpawnProjectileAttribute(findTargetAttribute, 3, 0, .4, 40, .2, 10, 10, true),
				new EntityTimedAttribute(40 / 4),
			]),
			new EntityTimedAttribute(standardDuration)));

		return entity;
	}

	static createMobEntity(mobType: MobType): Entity {
		switch (mobType) {
			case MobType.SWARM_DRONE:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Swarm Drone'));
			case MobType.ASSAULT_TANK:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Assault Tank')); // todo
			case MobType.ARTILLERY_TRUCK:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Artillery Truck'));
			case MobType.ZENITH:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Zenith')); // todo
			case MobType.SCRAMBLER_BOT:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Scrambler Bot')); // todo
			case MobType.HIVE:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Hive')); // todo
			case MobType.BEHEMOTH:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Behemoth')); // todo
			case MobType.BOMBER:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Bomber')); // todo
			case MobType.HARVESTER:
				return EntityCreator.createProjectileMob(findEntityMetadata('mobs', 'Harvester')); // todo
		}
	}

	// private static createMobAttackTarget(metadata: ParsedLine<typeof sectionFields.mobs>) {
	// 	switch (metadata.attackTarget) {
	// 		case 'single':
	// 			return new EntityTargetDamageAttribute();
	// 		case 'area':
	// 			return new EntityAreaDamageAttribute();
	// 		default:
	// 			console.assert(false);
	// 	}
	// }
	//
	// private static createMobAttackAffect(metadata: ParsedLine<typeof sectionFields.mobs>) {
	// 	switch (metadata.attackAffect) {
	// 		case 'damage':
	// 			return new EntityTargetDamageAttribute();
	// 		case 'stun':
	// 			return new EntityAreaDamageAttribute();
	// 		case 'spawn':
	// 		default:
	// 			console.assert(false);
	// 	}
	// }
	//
	// private static createMobAttackType(metadata: ParsedLine<typeof sectionFields.mobs>) {
	// 	switch (metadata.attackType) {
	// 		case 'projectile':
	// 			return new ProjectileMob(metadata.size, metadata.health, metadata.movementSpeed, metadata.collisionWidth, metadata.area, metadata.count, metadata.projectileSpeed, metadata.range, metadata.damage, metadata.attackLatency, metadata.damage, metadata.damageDuration);
	// 		case 'laser':
	// 			return new LaserMob(metadata.size, metadata.health, metadata.movementSpeed, metadata.collisionWidth, metadata.count, metadata.range, metadata.damage, metadata.attackLatency, metadata.damage, metadata.damageDuration);
	// 		case 'self':
	// 			console.assert(false);
	// 		default:
	// 			console.assert(false);
	// 	}
	// }

	private static createProjectileMob(metadata: ParsedLine<typeof sectionFields.mobs>) {
		return new ProjectileMob(metadata.size, metadata.health, metadata.movementSpeed, 20, metadata.range, metadata.count, metadata.damageSize, metadata.projectileSpeed, metadata.collisionWidth, metadata.damage, metadata.attackLatency, 0);
	}
}

// todo name, description, & sprite attributes should be factory-ized. entity constructor should be dumb
// todo allow chaining syntax
// todo remove use of this. to refer to static methods
