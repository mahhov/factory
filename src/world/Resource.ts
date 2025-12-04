import {textureColors} from '../graphics/generatedTextures.js';
import {toCamelCase, toTitleCase} from '../util/stringCase.js';

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
	}

	export let materialString = (material: Material): string => {
		return toTitleCase(Material[material]);
	};

	export let liquidString = (liquid: Liquid): string => {
		return toTitleCase(Liquid[liquid]);
	};

	export let materialColor = (material: Material): string => {
		let key = toCamelCase(Material[material]) as unknown as keyof typeof textureColors;
		return textureColors[key];
	};

	export let liquidColor = (liquid: Liquid): string => {
		let key = toCamelCase(Liquid[liquid]) as unknown as keyof typeof textureColors;
		return textureColors[key];
	};
}
