import {CanvasSource, Texture, TextureStyle} from 'pixi.js';

TextureStyle.defaultOptions.scaleMode = 'nearest';

// maps [1,N] xy to [0,N-1] xy
// maps [1,N] x2y2 to wh
// creates concentric shapes nesting each color
let cornersToConcentricRects = (xyx2y2s: [number, number, number, number][], colors: string[]): [number, number, number, number, string][] =>
	colors.flatMap((color, i) =>
		xyx2y2s.map(([x1, y1, x2, y2]) => [x1 - 1 + i, y1 - 1 + i, x2 - x1 + 1 - i * 2, y2 - y1 + 1 - i * 2, color] as [number, number, number, number, string]));

let rectToTexture = (size: number, rects: [number, number, number, number, string][]): Texture => {
	let canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	let ctx = canvas.getContext('2d');
	rects.forEach(([x, y, width, height, color]) => {
		ctx!.fillStyle = color;
		ctx!.fillRect(x, y, width, height);
	});
	let source = new CanvasSource({resource: canvas});
	return new Texture({source});
};

class ParameterizedGeneratedTexture<T extends any[]> {
	private readonly textureCache: Record<string, Texture> = {};
	private readonly generator: (...params: T) => Texture;

	constructor(generator: (...params: T) => Texture) {
		this.generator = generator;
	}

	texture(...params: T): Texture {
		let key = params.join();
		this.textureCache[key] ||= this.generator(...params);
		return this.textureCache[key];
	}
}

class SizedParameterizedGeneratedTexture<T extends any[]> extends ParameterizedGeneratedTexture<T> {
	protected readonly size: number;
	private readonly rectsHandler: (...params: T) => [number, number, number, number, string][];

	constructor(size: number, rectsHandler: (...params: T) => [number, number, number, number, string][]) {
		super((...params: T) => rectToTexture(size, rectsHandler(...params)));
		this.size = size;
		this.rectsHandler = rectsHandler;
	}
}

export class AnimatedGeneratedTextures {
	readonly textures: Texture[];

	constructor(size: number, rectsArray: [number, number, number, number, string][][], frameOrder?: number[]) {
		let textures = rectsArray.map(rects => rectToTexture(size, rects));
		this.textures = frameOrder ? frameOrder.map(i => textures[i]) : textures;
	}
}

export let textureColors = {
	white: '#ffffff',
	black: '#000000',

	tier1: '#00ff00',
	tier1Secondary: '#174217',
	tier2: '#ff8800',
	tier2Secondary: '#43290a',
	tier3: '#00ffaa',
	tier3Secondary: '#18372c',
	tier4: '#ff00ff',
	tier4Secondary: '#880088',

	cornerGrey: '#dddddd',
	wallGrey: '#444444',
	axilGrey: '#222222',
	backgroundGrey: '#111111',

	iron: '#d4a56e',
	ironSecondary: '#a37a4b',
	ironTernary: '#ffcc99',
	fluxSand: '#f7e560',
	fluxSandSecondary: '#baab4d',
	fluxSandTernary: '#d5c659',
	sulphur: '#527149',
	sulphurSecondary: '#344530',
	titanium: '#4457c8',
	titaniumSecondary: '#7788e8',
	titaniumBackground: '#151a35',
	graphite: '#9772ad',
	graphiteSecondary: '#413d45',
	graphiteTernary: '#bc9ed3',
	graphiteBackground: '#272429',

	steel: '#aaaaaa',
	metaglass: '#11ced5',
	metaglassSecondary: '#444466',
	plasteel: '#56b86c',
	thermite: '#e74c3c',
	thermiteSecondary: '#ffaa00',
	exidium: '#ff33cc',
	exidiumSecondary: '#91347b',

	water: '#4070D0',
	waterSecondary: '#a1b1ff',
	methane: '#686737',
	methaneSecondary: '#4a955a',

	solar: '#000044',
	power: '#ffae00',

	hostileRed: '#d83030',
	hostileOrange: '#faca10',
};

let extractorBase = (size: number): [number, number, number, number, string][] => [
	[0, 0, size, size, textureColors.wallGrey],
	[1, 1, size - 2, size - 2, textureColors.black],
	[0, 0, 1, 1, textureColors.cornerGrey],
	[size - 1, 0, 1, 1, textureColors.cornerGrey],
	[0, size - 1, 1, 1, textureColors.cornerGrey],
	[size - 1, size - 1, 1, 1, textureColors.cornerGrey],
];

let factoryBase = (size: number, wallSize: number = 4): [number, number, number, number, string][] => [
	[0, 0, size, size, textureColors.backgroundGrey],
	[(size - wallSize) / 2, 0, wallSize, 1, textureColors.wallGrey],
	[(size - wallSize) / 2, size - 1, wallSize, 1, textureColors.wallGrey],
	[0, (size - wallSize) / 2, 1, wallSize, textureColors.wallGrey],
	[size - 1, (size - wallSize) / 2, 1, wallSize, textureColors.wallGrey],
	[0, 0, 1, 1, textureColors.cornerGrey],
	[size - 1, 0, 1, 1, textureColors.cornerGrey],
	[0, size - 1, 1, 1, textureColors.cornerGrey],
	[size - 1, size - 1, 1, 1, textureColors.cornerGrey],
];

let generatorBase = (size: number): [number, number, number, number, string][] => [
	[0, 0, size, size, textureColors.wallGrey],
	[1, 1, size - 2, size - 2, textureColors.backgroundGrey],
	[0, 0, 1, 1, textureColors.cornerGrey],
	[size - 1, 0, 1, 1, textureColors.cornerGrey],
	[0, size - 1, 1, 1, textureColors.cornerGrey],
	[size - 1, size - 1, 1, 1, textureColors.cornerGrey],
];

export let generatedTextures = {
	fullRect: new SizedParameterizedGeneratedTexture(1, (color: string) => [
		[0, 0, 1, 1, color],
	]),

	ironDeposit: new AnimatedGeneratedTextures(16, [[
		[2, 3, 6, 4, textureColors.iron],
		[10, 5, 4, 6, textureColors.ironSecondary],
		[1, 10, 3, 4, textureColors.ironSecondary],
		[10, 8, 2, 2, textureColors.ironTernary],
	]]),
	fluxSandDeposit: new AnimatedGeneratedTextures(8, [[
		[0, 0, 8, 8, textureColors.fluxSandTernary],
		[0, 0, 4, 3, textureColors.fluxSandSecondary],
		[3, 4, 4, 4, textureColors.fluxSandSecondary],
		[1, 5, 2, 2, textureColors.fluxSandSecondary],
		[5, 1, 2, 2, textureColors.fluxSandSecondary],
		[4, 4, 1, 1, textureColors.fluxSandTernary],
		[7, 0, 1, 1, textureColors.fluxSandSecondary],
		[0, 7, 1, 1, textureColors.fluxSandSecondary],
	]]),
	sulphurDeposit: new AnimatedGeneratedTextures(8, [[
		[4, 1, 3, 2, textureColors.sulphur],
		[2, 5, 2, 2, textureColors.sulphur],
		[5, 2, 2, 2, textureColors.sulphurSecondary],
		[1, 7, 1, 1, textureColors.sulphurSecondary],
		[7, 1, 1, 1, textureColors.sulphurSecondary],
		[4, 4, 1, 1, textureColors.sulphur],
	]]),
	titaniumDeposit: new AnimatedGeneratedTextures(8, [[
		[0, 0, 8, 8, textureColors.titaniumBackground],
		[4, 4, 3, 3, textureColors.titanium],
		[1, 6, 1, 2, textureColors.titaniumSecondary],
		[6, 1, 2, 1, textureColors.titaniumSecondary],
		[0, 3, 2, 2, textureColors.titanium],
		[4, 4, 2, 2, textureColors.titaniumSecondary],
	]]),
	graphiteDeposit: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.graphiteBackground],
		[1, 1, 3, 3, textureColors.graphiteSecondary],
		[5, 4, 4, 4, textureColors.graphite],
		[11, 2, 3, 4, textureColors.graphiteSecondary],
		[2, 10, 4, 3, textureColors.graphite],
		[9, 11, 6, 4, textureColors.graphiteSecondary],
		[7, 6, 2, 2, textureColors.graphiteTernary],
		[4, 1, 1, 1, textureColors.graphiteTernary],
		[13, 13, 1, 1, textureColors.graphiteTernary],
	]]),

	waterDeposit: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.water],
		[7, 7, 2, 2, textureColors.waterSecondary],
		[3, 8, 2, 1, textureColors.waterSecondary],
		[11, 7, 2, 1, textureColors.waterSecondary],
	]]),
	methaneDeposit: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.methane],
		[7, 7, 3, 3, textureColors.methaneSecondary],
		[3, 3, 2, 2, textureColors.methaneSecondary],
		[11, 11, 2, 2, textureColors.methaneSecondary],
	]]),

	extractor: new AnimatedGeneratedTextures(16, [[
		...extractorBase(16),
		[5, 5, 6, 6, textureColors.tier1],
	]]),
	reinforcedExtractor: new AnimatedGeneratedTextures(24, [[
		...extractorBase(24),
		[8, 8, 8, 8, textureColors.tier2Secondary],
		[9, 9, 6, 6, textureColors.tier2],
	]]),
	quadraticExtractor: new AnimatedGeneratedTextures(32, [[
		...extractorBase(32),
		[13, 19, 6, 6, textureColors.tier3Secondary],
		[13, 7, 6, 6, textureColors.tier3Secondary],
		[7, 13, 6, 6, textureColors.tier3Secondary],
		[19, 13, 6, 6, textureColors.tier3Secondary],
		[14, 8, 4, 4, textureColors.tier3],
		[14, 20, 4, 4, textureColors.tier3],
		[8, 14, 4, 4, textureColors.tier3],
		[20, 14, 4, 4, textureColors.tier3],
	]]),
	laserExtractor: new AnimatedGeneratedTextures(32, [[
		...extractorBase(32),
		[12, 12, 8, 8, textureColors.tier4Secondary],
		[13, 13, 6, 6, textureColors.tier4],
	]]),
	extractorTop: new ParameterizedGeneratedTexture((size: number, color: string) => rectToTexture(size, [
		[size / 2 - 1, 0, 2, size, color],
		[0, size / 2 - 1, size, 2, color],
		[(size - 4) / 2, (size - 4) / 2, 4, 4, color],
	])),

	conveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, textureColors.cornerGrey],
		[3, 1, 2, 1, textureColors.wallGrey],
	]]),
	highSpeedConveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, textureColors.cornerGrey],
		[3, 1, 2, 1, textureColors.wallGrey],
		[3, 3, 2, 1, textureColors.wallGrey],
	]]),
	distributor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, textureColors.cornerGrey],
		[0, 3, 8, 2, textureColors.cornerGrey],
	]]),
	junction: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, textureColors.cornerGrey],
		[0, 3, 2, 2, textureColors.cornerGrey],
		[6, 3, 2, 2, textureColors.cornerGrey],
	]]),
	packedConveyor: new AnimatedGeneratedTextures(8, [[
		[2, 0, 4, 8, textureColors.cornerGrey],
		[3, 1, 2, 1, textureColors.wallGrey],
		[3, 3, 2, 1, textureColors.wallGrey],
	]]),
	storage: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.steel],
		[1, 1, 14, 14, textureColors.backgroundGrey],
		[2, 2, 12, 12, textureColors.wallGrey],
		[3, 3, 10, 10, textureColors.backgroundGrey],
		[7, 1, 2, 2, textureColors.steel],
		[7, 13, 2, 2, textureColors.steel],
		[1, 7, 2, 2, textureColors.steel],
		[13, 7, 2, 2, textureColors.steel],
	]]),
	dispenser: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, textureColors.cornerGrey],
		[2, 2, 4, 4, textureColors.wallGrey],
		[3, 3, 2, 5, textureColors.cornerGrey],
	], [
		[1, 1, 6, 6, textureColors.cornerGrey],
		[2, 2, 4, 4, textureColors.wallGrey],
		[3, 2, 2, 5, textureColors.cornerGrey],
	]]),
	// bridge: new AnimatedGeneratedTextures(8, [[
	// 	[2, 2, 4, 4, colors.wallGrey],
	// 	[3, 0, 2, 8, colors.cornerGrey],
	// 	[3, 1, 2, 1, colors.wallGrey],
	// ]]),

	steelSmelter: new AnimatedGeneratedTextures(16, [[
		...factoryBase(16),
		[6, 6, 4, 4, textureColors.steel],
	], [
		...factoryBase(16),
		[5, 5, 6, 6, textureColors.wallGrey],
		[6, 6, 4, 4, textureColors.steel],
	], [
		...factoryBase(16),
		[4, 4, 8, 8, textureColors.wallGrey],
		[6, 6, 4, 4, textureColors.steel],
		[7, 7, 2, 2, textureColors.white],
	],
	], [0, 1, 2, 1]),
	metaglassFoundry: new AnimatedGeneratedTextures(16, [[
		...factoryBase(16),
		[4, 4, 8, 8, textureColors.metaglassSecondary],
		[6, 6, 4, 4, textureColors.metaglass],
		[7, 7, 2, 2, textureColors.white],
	], [
		...factoryBase(16),
		[3, 3, 2, 2, textureColors.metaglassSecondary],
		[11, 3, 2, 2, textureColors.metaglassSecondary],
		[3, 11, 2, 2, textureColors.metaglassSecondary],
		[11, 11, 2, 2, textureColors.metaglassSecondary],
		[4, 4, 8, 8, textureColors.metaglassSecondary],
		[6, 6, 4, 4, textureColors.metaglass],
		[7, 7, 2, 2, textureColors.white],
	], [
		...factoryBase(16),
		[3, 3, 10, 10, textureColors.metaglassSecondary],
		[6, 6, 4, 4, textureColors.metaglass],
		[7, 7, 2, 2, textureColors.white],
	],
	], [0, 1, 2, 1]),
	plasteelMixer: new AnimatedGeneratedTextures(24, [[
		...factoryBase(24, 6),
		[6, 6, 12, 12, textureColors.axilGrey],
		[9, 9, 6, 6, textureColors.plasteel],
		[11, 7, 2, 10, textureColors.plasteel],
		[7, 11, 10, 2, textureColors.plasteel],
	], [
		...factoryBase(24, 6),
		[6, 6, 12, 12, textureColors.axilGrey],
		[9, 9, 6, 6, textureColors.plasteel],
		[11, 7, 2, 10, textureColors.plasteel],
		[7, 11, 10, 2, textureColors.plasteel],
		[11, 11, 2, 2, textureColors.cornerGrey],
	], [
		...factoryBase(24, 6),
		[6, 6, 12, 12, textureColors.axilGrey],
		[9, 9, 6, 6, textureColors.plasteel],
		[11, 7, 2, 10, textureColors.plasteel],
		[7, 11, 10, 2, textureColors.plasteel],
		[10, 10, 4, 4, textureColors.cornerGrey],
		[11, 11, 2, 2, textureColors.plasteel],
	], [
		...factoryBase(24, 6),
		[6, 6, 12, 12, textureColors.axilGrey],
		[9, 9, 6, 6, textureColors.plasteel],
		[11, 7, 2, 10, textureColors.plasteel],
		[7, 11, 10, 2, textureColors.plasteel],
		[9, 9, 6, 6, textureColors.cornerGrey],
		[10, 10, 4, 4, textureColors.plasteel],
	], [
		...factoryBase(24, 6),
		[6, 6, 12, 12, textureColors.axilGrey],
		[9, 9, 6, 6, textureColors.plasteel],
		[11, 7, 2, 10, textureColors.plasteel],
		[7, 11, 10, 2, textureColors.plasteel],
		[11, 7, 2, 2, textureColors.cornerGrey],
		[11, 15, 2, 2, textureColors.cornerGrey],
		[7, 11, 2, 2, textureColors.cornerGrey],
		[15, 11, 2, 2, textureColors.cornerGrey],
	]], [0, 1, 2, 3, 4, 3, 2, 1]),
	thermiteForge: new AnimatedGeneratedTextures(32, [[
		...factoryBase(32, 12),
		[8, 8, 16, 16, textureColors.axilGrey],
		[12, 12, 8, 8, textureColors.thermiteSecondary],
		[14, 14, 4, 4, textureColors.thermite],
		[6, 6, 4, 4, textureColors.thermite],
		[22, 6, 4, 4, textureColors.thermite],
		[6, 22, 4, 4, textureColors.thermite],
		[22, 22, 4, 4, textureColors.thermite],
	], [
		...factoryBase(32, 12),
		[7, 7, 18, 18, textureColors.thermite],
		[8, 8, 16, 16, textureColors.axilGrey],
		[12, 12, 8, 8, textureColors.thermiteSecondary],
		[14, 14, 4, 4, textureColors.thermite],
		[6, 6, 4, 4, textureColors.thermite],
		[22, 6, 4, 4, textureColors.thermite],
		[6, 22, 4, 4, textureColors.thermite],
		[22, 22, 4, 4, textureColors.thermite],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.thermite],
		[8, 8, 16, 16, textureColors.axilGrey],
		[12, 12, 8, 8, textureColors.thermiteSecondary],
		[14, 14, 4, 4, textureColors.thermite],
		[6, 6, 4, 4, textureColors.thermite],
		[22, 6, 4, 4, textureColors.thermite],
		[6, 22, 4, 4, textureColors.thermite],
		[22, 22, 4, 4, textureColors.thermite],
	]], [0, 1, 2, 1]),
	exidiumCatalyst: new AnimatedGeneratedTextures(32, [[
		...factoryBase(32, 12),
		[14, 14, 4, 4, textureColors.exidiumSecondary],
	], [
		...factoryBase(32, 12),
		[12, 12, 8, 8, textureColors.exidiumSecondary],
		[14, 14, 4, 4, textureColors.exidium],
	], [
		...factoryBase(32, 12),
		[10, 10, 12, 12, textureColors.exidiumSecondary],
		[12, 12, 8, 8, textureColors.exidium],
		[14, 14, 4, 4, textureColors.white],
	], [
		...factoryBase(32, 12),
		[8, 8, 16, 16, textureColors.exidiumSecondary],
		[10, 10, 12, 12, textureColors.exidium],
		[12, 12, 8, 8, textureColors.white],
		[14, 14, 4, 4, textureColors.exidium],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.exidiumSecondary],
		[8, 8, 16, 16, textureColors.exidium],
		[10, 10, 12, 12, textureColors.white],
		[12, 12, 8, 8, textureColors.exidium],
		[14, 14, 4, 4, textureColors.exidiumSecondary],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.exidium],
		[8, 8, 16, 16, textureColors.white],
		[10, 10, 12, 12, textureColors.exidium],
		[12, 12, 8, 8, textureColors.exidiumSecondary],
		[14, 14, 4, 4, textureColors.backgroundGrey],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.white],
		[8, 8, 16, 16, textureColors.exidium],
		[10, 10, 12, 12, textureColors.exidiumSecondary],
		[12, 12, 8, 8, textureColors.backgroundGrey],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.exidium],
		[8, 8, 16, 16, textureColors.exidiumSecondary],
		[10, 10, 12, 12, textureColors.backgroundGrey],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.exidiumSecondary],
		[8, 8, 16, 16, textureColors.backgroundGrey],
	], [
		...factoryBase(32, 12),
		[6, 6, 20, 20, textureColors.backgroundGrey],
	]]),

	thermalGenerator: new AnimatedGeneratedTextures(16, [[
		...generatorBase(16),
		[4, 4, 8, 8, textureColors.wallGrey],
		[5, 5, 6, 6, textureColors.black],
		[7, 7, 2, 2, textureColors.tier2],
	]]),
	solarArray: new AnimatedGeneratedTextures(16, [[
		...generatorBase(16),
		[2, 2, 12, 12, textureColors.solar],
		[7, 7, 2, 2, textureColors.white],
	]]),
	methaneBurner: new AnimatedGeneratedTextures(24, [[
		...generatorBase(24),
		[4, 4, 16, 16, textureColors.wallGrey],
		[5, 5, 14, 14, textureColors.black],
		[10, 10, 4, 4, textureColors.tier3],
	]]),
	graphiteBurner: new AnimatedGeneratedTextures(24, [[
		...generatorBase(24),
		[3, 3, 6, 6, textureColors.axilGrey],
		[15, 3, 6, 6, textureColors.axilGrey],
		[3, 15, 6, 6, textureColors.axilGrey],
		[15, 15, 6, 6, textureColors.axilGrey],
		[6, 6, 12, 12, textureColors.black],
		[9, 9, 6, 6, textureColors.tier4],
	]]),
	thermiteReactor: new AnimatedGeneratedTextures(24, [[
		...generatorBase(24),
		[2, 2, 20, 20, textureColors.cornerGrey],
		[8, 8, 8, 8, textureColors.thermite],
		[11, 2, 2, 20, textureColors.thermite],
		[2, 11, 20, 2, textureColors.thermite],
	]]),
	conductor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, textureColors.power],
		[0, 3, 8, 2, textureColors.power],
		[3, 3, 2, 2, textureColors.white],
	]]),
	battery: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.power],
		[1, 1, 14, 14, textureColors.backgroundGrey],
		[4, 4, 8, 8, textureColors.wallGrey],
		[7, 4, 2, 8, textureColors.cornerGrey],
		[4, 7, 8, 2, textureColors.cornerGrey],
	]]),

	airVent: new AnimatedGeneratedTextures(8, [[
		[2, 0, 4, 1, textureColors.axilGrey],
		[2, 7, 4, 1, textureColors.axilGrey],
		[0, 2, 1, 4, textureColors.axilGrey],
		[7, 2, 1, 4, textureColors.axilGrey],
		[1, 1, 6, 6, textureColors.wallGrey],
		[3, 2, 2, 4, textureColors.cornerGrey],
		[2, 3, 4, 2, textureColors.cornerGrey],
	]]),
	waterVent: new AnimatedGeneratedTextures(8, [[
		[2, 0, 4, 1, textureColors.axilGrey],
		[2, 7, 4, 1, textureColors.axilGrey],
		[0, 2, 1, 4, textureColors.axilGrey],
		[7, 2, 1, 4, textureColors.axilGrey],
		[1, 1, 6, 6, textureColors.wallGrey],
		[3, 2, 2, 4, textureColors.water],
		[2, 3, 4, 2, textureColors.water],
	]]),
	methaneVent: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.wallGrey],
		[1, 1, 14, 14, textureColors.backgroundGrey],
		[4, 4, 8, 8, textureColors.methane],
		[6, 2, 4, 12, textureColors.methane],
		[2, 6, 12, 4, textureColors.methane],
	]]),

	pump: new AnimatedGeneratedTextures(16, [[
		...generatorBase(16),
		[5, 6, 6, 4, textureColors.tier2],
		[6, 5, 4, 6, textureColors.tier2],
		[6, 6, 4, 4, textureColors.black],
	]]),
	poweredPump: new AnimatedGeneratedTextures(16, [[
		...generatorBase(16),
		[4, 5, 8, 6, textureColors.tier3],
		[5, 4, 6, 8, textureColors.tier3],
		[5, 5, 6, 6, textureColors.black],
	]]),
	well: new AnimatedGeneratedTextures(24, [[
		...generatorBase(24),
		[8, 9, 8, 6, textureColors.water],
		[9, 8, 6, 8, textureColors.water],
		[9, 9, 6, 6, textureColors.water],
	]]),

	base: new AnimatedGeneratedTextures(40, [[
		[0, 0, 40, 40, textureColors.wallGrey],
		[1, 1, 38, 38, textureColors.backgroundGrey],
		[2, 2, 36, 36, textureColors.backgroundGrey],
		[12, 12, 2, 2, textureColors.tier4],
		[16, 12, 2, 2, textureColors.tier4],
		[22, 12, 2, 2, textureColors.tier4],
		[26, 12, 2, 2, textureColors.tier4],
		[12, 16, 2, 2, textureColors.tier4],
		[26, 16, 2, 2, textureColors.tier4],
		[12, 22, 2, 2, textureColors.tier4],
		[26, 22, 2, 2, textureColors.tier4],
		[12, 26, 2, 2, textureColors.tier4],
		[16, 26, 2, 2, textureColors.tier4],
		[22, 26, 2, 2, textureColors.tier4],
		[26, 26, 2, 2, textureColors.tier4],
		[16, 16, 8, 8, textureColors.tier4Secondary],
		[2, 2, 2, 2, textureColors.cornerGrey],
		[4, 4, 2, 2, textureColors.cornerGrey],
		[36, 2, 2, 2, textureColors.cornerGrey],
		[34, 4, 2, 2, textureColors.cornerGrey],
		[2, 36, 2, 2, textureColors.cornerGrey],
		[4, 34, 2, 2, textureColors.cornerGrey],
		[36, 36, 2, 2, textureColors.cornerGrey],
		[34, 34, 2, 2, textureColors.cornerGrey],
		[8, 8, 2, 2, textureColors.tier4Secondary],
		[30, 8, 2, 2, textureColors.tier4Secondary],
		[8, 30, 2, 2, textureColors.tier4Secondary],
		[30, 30, 2, 2, textureColors.tier4Secondary],
		[18, 18, 4, 4, textureColors.cornerGrey],
		[19, 10, 2, 2, textureColors.white],
		[19, 28, 2, 2, textureColors.white],
		[10, 19, 2, 2, textureColors.white],
		[28, 19, 2, 2, textureColors.white],
	]]),

	pipe: new AnimatedGeneratedTextures(8, [[
		[2, 0, 1, 8, textureColors.cornerGrey],
		[5, 0, 1, 8, textureColors.cornerGrey],
		[3, 0, 2, 8, textureColors.backgroundGrey],
		[3, 1, 2, 1, textureColors.wallGrey],
	]]),
	pipeBridge: new AnimatedGeneratedTextures(8, [[
		[0, 0, 8, 2, textureColors.wallGrey],
		[0, 6, 8, 2, textureColors.wallGrey],
		[2, 0, 1, 8, textureColors.cornerGrey],
		[5, 0, 1, 8, textureColors.cornerGrey],
		[3, 0, 2, 8, textureColors.backgroundGrey],
		[3, 1, 2, 1, textureColors.cornerGrey],
	]]),
	pipeDistributor: new AnimatedGeneratedTextures(8, [[
		[2, 0, 1, 8, textureColors.cornerGrey],
		[5, 0, 1, 8, textureColors.cornerGrey],
		[0, 2, 8, 1, textureColors.cornerGrey],
		[0, 5, 8, 1, textureColors.cornerGrey],
		[3, 0, 2, 8, textureColors.backgroundGrey],
		[0, 3, 8, 2, textureColors.backgroundGrey],
	]]),
	pipeJunction: new AnimatedGeneratedTextures(8, [[
		[0, 2, 8, 1, textureColors.cornerGrey],
		[0, 5, 8, 1, textureColors.cornerGrey],
		[3, 0, 2, 8, textureColors.backgroundGrey],
		[0, 3, 8, 2, textureColors.backgroundGrey],
		[2, 0, 1, 8, textureColors.cornerGrey],
		[5, 0, 1, 8, textureColors.cornerGrey],
	]]),
	tank: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.water],
		[1, 1, 14, 14, textureColors.backgroundGrey],
		[4, 4, 8, 8, textureColors.cornerGrey],
		[7, 1, 2, 2, textureColors.cornerGrey],
		[7, 13, 2, 2, textureColors.cornerGrey],
		[1, 7, 2, 2, textureColors.cornerGrey],
		[13, 7, 2, 2, textureColors.cornerGrey],
	]]),

	steelWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.axilGrey],
		[1, 1, 14, 14, textureColors.backgroundGrey],
	]]),
	titaniumWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.axilGrey],
		[1, 1, 14, 14, textureColors.backgroundGrey],
		[3, 3, 10, 10, textureColors.titanium],
		[4, 4, 8, 8, textureColors.backgroundGrey],
	]]),
	bunker: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.axilGrey],
		[1, 1, 14, 14, textureColors.backgroundGrey],
		[3, 3, 10, 10, textureColors.plasteel],
		[5, 5, 6, 6, textureColors.backgroundGrey],
		[3, 3, 2, 2, textureColors.axilGrey],
		[11, 3, 2, 2, textureColors.axilGrey],
		[3, 11, 2, 2, textureColors.axilGrey],
		[11, 11, 2, 2, textureColors.axilGrey],
		[6, 6, 4, 4, textureColors.plasteel],
	]]),
	shrapnelTurret: new AnimatedGeneratedTextures(16, [[
		[1, 1, 5, 5, textureColors.wallGrey],
		[10, 1, 5, 5, textureColors.wallGrey],
		[1, 10, 5, 5, textureColors.wallGrey],
		[10, 10, 5, 5, textureColors.wallGrey],
		[2, 2, 3, 3, textureColors.cornerGrey],
		[11, 2, 3, 3, textureColors.cornerGrey],
		[2, 11, 3, 3, textureColors.cornerGrey],
		[11, 11, 3, 3, textureColors.cornerGrey],
		[3, 3, 10, 10, textureColors.wallGrey],
		[4, 4, 8, 8, textureColors.tier1],
		[6, 5, 1, 1, textureColors.wallGrey],
		[9, 5, 1, 1, textureColors.wallGrey],
		[6, 7, 1, 1, textureColors.wallGrey],
		[9, 7, 1, 1, textureColors.wallGrey],
	]]),
	piercingTurret: new AnimatedGeneratedTextures(16, [[
		[1, 1, 5, 5, textureColors.wallGrey],
		[10, 1, 5, 5, textureColors.wallGrey],
		[1, 10, 5, 5, textureColors.wallGrey],
		[10, 10, 5, 5, textureColors.wallGrey],
		[2, 2, 3, 3, textureColors.cornerGrey],
		[11, 2, 3, 3, textureColors.cornerGrey],
		[2, 11, 3, 3, textureColors.cornerGrey],
		[11, 11, 3, 3, textureColors.cornerGrey],
		[3, 3, 10, 10, textureColors.wallGrey],
		[4, 4, 8, 8, textureColors.tier2],
		[7, 5, 2, 2, textureColors.wallGrey],
	]]),
	jetTurret: new AnimatedGeneratedTextures(16, [[
		[1, 1, 5, 5, textureColors.cornerGrey],
		[10, 1, 5, 5, textureColors.cornerGrey],
		[1, 10, 5, 5, textureColors.cornerGrey],
		[10, 10, 5, 5, textureColors.cornerGrey],
		[2, 2, 12, 12, textureColors.wallGrey],
		[3, 3, 10, 10, textureColors.tier3],
		[5, 4, 6, 2, textureColors.wallGrey],
	]]),
	arcTurret: new AnimatedGeneratedTextures(16, [[
		[1, 1, 4, 4, textureColors.cornerGrey],
		[11, 1, 4, 4, textureColors.cornerGrey],
		[1, 11, 4, 4, textureColors.cornerGrey],
		[11, 11, 4, 4, textureColors.cornerGrey],
		[3, 3, 10, 10, textureColors.black],
		[4, 4, 8, 8, textureColors.cornerGrey],
		[5, 5, 6, 6, textureColors.black],
	]]),
	siegeTurret: new AnimatedGeneratedTextures(24, [[
		[1, 1, 6, 6, textureColors.wallGrey],
		[17, 1, 6, 6, textureColors.wallGrey],
		[1, 17, 6, 6, textureColors.wallGrey],
		[17, 17, 6, 6, textureColors.wallGrey],
		[2, 2, 4, 4, textureColors.cornerGrey],
		[18, 2, 4, 4, textureColors.cornerGrey],
		[2, 18, 4, 4, textureColors.cornerGrey],
		[18, 18, 4, 4, textureColors.cornerGrey],
		[3, 3, 18, 18, textureColors.wallGrey],
		[5, 5, 14, 14, textureColors.axilGrey],
		[7, 7, 10, 10, textureColors.tier3],
		[4, 4, 2, 2, textureColors.axilGrey],
		[18, 4, 2, 2, textureColors.axilGrey],
		[4, 18, 2, 2, textureColors.axilGrey],
		[18, 18, 2, 2, textureColors.axilGrey],
		[9, 8, 6, 4, textureColors.wallGrey],
	]]),
	piercingLaserTurret: new AnimatedGeneratedTextures(24, [[
		[1, 1, 8, 8, textureColors.wallGrey],
		[1, 15, 8, 8, textureColors.wallGrey],
		[15, 1, 8, 8, textureColors.wallGrey],
		[15, 15, 8, 8, textureColors.wallGrey],
		[2, 2, 6, 6, textureColors.cornerGrey],
		[2, 16, 6, 6, textureColors.cornerGrey],
		[16, 2, 6, 6, textureColors.cornerGrey],
		[16, 16, 6, 6, textureColors.cornerGrey],
		[4, 4, 16, 16, textureColors.wallGrey],
		[5, 5, 14, 14, textureColors.tier4],
	]]),

	swarmDrone: new AnimatedGeneratedTextures(8, [[
		[0, 0, 3, 3, textureColors.white],
		[5, 0, 3, 3, textureColors.white],
		[0, 5, 3, 3, textureColors.white],
		[5, 5, 3, 3, textureColors.white],
		[1, 1, 1, 1, textureColors.black],
		[6, 1, 1, 1, textureColors.black],
		[1, 6, 1, 1, textureColors.black],
		[6, 6, 1, 1, textureColors.black],
		[2, 2, 4, 4, textureColors.hostileOrange],
		[3, 3, 2, 2, textureColors.black],
	]]),
	meleeTank: new AnimatedGeneratedTextures(16, [[
		[3, 2, 10, 1, textureColors.hostileOrange],
		[4, 4, 2, 2, textureColors.white],
		[10, 4, 2, 2, textureColors.white],
		[7, 5, 2, 2, textureColors.white],
		[3, 10, 2, 3, textureColors.white],
		[11, 10, 2, 3, textureColors.white],
		[6, 8, 1, 4, textureColors.white],
		[9, 8, 1, 4, textureColors.white],
	]]),
	artillery: new AnimatedGeneratedTextures(16, [[
		[2, 3, 1, 3, textureColors.white],
		[13, 3, 1, 3, textureColors.white],
		[2, 11, 1, 2, textureColors.white],
		[13, 11, 1, 2, textureColors.white],
		[4, 2, 1, 6, textureColors.white],
		[11, 2, 1, 6, textureColors.white],
		[6, 1, 4, 2, textureColors.white],
		[6, 4, 4, 1, textureColors.white],
		[6, 6, 4, 1, textureColors.white],
		[7, 8, 2, 4, textureColors.white],
		[7, 13, 2, 2, textureColors.white],
		[4, 9, 2, 5, textureColors.hostileOrange],
		[10, 9, 2, 5, textureColors.hostileOrange],
	]]),
	zenith: new AnimatedGeneratedTextures(24, [[
		[0, 0, 9, 10, textureColors.white],
		[1, 1, 7, 8, textureColors.black],
		[15, 0, 9, 10, textureColors.white],
		[16, 1, 7, 8, textureColors.black],
		[0, 13, 9, 10, textureColors.white],
		[1, 14, 7, 8, textureColors.black],
		[15, 13, 9, 10, textureColors.white],
		[16, 14, 7, 8, textureColors.black],
		[4, 4, 16, 15, textureColors.white],
		[5, 5, 14, 13, textureColors.black],
		[4, 4, 16, 15, textureColors.white],
		[5, 5, 14, 13, textureColors.black],
		[3, 7, 7, 14, textureColors.white],
		[4, 8, 5, 12, textureColors.hostileRed],
		[14, 7, 7, 14, textureColors.white],
		[15, 8, 5, 12, textureColors.hostileRed],
	]]),
	scrambler: new AnimatedGeneratedTextures(8, [[
		[0, 0, 3, 3, textureColors.hostileRed],
		[5, 0, 3, 3, textureColors.hostileRed],
		[0, 5, 3, 3, textureColors.hostileRed],
		[5, 5, 3, 3, textureColors.hostileRed],
		[1, 1, 1, 1, textureColors.black],
		[6, 1, 1, 1, textureColors.black],
		[1, 6, 1, 1, textureColors.black],
		[6, 6, 1, 1, textureColors.black],
		[2, 2, 4, 4, textureColors.white],
		[3, 3, 2, 2, textureColors.black],
	]]),
	hive: new AnimatedGeneratedTextures(32, [[
		...cornersToConcentricRects([
				[4, 4, 11, 8],
				[4, 4, 8, 11],
				[22, 4, 29, 8],
				[25, 4, 29, 11],
				[4, 22, 8, 29],
				[4, 25, 11, 29],
				[22, 25, 29, 29],
				[25, 22, 29, 29],
				[13, 1, 20, 7],
				[1, 13, 7, 20],
				[26, 13, 32, 20],
				[13, 26, 20, 32],
				[9, 13, 24, 20],
				[13, 9, 20, 24],
				[10, 10, 23, 23],
			], [textureColors.white, textureColors.hostileRed],
		),
		...cornersToConcentricRects([
				[9, 13, 24, 20],
				[13, 9, 20, 24],
				[10, 10, 23, 23],
			], [textureColors.white, textureColors.black],
		),
	]]),
	behemoth: new AnimatedGeneratedTextures(40, [[
		[0, 0, 40, 40, textureColors.white],
		[1, 1, 38, 38, textureColors.hostileRed],
	]]),
	bomber: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, textureColors.white],
		[1, 1, 14, 14, textureColors.hostileRed],
	]]),
	harvester: new AnimatedGeneratedTextures(8, [[
		[0, 0, 8, 8, textureColors.white],
		[1, 1, 6, 6, textureColors.hostileRed],
	]]),
};

// todo animate exidiumCatalyst, generators, vents, water extractors turret
