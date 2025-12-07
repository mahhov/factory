import {
	Base,
	Battery,
	Clear,
	Conductor,
	Dispenser,
	Empty,
	Extractor,
	Factory,
	Generator,
	LiquidDeposit,
	MaterialDeposit,
	Pipe,
	PipeDistributor,
	PipeJunction,
	Projectile,
	ProjectileMob,
	Pump,
	Storage,
	Tank,
	Turret,
	Vent,
	Wall,
	Well,
} from '../world/Entity.js';
import {
	EntityAnimateSpriteAttribute,
	EntityBuildableAttribute,
	EntityCoolantConsumeAttribute,
	EntityCoolantProduceAttribute,
	EntityDamageTargetAttribute,
	EntityDescriptionAttribute,
	EntityDirectionMovementAttribute,
	EntityExpireProjectileAttribute,
	EntityHealthAttribute,
	EntityInflowAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidDisplayAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidExtractorAttribute,
	EntityLiquidStorageAttribute,
	EntityLiquidTransportAttribute,
	EntityMaterialConsumeAttribute,
	EntityMaterialDisplayAttribute,
	EntityMaterialExtractorAttribute,
	EntityMaterialOverlayAttribute,
	EntityMaterialPickerAttribute,
	EntityMaterialProduceAttribute,
	EntityMaterialStorageAttribute,
	EntityNameAttribute,
	EntityNonEmptyLiquidStorage,
	EntityNonEmptyMaterialStorage,
	EntityOutflowAttribute,
	EntityPowerConductAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerProduceAttribute,
	EntityPowerStorageAttribute,
	EntitySpawnProjectileAttribute,
	EntityTimedAttribute,
	EntityTransportAttribute,
} from '../world/EntityAttribute.js';
import MobLogic from '../world/MobLogic.js';
import PlayerLogic from '../world/PlayerLogic.js';
import {ResourceUtils} from '../world/Resource.js';
import {FreeWorldLayer, LiveGridWorldLayer, OrderedGridWorldLayer, Tile, World} from '../world/World.js';
import Counter from './Counter.js';
import Vector from './Vector.js';

type Class = new (...args: any[]) => any;
type CustomSerializerType<Original extends any, Serialized extends any> = {
	serialize: (original: Original) => Serialized,
	deserialize: (serialized: Serialized) => Original,
};
type TypeMapValue = Class | CustomSerializerType<any, any> | null;
type TypeMap = Record<string, TypeMapValue>;

let typeMap: TypeMap = {
	MobLogic,
	PlayerLogic,
	Tile,
	LiveGridWorldLayer,
	OrderedGridWorldLayer,
	FreeWorldLayer,
	World,

	Empty,
	Clear,
	Wall,
	Extractor,
	Factory,
	Storage,
	Dispenser,
	Generator,
	Conductor,
	Battery,
	Vent,
	Pump,
	Well,
	Pipe,
	PipeDistributor,
	PipeJunction,
	Tank,
	Base,
	Turret,
	MaterialDeposit,
	LiquidDeposit,
	Mob: ProjectileMob,
	Projectile,

	EntityNameAttribute,
	EntityDescriptionAttribute,
	EntityBuildableAttribute,
	EntityHealthAttribute,
	EntityTimedAttribute,
	EntityMaterialProduceAttribute,
	EntityMaterialExtractorAttribute,
	EntityMaterialConsumeAttribute,
	EntityMaterialStorageAttribute,
	EntityNonEmptyMaterialStorage,
	EntityTransportAttribute,
	EntityOutflowAttribute,
	EntityInflowAttribute,
	EntityPowerProduceAttribute,
	EntityPowerConsumeAttribute,
	EntityPowerStorageAttribute,
	EntityPowerConductAttribute,
	EntityCoolantProduceAttribute,
	EntityCoolantConsumeAttribute,
	EntityLiquidExtractorAttribute,
	EntityLiquidDryExtractorAttribute,
	EntityLiquidConsumeAttribute,
	EntityLiquidStorageAttribute,
	EntityNonEmptyLiquidStorage,
	EntityLiquidTransportAttribute,
	EntityMaterialPickerAttribute,
	EntityMaterialDisplayAttribute,
	EntityLiquidDisplayAttribute,
	EntitySpawnProjectileAttribute,
	EntityDirectionMovementAttribute,
	EntityDamageTargetAttribute,
	EntityExpireProjectileAttribute,
	EntityMaterialOverlayAttribute,
	EntityAnimateSpriteAttribute,

	Vector,
	Counter,
	Count: ResourceUtils.Count,

	// MultilineText: {
	// 	serialize: (multilineText: MultilineText): string => 'serialized',
	// 	deserialize: (text: string): MultilineText => {
	// 		let multilineText = new MultilineText();
	// 		multilineText.type(text);
	// 		return multilineText;
	// 	},
	// } as CustomSerializerType<MultilineText, string>,
	// Container: {
	// 	serialize: (container: Container): string => 'serialized',
	// 	deserialize: (text: string): Container => {
	// 		let container = new Container();
	// 		container.type(text);
	// 		return container;
	// 	},
	// } as CustomSerializerType<Container, string>,
	// AnimatedSprite: {
	// 	serialize: (animatedSprite: AnimatedSprite): string => 'serialized',
	// 	deserialize: (text: string): AnimatedSprite => {
	// 		let animatedSprite = new AnimatedSprite();
	// 		animatedSprite.type(text);
	// 		return animatedSprite;
	// 	},
	// } as CustomSerializerType<AnimatedSprite, string>,
};

export default class Serializer {
	private static mapEntries(obj: Record<string, any>, handler: (arg: any) => any): Record<string, any> {
		return Object.fromEntries(Object.entries(obj)
			.map(([key, value]) => [key, handler(value)]));
	}

	static serialize(obj: any): any {
		// primitive
		if (obj === null || typeof obj !== 'object')
			return obj;

		// array
		if (Array.isArray(obj))
			return obj.map(value => Serializer.serialize(value));

		let typeName = obj.constructor.name;
		let Type: TypeMapValue | undefined = typeMap[obj.constructor.name];

		// object literal
		if (typeName === 'Object')
			return Serializer.mapEntries(obj, value => Serializer.serialize(value));

		// unmapped class instance
		if (Type === undefined) {
			console.warn('Missing type:', typeName);
			return;
		}

		// Type null
		if (Type === null)
			return null;

		// Type custom serializer
		if (typeof Type === 'object') {
			let x = (Type as CustomSerializerType<any, any>).serialize(obj);
			return {type__: obj.constructor.name, wrapped: x};
		}

		// Type class
		let x = Serializer.mapEntries(obj, value => Serializer.serialize(value));
		x.type__ = obj.constructor.name;
		return x;
	}

	static deserialize(obj: any): any {
		// primitive
		if (obj === null || typeof obj !== 'object')
			return obj;

		// array
		if (Array.isArray(obj))
			return obj.map(value => Serializer.deserialize(value));

		// object literal
		if (!obj.type__)
			return Serializer.mapEntries(obj, value => Serializer.deserialize(value));

		let Type: TypeMapValue | undefined = typeMap[obj.type__];

		// unmapped class instance
		if (Type === undefined) {
			console.warn('Missing type:', obj.type__);
			return;
		}

		// Type null
		if (Type === null)
			return null;

		// Type custom serializer
		if (typeof Type === 'object')
			return (Type as CustomSerializerType<any, any>).deserialize(obj.wrapped);

		// Type class
		let x = Serializer.mapEntries(obj, value => Serializer.deserialize(value));
		return Object.assign(Object.create((Type as Class).prototype), x);
	}
}
