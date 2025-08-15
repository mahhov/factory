import {ColorSource} from 'pixi.js';
import Color from '../graphics/Color.js';

export enum Resource {
	COPPER, IRON, CARBON, STEEL,
	A, B, X, Y,
}

export namespace ResourceUtils {
	export class Count {
		readonly resource: Resource;
		readonly quantity: number;

		constructor(resource: Resource, quantity: number) {
			this.resource = resource;
			this.quantity = quantity;
		}

		static fromTuples(tuples: [Resource, number][]): Count[] {
			return tuples.map(tuple => new Count(...tuple));
		}
	}

	export let string = (resource: Resource): string => {
		return Resource[resource];
	};

	export let color = (resource: Resource): ColorSource => {
		let key = `RESOURCE_${Resource[resource]}` as unknown as keyof typeof Color;
		return Color[key];
	};

}
