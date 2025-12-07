import {AnimatedSprite} from 'pixi.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {
	Battery,
	Clear,
	Conductor,
	Empty,
	Entity,
	Extractor,
	Factory,
	Generator,
	Pipe,
	PipeBridge,
	PipeDistributor,
	PipeJunction,
	ProjectileMob,
	Pump,
	Tank,
	Turret,
	Vent,
	Wall,
	Well,
} from '../world/Entity.js';
import {
	EntityAnimateSpriteAttribute,
	EntityBuildableAttribute,
	EntityChainAttribute,
	EntityHealthAttribute,
	EntityInflowAttribute,
	EntityMaterialOverlayAttribute,
	EntityMaterialPickerAttribute,
	EntityMaterialStorageAttribute,
	EntityMaterialStorageAttributeType,
	EntityNonEmptyMaterialStorage,
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

let standardDuration = 40;

let getMaterialCounts = (count: number): ResourceUtils.Count<Material>[] =>
	util.enumValues(Material).map(material => new ResourceUtils.Count(material, count));

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
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Extractor'));
			case Tool.REINFORCED_EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Reinforced Extractor'));
			case Tool.QUADRATIC_EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Quadratic Extractor'));
			case Tool.LASER_EXTRACTOR:
				return EntityCreator.createToolExtractor(findEntityMetadata('buildings', 'Laser Extractor'));

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
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Thermal Generator'));
			case Tool.SOLAR_ARRAY:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Solar Array'));
			case Tool.METHANE_BURNER:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Methane Burner'));
			case Tool.GRAPHITE_BURNER:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Graphite Burner'));
			case Tool.THERMITE_REACTOR:
				return EntityCreator.createToolGenerator(findEntityMetadata('buildings', 'Thermite Reactor'));
			case Tool.CONDUCTOR:
				return EntityCreator.createToolConductor(findEntityMetadata('buildings', 'Conductor'));
			case Tool.BATTERY:
				return EntityCreator.createToolBattery(findEntityMetadata('buildings', 'Battery'));

			case Tool.AIR_VENT:
				return EntityCreator.createToolVent(findEntityMetadata('buildings', 'Air Vent'));
			case Tool.WATER_VENT:
				return EntityCreator.createToolVent(findEntityMetadata('buildings', 'Water Vent'));
			case Tool.METHANE_VENT:
				return EntityCreator.createToolVent(findEntityMetadata('buildings', 'Methane Vent'));

			case Tool.PUMP:
				return EntityCreator.createToolPump(findEntityMetadata('buildings', 'Pump'));
			case Tool.POWERED_PUMP:
				return EntityCreator.createToolPump(findEntityMetadata('buildings', 'Powered Pump'));
			case Tool.WELL:
				return EntityCreator.createToolWell(findEntityMetadata('buildings', 'Well'));

			case Tool.PIPE:
				return EntityCreator.createToolPipe(findEntityMetadata('buildings', 'Pipe'), rotation);
			case Tool.PIPE_BRIDGE:
				return EntityCreator.createToolPipeBridge(findEntityMetadata('buildings', 'Pipe Bridge'), rotation);
			case Tool.PIPE_DISTRIBUTOR:
				return EntityCreator.createToolPipeDistributor(findEntityMetadata('buildings', 'Pipe Distributor'));
			case Tool.PIPE_JUNCTION:
				return EntityCreator.createToolPipeJunction(findEntityMetadata('buildings', 'Pipe Junction'));
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

	private static createBuilding(metadata: ParsedLine<typeof sectionFields.buildings>, rotation?: Rotation, tilingSize?: Vector): Entity {
		let entity = new Entity(metadata.name, metadata.description, new Vector(metadata.size), rotation, tilingSize);
		entity.addAttribute(new EntityBuildableAttribute(metadata.buildTime, metadata.buildCost));
		entity.addAttribute(new EntityHealthAttribute(metadata.health, true));
		return entity;
	}

	private static addTransportChainAttribute(entity: Entity,
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

	private static createToolExtractor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Extractor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.powerInput, metadata.heatOutput, metadata.output as number[]);
	}

	private static createToolConveyor(metadata: ParsedLine<typeof sectionFields.buildings>, packed: boolean, rotation: Rotation) {
		let entity = this.createBuilding(metadata, rotation);
		let type = packed ? EntityMaterialStorageAttributeType.PACKED : EntityMaterialStorageAttributeType.NORMAL;
		let [materialStorageAttribute, timedAttribute] = this.addTransportChainAttribute(entity, metadata, type, RotationUtils.except(RotationUtils.opposite(rotation)), [rotation]);
		entity.addAttribute(new EntityMaterialOverlayAttribute(materialStorageAttribute, timedAttribute, rotation));
		return entity;
	}

	private static createToolDistributorJunction(metadata: ParsedLine<typeof sectionFields.buildings>, distributor: boolean) {
		// todo rate should depend on what conveyor it's adjacent to
		let entity = this.createBuilding(metadata);
		util.enumValues(Rotation).forEach(rotation => {
			let outputRotations = distributor ? RotationUtils.except(RotationUtils.opposite(rotation)) : [rotation];
			this.addTransportChainAttribute(entity, metadata, EntityMaterialStorageAttributeType.NORMAL, [rotation], outputRotations);
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
		let [materialStorageAttribute, timedAttribute] = this.addTransportChainAttribute(entity, metadata, EntityMaterialStorageAttributeType.ANY, [], [rotation]);
		let materialPickerAttribute = new EntityMaterialPickerAttribute();
		entity.addAttribute(materialPickerAttribute);
		entity.addAttribute(new EntityInflowAttribute(materialPickerAttribute, materialStorageAttribute, [rotation]));
		entity.addAttribute(new EntityAnimateSpriteAttribute(entity.container!.children[0] as AnimatedSprite, timedAttribute, 1));
		return entity;
	}

	private static createToolFactory(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Factory(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.materialInput, metadata.powerInput, metadata.heatOutput, metadata.output as ResourceUtils.Count<Material>);
	}

	private static createToolGenerator(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Generator(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.materialInput, metadata.powerInput, metadata.heatOutput, metadata.liquidInput[0], metadata.output as number);
	}

	private static createToolConductor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Conductor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolBattery(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Battery(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolVent(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Vent(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.liquidInput[0], metadata.powerInput, metadata.output as number);
	}

	private static createToolPump(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Pump(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.powerInput, metadata.output as number[]);
	}

	private static createToolWell(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Well(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.powerInput, new ResourceUtils.Count(Liquid.WATER, metadata.output as number));
	}

	private static createToolPipe(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		return new Pipe(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number, rotation);
	}

	private static createToolPipeBridge(metadata: ParsedLine<typeof sectionFields.buildings>, rotation: Rotation) {
		// todo get 4 from metadata
		return new PipeBridge(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number, rotation, 4);
	}

	private static createToolPipeDistributor(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new PipeDistributor(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolPipeJunction(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new PipeJunction(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolTank(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Tank(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.output as number);
	}

	private static createToolWall(metadata: ParsedLine<typeof sectionFields.buildings>) {
		return new Wall(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health);
	}

	private static createToolTurret(metadata: ParsedLine<typeof sectionFields.turrets>) {
		return new Turret(metadata.name, metadata.description, new Vector(metadata.size), metadata.buildTime, metadata.buildCost, metadata.health, metadata.attackRate, metadata.damage, metadata.materialInput, metadata.accuracy, metadata.range, metadata.projectileSpeed);
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
