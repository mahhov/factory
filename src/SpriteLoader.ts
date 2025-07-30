import {MultiColorReplaceFilter} from 'pixi-filters';
import {AnimatedSprite, Assets, ColorSource, Sprite} from 'pixi.js';

namespace SpriteLoader {
	export enum Resource {
		CONVEYOR = 'conveyor',
		TERRAIN = 'terrain',
	}

	export let path = (resource: Resource) => `../resources/${resource}/${resource}.json`;

	export let preload = () =>
		Promise.all(Object.values(Resource).map(resource => Assets.load(path(resource))));

	export let animation = (resource: Resource, animation: string) => {
		let sheet = Assets.get(path(resource));
		return new AnimatedSprite(sheet.animations[animation]);
	};

	export let getSprite = (resource: Resource, frame: string): Sprite => {
		let sheet = Assets.get(path(resource));
		return new Sprite(sheet.textures[frame]);
	};

	export let getColoredSprite = (resource: Resource, frame: string, newColors: ColorSource[]): Sprite => {
		let sprite = getSprite(resource, frame);
		let oldColors = ['#ff0000', '#00ff00', '#0000ff'];
		let replacements = newColors.map((newColor, i) => [oldColors[i], newColor] as [ColorSource, ColorSource]);
		sprite.filters = [new MultiColorReplaceFilter({
			replacements,
			tolerance: 0.001,
		})];
		return sprite;
	};
}

// todo cache

export default SpriteLoader;
