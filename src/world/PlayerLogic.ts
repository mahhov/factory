import Painter from '../graphics/Painter.js';
import MultilineText from '../ui/MultilineText.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Base} from './Entity.js';
import {EntityMaterialStorageAttribute, TooltipType} from './EntityAttribute.js';
import {Material, ResourceUtils} from './Resource.js';

export class PlayerLogic {
	// todo make base non-salvageable
	readonly base: Base = new Base();
	private readonly multilineText: MultilineText;

	constructor(painter: Painter) {
		this.materials.add(new ResourceUtils.Count(Material.IRON, 500));
		util.enumValues(Material).forEach(material =>
			this.materials.add(new ResourceUtils.Count(material, 500)));
		this.multilineText = new MultilineText(painter, new Vector(.005));
	}

	get materials(): EntityMaterialStorageAttribute {
		return this.base.getAttribute(EntityMaterialStorageAttribute)!;
	}

	tick() {
		this.multilineText.lines = this.materials.tooltip(TooltipType.WORLD);
		this.multilineText.tick();
	}
}
