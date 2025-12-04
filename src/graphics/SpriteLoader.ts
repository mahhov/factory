import {MultiColorReplaceFilter} from 'pixi-filters';
import {Assets, ColorSource, RenderTexture, Sprite, Texture} from 'pixi.js';
import type {Renderer} from 'pixi.js/lib/rendering/renderers/types.js';

namespace SpriteLoader {
	export enum Resource {
		CONVEYOR = 'conveyor',
		TERRAIN = 'terrain',
	}

	let path = (resource: Resource) => `./resources/${resource}/${resource}.json`;

	let savedRenderer: Renderer | null = null;
	export let init = (renderer: Renderer) => {
		savedRenderer = renderer;
		return Promise.all(Object.values(Resource).map(resource => Assets.load(path(resource))));
	};

	export let getSprite = (resource: Resource, frame: string): Sprite => {
		let sheet = Assets.get(path(resource));
		return new Sprite(sheet.textures[frame]);
	};

	let createColoredSprite = (resource: Resource, frame: string, newColors: ColorSource[]): Sprite => {
		let sprite = getSprite(resource, frame);
		let oldColors = ['#ff0000', '#00ff00', '#0000ff'];
		let replacements = newColors.map((newColor, i) => [oldColors[i], newColor] as [ColorSource, ColorSource]);
		sprite.filters = [new MultiColorReplaceFilter({
			replacements,
			tolerance: 0.001,
		})];
		return sprite;
	};

	let createColoredTexture = (resource: Resource, frame: string, newColors: ColorSource[]): Texture => {
		let sprite = createColoredSprite(resource, frame, newColors);
		let renderTexture = RenderTexture.create({width: sprite.width, height: sprite.height});
		savedRenderer!.render({container: sprite, target: renderTexture});
		return renderTexture;
	};

	let coloredTextureCache: Record<string, Texture> = {};
	export let getColoredTexture = (resource: Resource, frame: string, newColors: ColorSource[]): Texture => {
		let key = [resource, frame, ...newColors].join();
		coloredTextureCache[key] ||= createColoredTexture(resource, frame, newColors);
		return coloredTextureCache[key];
	};
}

export default SpriteLoader;
