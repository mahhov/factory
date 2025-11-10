import Painter from '../graphics/Painter.js';
import MultilineText from '../ui/MultilineText.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {getMaterialCounts} from './Entity.js';
import {EntityMaterialStorageAttribute} from './EntityAttribute.js';
import {Material, ResourceUtils} from './Resource.js';

export class PlayerLogic {
	readonly materials: EntityMaterialStorageAttribute;
	built: boolean = false;
	private readonly multilineText: MultilineText;

	constructor(painter: Painter) {
		this.materials = new EntityMaterialStorageAttribute(Infinity, getMaterialCounts(500), [], false);
		util.enumValues(Material).forEach(material =>
			this.materials.add(new ResourceUtils.Count(material, 500)));

		this.multilineText = new MultilineText(painter, new Vector(.005));
	}

	tick() {
		this.built = false;
		this.multilineText.lines = this.materials.tooltip(false);
		this.multilineText.tick();
	}
}
