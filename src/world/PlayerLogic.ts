import Painter from '../graphics/Painter.js';
import MultilineText from '../ui/MultilineText.js';
import Vector from '../util/Vector.js';
import {EntityContainerAttribute, getResourceCounts} from './EntityAttribute.js';
import {Resource, ResourceUtils} from './Resource.js';

export class PlayerLogic {
	readonly materials: EntityContainerAttribute;
	private readonly multilineText: MultilineText;

	constructor(painter: Painter) {
		this.materials = new EntityContainerAttribute(Infinity, getResourceCounts(500));
		for (let resource = Resource.IRON; resource <= Resource.METHANE; resource++)
			this.materials.add(new ResourceUtils.Count(resource, 500));

		this.multilineText = new MultilineText(painter, new Vector(.005));
	}

	tick() {
		this.multilineText.lines = this.materials.tooltip;
		this.multilineText.tick();
	}
}

// todo:
//   queue, build 1 at a time. add a builder player resource, that building entities consumes. more consumed the farther away the entity is
//   queue building recycling
//   metadata entities
//   recycle materials on destruction
