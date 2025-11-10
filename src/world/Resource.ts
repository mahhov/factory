import Color from '../graphics/Color.js';

export enum Material {
	IRON, FLUX_SAND, SULPHUR,
	STEEL, TITANIUM,
	METAGLASS, PLASTEEL, GRAPHITE,
	THERMITE, EXIDIUM,
}

export enum Liquid {
	WATER, METHANE,
}

export type Resource = Material | Liquid;

export namespace ResourceUtils {
	export class Count<T extends Resource> {
		readonly resource: T;
		readonly quantity: number;

		constructor(resource: T, quantity: number) {
			this.resource = resource;
			this.quantity = quantity;
		}

		static fromTuples<T extends Resource>(tuples: [T, number][]): Count<T>[] {
			return tuples.map(tuple => new Count(...tuple));
		}
	}

	export let materialString = (material: Material): string => {
		return Material[material];
	};

	export let liquidString = (liquid: Liquid): string => {
		return Liquid[liquid];
	};

	export let materialColor = (material: Material): string => {
		let key = `MATERIAL_${Material[material]}` as unknown as keyof typeof Color;
		return Color[key];
	};

	export let liquidColor = (liquid: Liquid): string => {
		let key = `LIQUID_${Liquid[liquid]}` as unknown as keyof typeof Color;
		return Color[key];
	};
}
