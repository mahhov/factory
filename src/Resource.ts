import {ColorSource} from 'pixi.js';
import Color from './Color.js';

enum Resource {
	COPPER, LEAD, SAND, GLASS,
}

namespace Resource {
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
		switch (resource) {
			case Resource.COPPER:
				return Color.RESOURCE_COPPER;
			case Resource.LEAD:
				return Color.RESOURCE_LEAD;
			case Resource.SAND:
				return Color.RESOURCE_SAND;
			case Resource.GLASS:
				return Color.RESOURCE_GLASS;
		}
	};
}

export default Resource;
