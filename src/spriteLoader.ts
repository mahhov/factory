import {AnimatedSprite, Assets, Sprite} from 'pixi.js';

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

export default {Resource, preload, animation, frame};
