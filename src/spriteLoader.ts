import {ColorReplaceFilter} from 'pixi-filters';
import {AnimatedSprite, Assets, ColorSource, Sprite} from 'pixi.js';

enum Resource {
	CONVEYOR = 'conveyor',
	TERRAIN = 'terrain',
}

let path = (resource: Resource) => `../resources/${resource}/${resource}.json`;

let preload = () =>
	Promise.all(Object.values(Resource).map(resource => Assets.load(path(resource))));

let animation = (resource: Resource, animation: string) => {
	let sheet = Assets.get(path(resource));
	return new AnimatedSprite(sheet.animations[animation]);
};

let frame = (resource: Resource, frame: string) => {
	let sheet = Assets.get(path(resource));
	return new Sprite(sheet.textures[frame]);
};

let coloredFrame = (resource: Resource, framee: string, oldColor: ColorSource, newColor: ColorSource) => {
	let sprite = frame(resource, framee);
	sprite.filters = [new ColorReplaceFilter({
		originalColor: oldColor,
		targetColor: newColor,
		tolerance: 0.001,
	})];
	return sprite;
};

// todo cache

export default {Resource, preload, animation, frame, coloredFrame};
