import {Text} from 'pixi.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import {EntityContainerAttribute, getResourceCounts} from './EntityAttribute.js';
import {Resource, ResourceUtils} from './Resource.js';
import {World} from './World.js';

export class PlayerLogic {
	readonly materials: EntityContainerAttribute;

	constructor(painter: Painter) {
		this.materials = new EntityContainerAttribute(Infinity, getResourceCounts(500));
		for (let resource = Resource.IRON; resource <= Resource.METHANE; resource++)
			this.materials.add(new ResourceUtils.Count(resource, 500));

		painter.textUiContainer.addChild(new Text({
			text: 'woah',
			style: {
				fontFamily: 'Arial',
				fontSize: 20,
				fill: Color.DEFAULT_TEXT,
			},
		}));
	}

	tick(world: World) {
	}
}
