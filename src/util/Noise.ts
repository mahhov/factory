import {createNoise2D} from 'simplex-noise';
import {Entity, LiquidDeposit, MaterialDeposit} from '../world/Entity.js';
import {Liquid, Material} from '../world/Resource.js';
import {GridWorldLayer} from '../world/World.js';
import Vector from './Vector.js';

let noise = createNoise2D();

// todo use metadata.md
let resourceSettings = [
	{resource: Material.IRON, scale: 0.05, threshold: 0.70, offset: 0},
	{resource: Material.FLUX_SAND, scale: 0.02, threshold: 0.85, offset: 100},
	{resource: Material.SULPHUR, scale: 0.05, threshold: 0.88, offset: 200},
	{resource: Material.TITANIUM, scale: 0.08, threshold: 0.75, offset: 300},
	{resource: Material.GRAPHITE, scale: 0.08, threshold: 0.90, offset: 400},

	{resource: Liquid.WATER, scale: 0.05, threshold: 0.85, offset: 500, isLiquid: true},
	{resource: Liquid.METHANE, scale: 0.08, threshold: 0.90, offset: 600, isLiquid: true},
];

export let generateTerrain = (terrainLayer: GridWorldLayer<Entity>) => {
	new Vector(0).iterate(terrainLayer.size).forEach(v => {
		for (let setting of resourceSettings) {
			let {resource, scale, threshold, offset, isLiquid} = setting;
			let noiceV = v.scale(new Vector(scale)).add(new Vector(offset));
			let noiseValue = noise(noiceV.x, noiceV.y);
			if (noiseValue > threshold) {
				let deposit = !isLiquid ? new MaterialDeposit(resource as Material) : new LiquidDeposit(resource as Liquid);
				terrainLayer.replaceTileable(v, deposit);
				break;
			}
		}
	});
};
