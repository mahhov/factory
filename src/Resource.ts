import {ColorSource} from 'pixi.js';

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
				return '#4db856';
			case Resource.LEAD:
				return '#aa4db8';
			case Resource.SAND:
				return '#b8764d';
			case Resource.GLASS:
				return '#4db898';
		}
	};
}

export default Resource;
