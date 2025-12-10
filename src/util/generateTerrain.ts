import {createNoise2D} from 'simplex-noise';
import {Entity, LiquidDeposit, MaterialDeposit} from '../world/Entity.js';
import {Liquid, Material} from '../world/Resource.js';
import {GridWorldLayer} from '../world/World.js';
import Vector from './Vector.js';

let noise = createNoise2D();

// todo use metadata.md
enum Scale {
	SMALL = .08,
	MEDIUM = .05,
	LARGE = .02,
}

enum Frequency {
}

let resourceSettings = [
	{resource: Material.IRON, scale: Scale.MEDIUM, threshold: 0.80, offset: 0},
	{resource: Material.FLUX_SAND, scale: Scale.LARGE, threshold: 0.85, offset: 100},
	{resource: Material.SULPHUR, scale: Scale.MEDIUM, threshold: 0.88, offset: 200},
	{resource: Material.TITANIUM, scale: Scale.SMALL, threshold: 0.8, offset: 300},
	{resource: Material.GRAPHITE, scale: Scale.SMALL, threshold: 0.85, offset: 400},

	{resource: Liquid.WATER, scale: Scale.MEDIUM, threshold: 0.85, offset: 500, isLiquid: true},
	{resource: Liquid.METHANE, scale: Scale.SMALL, threshold: 0.90, offset: 600, isLiquid: true},
];

export let generateTerrain = (terrainLayer: GridWorldLayer<Entity>) => {
	for (let x = 0; x < terrainLayer.size.x; x++)
		for (let y = 0; y < terrainLayer.size.y; y++) {
			let position = new Vector(x, y);
			for (let setting of resourceSettings) {
				let {resource, scale, threshold, offset, isLiquid} = setting;
				let noicePosition = position.scale(scale).add(new Vector(offset));
				let noiseValue = noise(noicePosition.x, noicePosition.y);
				if (noiseValue > threshold) {
					let deposit = !isLiquid ? new MaterialDeposit(resource as Material) : new LiquidDeposit(resource as Liquid);
					terrainLayer.replaceTileable(position, deposit);
					break;
				}
			}
		}
};
