import Painter from '../graphics/Painter.js';
import MultilineText from '../ui/MultilineText.js';
import Vector from '../util/Vector.js';
import {getMaterialResourceCounts} from './Entity.js';
import {EntityMaterialStorageAttribute} from './EntityAttribute.js';
import {Resource, ResourceUtils} from './Resource.js';

export class PlayerLogic {
	readonly materials: EntityMaterialStorageAttribute;
	built: boolean = false;
	private readonly multilineText: MultilineText;

	constructor(painter: Painter) {
		this.materials = new EntityMaterialStorageAttribute(Infinity, getMaterialResourceCounts(500));
		for (let resource = Resource.IRON; resource <= Resource.METHANE; resource++)
			this.materials.add(new ResourceUtils.Count(resource, 500));

		this.multilineText = new MultilineText(painter, new Vector(.005));
	}

	tick() {
		this.built = false;
		this.multilineText.lines = this.materials.tooltip;
		this.multilineText.tick();
	}
}
