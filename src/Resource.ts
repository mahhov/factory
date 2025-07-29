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

	export let string = (value: Resource): string => {
		return Resource[value];
	};
}

export default Resource;
