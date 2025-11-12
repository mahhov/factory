import {CanvasSource, Texture, TextureStyle} from 'pixi.js';

TextureStyle.defaultOptions.scaleMode = 'nearest';

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

class ColoredGeneratedTexture<T extends string[]> {
	private readonly textureCache: Record<string, Texture> = {};
	protected readonly size: number;
	private readonly rectsHandler: (...colors: T) => [number, number, number, number, string][];

	constructor(size: number, rectsHandler: (...colors: T) => [number, number, number, number, string][]) {
		this.size = size;
		this.rectsHandler = rectsHandler;
	}

	texture(...colors: T): Texture {
		let key = colors.join();
		this.textureCache[key] ||= rectToTexture(this.size, this.rectsHandler(...colors));
		return this.textureCache[key];
	}
}

class AnimatedGeneratedTextures {
	readonly textures: Texture[];

	constructor(size: number, rectsArray: [number, number, number, number, string][][]) {
		this.textures = rectsArray.map(rects => rectToTexture(size, rects));
	}
}

// ai generated
export let coloredGeneratedTextures = {
	// --- OVERLAYS (8x8) ---
	materialIndicator: new ColoredGeneratedTexture(8, color => [
		[2, 2, 4, 4, color], // Small Yellow Square
	]),
	fullRect: new ColoredGeneratedTexture(8, color => [
		[0, 0, 8, 8, color], // Small Yellow Square
	]),
};

export let animatedGeneratedTextures = {
	// --- COLOR KEY ---
	// P-DARK: #1A1C20 (Base/Shadow)
	// P-MID: #4C5056 (Casing/Rock)
	// P-LIGHT: #9AA0AA (Secondary structure outlines, less intense)
	// ACCENT-HEAT: #D83030 (Red/Danger/Heat)
	// ACCENT-POWER: #FACA10 (Yellow/Energy/Factory)
	// ACCENT-LIFE: #30D850 (Green/Extractor)
	// ACCENT-FLUID: #4070D0 (Blue/Water)
	// P-WHITE: #F0F0F0 (Spark/Glow)

	clear: new AnimatedGeneratedTextures(8, [[[0, 0, 8, 8, '#D83030']]]),

	// --- WALLS (Static - Simplified Outline) ---
	ironWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'],
		[0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[4, 4, 8, 1, '#9AA0AA'], [4, 11, 8, 1, '#9AA0AA'],
		[4, 4, 1, 8, '#9AA0AA'], [11, 4, 1, 8, '#9AA0AA'],
	]]),
	steelWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'],
		[0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[7, 0, 2, 16, '#D83030'], [0, 7, 16, 2, '#D83030'], // Red glowing cross
	]]),
	bunker: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#4C5056'], [0, 31, 32, 1, '#4C5056'],
		[0, 0, 1, 32, '#4C5056'], [31, 0, 1, 32, '#4C5056'],
		[8, 8, 16, 1, '#D83030'], [8, 23, 16, 1, '#D83030'],
		[8, 8, 1, 16, '#D83030'], [23, 8, 1, 16, '#D83030'], // Inner red square
		[15, 15, 2, 2, '#9AA0AA'],
	]]),

	// --- EXTRACTORS (4 Corner Focus) ---
	extractor: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'], [0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[7, 7, 2, 2, '#FACA10'], // Center Core
		[0, 0, 4, 4, '#30D850'], [12, 0, 4, 4, '#30D850'],
		[0, 12, 4, 4, '#30D850'], [12, 12, 4, 4, '#30D850'], // Green Corners 1 (Large)
	], [
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'], [0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[7, 7, 2, 2, '#FACA10'],
		[1, 1, 2, 2, '#30D850'], [13, 1, 2, 2, '#30D850'],
		[1, 13, 2, 2, '#30D850'], [13, 13, 2, 2, '#30D850'], // Green Corners 2 (Small, Pulsing In)
	]]),
	reinforcedExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#4C5056'], [0, 31, 32, 1, '#4C5056'], [0, 0, 1, 32, '#4C5056'], [31, 0, 1, 32, '#4C5056'],
		[15, 15, 2, 2, '#D83030'], // Center Core
		[0, 0, 6, 6, '#30D850'], [26, 0, 6, 6, '#30D850'],
		[0, 26, 6, 6, '#30D850'], [26, 26, 6, 6, '#30D850'], // Green Corners 1
	], [
		[0, 0, 32, 1, '#4C5056'], [0, 31, 32, 1, '#4C5056'], [0, 0, 1, 32, '#4C5056'], [31, 0, 1, 32, '#4C5056'],
		[15, 15, 2, 2, '#D83030'],
		[2, 2, 4, 4, '#30D850'], [26, 2, 4, 4, '#30D850'],
		[2, 26, 4, 4, '#30D850'], [26, 26, 4, 4, '#30D850'], // Green Corners 2 (Pulsing In)
	]]),
	quadraticExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#1A1C20'], [0, 31, 32, 1, '#1A1C20'], [0, 0, 1, 32, '#1A1C20'], [31, 0, 1, 32, '#1A1C20'],
		[15, 15, 2, 2, '#D83030'],
		[0, 0, 8, 8, '#30D850'], [24, 0, 8, 8, '#30D850'],
		[0, 24, 8, 8, '#30D850'], [24, 24, 8, 8, '#30D850'], // Green Corners 1
		[10, 10, 12, 1, '#FACA10'], [10, 21, 12, 1, '#FACA10'], // Yellow inner grid
		[10, 10, 1, 12, '#FACA10'], [21, 10, 1, 12, '#FACA10'],
	], [
		[0, 0, 32, 1, '#1A1C20'], [0, 31, 32, 1, '#1A1C20'], [0, 0, 1, 32, '#1A1C20'], [31, 0, 1, 32, '#1A1C20'],
		[15, 15, 2, 2, '#D83030'],
		[2, 2, 6, 6, '#30D850'], [24, 2, 6, 6, '#30D850'],
		[2, 24, 6, 6, '#30D850'], [24, 24, 6, 6, '#30D850'], // Green Corners 2 (Pulsing In)
		[10, 10, 12, 1, '#FACA10'], [10, 21, 12, 1, '#FACA10'],
		[10, 10, 1, 12, '#FACA10'], [21, 10, 1, 12, '#FACA10'],
	]]),
	laserExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#1A1C20'], [0, 31, 32, 1, '#1A1C20'], [0, 0, 1, 32, '#1A1C20'], [31, 0, 1, 32, '#1A1C20'],
		[15, 15, 2, 2, '#FACA10'], // Center Core
		[0, 0, 6, 6, '#30D850'], [26, 0, 6, 6, '#30D850'],
		[0, 26, 6, 6, '#30D850'], [26, 26, 6, 6, '#30D850'], // Green Corners 1
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'], // Yellow Energy Cross
	], [
		[0, 0, 32, 1, '#1A1C20'], [0, 31, 32, 1, '#1A1C20'], [0, 0, 1, 32, '#1A1C20'], [31, 0, 1, 32, '#1A1C20'],
		[15, 15, 2, 2, '#D83030'], // Center Core Pulse Red
		[2, 2, 4, 4, '#30D850'], [26, 2, 4, 4, '#30D850'],
		[2, 26, 4, 4, '#30D850'], [26, 26, 4, 4, '#30D850'], // Green Corners 2 (Pulsing In)
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
	]]),

	// --- TRANSPORT (Chevron Movement) ---
	conveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#9AA0AA'], // Track
		// Directional Arrow (Y=1, 3, 5) - Pushes flow from Y=0 down
		[3, 1, 2, 1, '#FACA10'],
		[3, 3, 2, 1, '#FACA10'],
		[3, 5, 2, 1, '#FACA10'],
		[3, 7, 2, 1, '#F0F0F0'], // Small White indicator at the output end
	], [
		[3, 0, 2, 8, '#9AA0AA'],
		// Arrows shift down by 1 pixel (Y=2, 4, 6)
		[3, 2, 2, 1, '#FACA10'],
		[3, 4, 2, 1, '#FACA10'],
		[3, 6, 2, 1, '#FACA10'],
		[3, 7, 2, 1, '#F0F0F0'],
	]]),
	highSpeedConveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#4C5056'], // Darker Track
		// Double Chevrons (Y=1, 2, 4, 5)
		[3, 1, 2, 1, '#FACA10'], [3, 2, 2, 1, '#FACA10'],
		[3, 4, 2, 1, '#FACA10'], [3, 5, 2, 1, '#FACA10'],
		[3, 7, 2, 1, '#F0F0F0'], // Small White indicator at the output end
	], [
		[3, 0, 2, 8, '#4C5056'],
		// Chevrons shift down by 1 pixel (Y=2, 3, 5, 6)
		[3, 2, 2, 1, '#FACA10'], [3, 3, 2, 1, '#FACA10'],
		[3, 5, 2, 1, '#FACA10'], [3, 6, 2, 1, '#FACA10'],
		[3, 7, 2, 1, '#F0F0F0'],
	]]),
	packedConveyor: new AnimatedGeneratedTextures(8, [[
		[2, 0, 4, 8, '#1A1C20'], // Packed Track
		// Arrows (Y=1, 3, 5, 7)
		[3, 1, 2, 1, '#4070D0'], [3, 3, 2, 1, '#4070D0'],
		[3, 5, 2, 1, '#4070D0'], [3, 7, 2, 1, '#4070D0'],
		[2, 7, 4, 1, '#F0F0F0'], // White indicator strip at output end
	], [
		[2, 0, 4, 8, '#1A1C20'],
		// Arrows shift down by 1 pixel (Y=0, 2, 4, 6) - wrap around
		[3, 0, 2, 1, '#4070D0'], [3, 2, 2, 1, '#4070D0'],
		[3, 4, 2, 1, '#4070D0'], [3, 6, 2, 1, '#4070D0'],
		[2, 7, 4, 1, '#F0F0F0'],
	]]),
	distributor: new AnimatedGeneratedTextures(8, [[
		[0, 3, 8, 2, '#9AA0AA'], [3, 0, 2, 8, '#9AA0AA'],
		[3, 3, 2, 2, '#D83030'], [3, 4, 2, 1, '#FACA10'], // Indicator pulse 1
	], [
		[0, 3, 8, 2, '#9AA0AA'], [3, 0, 2, 8, '#9AA0AA'],
		[3, 3, 2, 2, '#D83030'], [3, 3, 2, 2, '#F0F0F0'], // Indicator pulse 2 (White)
	]]),
	junction: new AnimatedGeneratedTextures(8, [[
		[0, 3, 8, 2, '#4C5056'], [3, 0, 2, 8, '#4C5056'],
		[3, 3, 2, 2, '#FACA10'], [3, 3, 2, 2, '#F0F0F0'], // Center flash 1 (White)
	], [
		[0, 3, 8, 2, '#4C5056'], [3, 0, 2, 8, '#4C5056'],
		[3, 3, 2, 2, '#FACA10'], [3, 3, 2, 2, '#D83030'], // Center flash 2 (Red)
	]]),

	// --- FACTORIES (Giant Plus Sign + Theme) ---
	steelSmelter: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'], // Dark base for clear outline
		[7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'], // Giant Yellow Plus Sign
		[7, 7, 2, 2, '#D83030'], // Heat core pulse 1
	], [
		[0, 0, 16, 16, '#1A1C20'],
		[7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#F0F0F0'], // Heat core pulse 2 (White, larger)
	]]),
	metaglassFoundry: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'],
		[7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[7, 7, 2, 2, '#4070D0'], // Fluid core pulse 1
	], [
		[0, 0, 16, 16, '#1A1C20'],
		[7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#4070D0'], // Fluid core pulse 2 (Blue, larger)
	]]),
	plasteelMixer: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[15, 15, 2, 2, '#30D850'], // Green center pulse 1
	], [
		[0, 0, 32, 32, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#F0F0F0'], // Center pulse 2 (White, larger)
	]]),
	thermiteForge: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#D83030'], // Red core pulse 1
	], [
		[0, 0, 32, 32, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[13, 13, 6, 6, '#FACA10'], // Yellow core pulse 2
	]]),
	exidiumCatalyst: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[15, 15, 2, 2, '#F0F0F0'], // Energy core pulse 1
	], [
		[0, 0, 32, 32, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#4070D0'], // Energy core pulse 2 (Blue)
	]]),

	// --- STORAGE (Static) ---
	storage: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#FACA10'], [0, 15, 16, 1, '#FACA10'],
		[0, 0, 1, 16, '#FACA10'], [15, 0, 1, 16, '#FACA10'],
		[4, 4, 8, 1, '#D83030'], [4, 8, 8, 1, '#D83030'], // Material lines
		[7, 0, 2, 4, '#1A1C20'], // Access Hatch
	]]),
	dispenser: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 1, '#4C5056'], [1, 6, 6, 1, '#4C5056'],
		[1, 1, 1, 6, '#4C5056'], [6, 1, 1, 6, '#4C5056'],
		[3, 3, 2, 2, '#FACA10'], [3, 5, 2, 3, '#D83030'],
		[3, 5, 2, 1, '#F0F0F0'], // Output flash 1
	], [
		[1, 1, 6, 1, '#4C5056'], [1, 6, 6, 1, '#4C5056'],
		[1, 1, 1, 6, '#4C5056'], [6, 1, 1, 6, '#4C5056'],
		[3, 3, 2, 2, '#FACA10'], [3, 5, 2, 3, '#D83030'],
		[3, 7, 2, 1, '#F0F0F0'], // Output flash 2
	]]),

	// --- POWER (Giant X Shape × Theme) ---
	thermalGenerator: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'], [0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[7, 7, 2, 2, '#D83030'], // Heat Core
		[0, 0, 1, 1, '#FACA10'], [15, 15, 1, 1, '#FACA10'],
		[15, 0, 1, 1, '#FACA10'], [0, 15, 1, 1, '#FACA10'], // X Corner Power Pulse 1
	], [
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'], [0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[6, 6, 4, 4, '#F0F0F0'], // White Hot Center Pulse
		[1, 1, 2, 2, '#FACA10'], [13, 13, 2, 2, '#FACA10'],
		[13, 1, 2, 2, '#FACA10'], [1, 13, 2, 2, '#FACA10'], // X Corner Power Pulse 2
	]]),
	solarArray: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'],
		[1, 1, 14, 14, '#30D850'],
		[0, 0, 1, 1, '#D83030'], [15, 15, 1, 1, '#D83030'],
		[15, 0, 1, 1, '#D83030'], [0, 15, 1, 1, '#D83030'], // X Corner Power Pulse 1
	], [
		[0, 0, 16, 16, '#1A1C20'],
		[1, 1, 14, 14, '#30D850'],
		[1, 1, 2, 2, '#D83030'], [13, 13, 2, 2, '#D83030'],
		[13, 1, 2, 2, '#D83030'], [1, 13, 2, 2, '#D83030'], // X Corner Power Pulse 2
	]]),
	methaneBurner: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#4C5056'], [0, 31, 32, 1, '#4C5056'], [0, 0, 1, 32, '#4C5056'], [31, 0, 1, 32, '#4C5056'],
		[14, 14, 4, 4, '#F0F0F0'],
		[0, 0, 2, 2, '#D83030'], [30, 30, 2, 2, '#D83030'],
		[30, 0, 2, 2, '#D83030'], [0, 30, 2, 2, '#D83030'], // X Corner Power Pulse 1
	], [
		[0, 0, 32, 1, '#4C5056'], [0, 31, 32, 1, '#4C5056'], [0, 0, 1, 32, '#4C5056'], [31, 0, 1, 32, '#4C5056'],
		[13, 13, 6, 6, '#FACA10'], // Yellow Pulse
		[1, 1, 2, 2, '#D83030'], [29, 29, 2, 2, '#D83030'],
		[29, 1, 2, 2, '#D83030'], [1, 29, 2, 2, '#D83030'], // X Corner Power Pulse 2
	]]),
	thermiteReactor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#1A1C20'], [0, 31, 32, 1, '#1A1C20'], [0, 0, 1, 32, '#1A1C20'], [31, 0, 1, 32, '#1A1C20'],
		[15, 15, 2, 2, '#FACA10'], // Yellow Center
		[0, 0, 3, 3, '#D83030'], [29, 29, 3, 3, '#D83030'],
		[29, 0, 3, 3, '#D83030'], [0, 29, 3, 3, '#D83030'], // X Corner Power Pulse 1
	], [
		[0, 0, 32, 1, '#1A1C20'], [0, 31, 32, 1, '#1A1C20'], [0, 0, 1, 32, '#1A1C20'], [31, 0, 1, 32, '#1A1C20'],
		[14, 14, 4, 4, '#F0F0F0'], // White Pulse Center
		[1, 1, 2, 2, '#D83030'], [29, 29, 2, 2, '#D83030'],
		[29, 1, 2, 2, '#D83030'], [1, 29, 2, 2, '#D83030'], // X Corner Power Pulse 2
	]]),
	conductor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#FACA10'], [0, 3, 8, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'], [3, 3, 2, 2, '#F0F0F0'], // Power blink 1
	], [
		[3, 0, 2, 8, '#FACA10'], [0, 3, 8, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'], [3, 3, 2, 2, '#FACA10'], // Power blink 2
	]]),
	battery: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#30D850'], [0, 15, 16, 1, '#30D850'], [0, 0, 1, 16, '#30D850'], [15, 0, 1, 16, '#30D850'],
		[7, 1, 2, 14, '#F0F0F0'], [1, 7, 14, 2, '#F0F0F0'],
		[4, 4, 8, 2, '#D83030'], // Charge bar 1
	], [
		[0, 0, 16, 1, '#30D850'], [0, 15, 16, 1, '#30D850'], [0, 0, 1, 16, '#30D850'], [15, 0, 1, 16, '#30D850'],
		[7, 1, 2, 14, '#F0F0F0'], [1, 7, 14, 2, '#F0F0F0'],
		[4, 6, 8, 2, '#D83030'], // Charge bar 2
	]]),

	// --- FLUID/AIR (Simple Flow) ---
	airVent: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#9AA0AA'], [3, 0, 2, 1, '#4070D0'], [3, 7, 2, 1, '#4070D0'],
		[0, 3, 1, 2, '#4070D0'], [7, 3, 1, 2, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'], // Air pulse 1
	], [
		[1, 1, 6, 6, '#9AA0AA'], [3, 0, 2, 1, '#4070D0'], [3, 7, 2, 1, '#4070D0'],
		[0, 3, 1, 2, '#4070D0'], [7, 3, 1, 2, '#4070D0'], [3, 7, 2, 1, '#F0F0F0'], // Air pulse 2
	]]),
	waterVent: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'], [3, 7, 2, 1, '#F0F0F0'],
		[0, 3, 1, 2, '#F0F0F0'], [7, 3, 1, 2, '#F0F0F0'], [3, 0, 2, 1, '#F0F0F0'], // Water pulse 1
	], [
		[1, 1, 6, 6, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'], [3, 7, 2, 1, '#F0F0F0'],
		[0, 3, 1, 2, '#F0F0F0'], [7, 3, 1, 2, '#F0F0F0'], [3, 7, 2, 1, '#F0F0F0'], // Water pulse 2
	]]),
	methaneVent: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#30D850'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 4, '#D83030'], [0, 7, 4, 2, '#D83030'],
		[7, 12, 2, 4, '#D83030'], [12, 7, 4, 2, '#D83030'],
		[8, 1, 2, 2, '#FACA10'], // Methane pulse 1
	], [
		[0, 0, 16, 16, '#30D850'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 4, '#D83030'], [0, 7, 4, 2, '#D83030'],
		[7, 12, 2, 4, '#D83030'], [12, 7, 4, 2, '#D83030'],
		[1, 8, 2, 2, '#FACA10'], // Methane pulse 2
	]]),
	pump: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[7, 4, 2, 2, '#F0F0F0'], [7, 10, 2, 2, '#F0F0F0'],
		[4, 7, 2, 2, '#F0F0F0'], [10, 7, 2, 2, '#F0F0F0'], // Impeller 1: Cross
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[4, 4, 2, 2, '#F0F0F0'], [10, 4, 2, 2, '#F0F0F0'],
		[4, 10, 2, 2, '#F0F0F0'], [10, 10, 2, 2, '#F0F0F0'], // Impeller 2: Diagonal
	]]),
	poweredPump: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[1, 1, 2, 2, '#D83030'],
		[7, 4, 2, 2, '#FACA10'], [7, 10, 2, 2, '#FACA10'],
		[4, 7, 2, 2, '#FACA10'], [10, 7, 2, 2, '#FACA10'], // Impeller 1: Cross
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[1, 1, 2, 2, '#D83030'],
		[4, 4, 2, 2, '#FACA10'], [10, 4, 2, 2, '#FACA10'],
		[4, 10, 2, 2, '#FACA10'], [10, 10, 2, 2, '#FACA10'], // Impeller 2: Diagonal
	]]),
	well: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#4070D0'], [0, 15, 32, 2, '#4070D0'],
		[14, 14, 4, 4, '#FACA10'],
		[15, 15, 2, 2, '#F0F0F0'], // Water pulse 1
	], [
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#4070D0'], [0, 15, 32, 2, '#4070D0'],
		[14, 14, 4, 4, '#FACA10'],
		[14, 14, 4, 4, '#4070D0'], // Water pulse 2
	]]),
	pipe: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#4070D0'], [3, 1, 2, 2, '#F0F0F0'], // Fluid pulse 1
	], [
		[3, 0, 2, 8, '#4070D0'], [3, 5, 2, 2, '#F0F0F0'], // Fluid pulse 2
	]]),
	pipeDistributor: new AnimatedGeneratedTextures(8, [[
		[3, 3, 2, 2, '#4070D0'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'], [3, 4, 2, 1, '#F0F0F0'], // Center pulse 1
	], [
		[3, 3, 2, 2, '#4070D0'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'], [3, 3, 2, 2, '#F0F0F0'], // Center pulse 2
	]]),
	pipeJunction: new AnimatedGeneratedTextures(8, [[
		[0, 3, 8, 2, '#4070D0'], [3, 0, 2, 8, '#4070D0'],
		[3, 3, 2, 2, '#F0F0F0'], // Center flash 1
	], [
		[0, 3, 8, 2, '#4070D0'], [3, 0, 2, 8, '#4070D0'],
		[3, 3, 2, 2, '#FACA10'], // Center flash 2
	]]),
	tank: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4070D0'], [1, 1, 14, 14, '#1A1C20'],
		[4, 4, 8, 1, '#F0F0F0'], [4, 6, 8, 1, '#F0F0F0'],
		[4, 8, 8, 1, '#F0F0F0'], [4, 10, 8, 1, '#F0F0F0'],
		[5, 5, 6, 6, '#9AA0AA'], // Fluid surface ripple 1
	], [
		[0, 0, 16, 16, '#4070D0'], [1, 1, 14, 14, '#1A1C20'],
		[4, 4, 8, 1, '#F0F0F0'], [4, 6, 8, 1, '#F0F0F0'],
		[4, 8, 8, 1, '#F0F0F0'], [4, 10, 8, 1, '#F0F0F0'],
		[4, 4, 8, 8, '#F0F0F0'], // Fluid surface ripple 2
	]]),


	// --- HOME BASE (Size 40 - Central Hub with Combined Themes) ---
	base: new AnimatedGeneratedTextures(40, [[
		[0, 0, 40, 40, '#1A1C20'], // Dark base for contrast

		// Outer frame with subtle detail
		[0, 0, 40, 2, '#4C5056'], [0, 38, 40, 2, '#4C5056'],
		[0, 0, 2, 40, '#4C5056'], [38, 0, 2, 40, '#4C5056'],

		// Inner glowing X for power theme
		[4, 4, 2, 2, '#D83030'], [34, 34, 2, 2, '#D83030'], // X corners (top-left, bottom-right)
		[34, 4, 2, 2, '#D83030'], [4, 34, 2, 2, '#D83030'], // X corners (top-right, bottom-left)
		[10, 10, 2, 2, '#D83030'], [28, 28, 2, 2, '#D83030'],
		[28, 10, 2, 2, '#D83030'], [10, 28, 2, 2, '#D83030'],

		// Central pulsing core - White flash
		[18, 18, 4, 4, '#F0F0F0'],

		// Resource inflow/outflow indicators (green for extractors, yellow for factories)
		// Top
		[18, 0, 4, 4, '#30D850'],
		// Bottom
		[18, 36, 4, 4, '#30D850'],
		// Left
		[0, 18, 4, 4, '#FACA10'],
		// Right
		[36, 18, 4, 4, '#FACA10'],
	], [
		[0, 0, 40, 40, '#1A1C20'], // Dark base for contrast

		// Outer frame with subtle detail
		[0, 0, 40, 2, '#4C5056'], [0, 38, 40, 2, '#4C5056'],
		[0, 0, 2, 40, '#4C5056'], [38, 0, 2, 40, '#4C5056'],

		// Inner glowing X for power theme (slight pulsation/expansion)
		[3, 3, 4, 4, '#D83030'], [33, 33, 4, 4, '#D83030'],
		[33, 3, 4, 4, '#D83030'], [3, 33, 4, 4, '#D83030'],
		[9, 9, 4, 4, '#D83030'], [27, 27, 4, 4, '#D83030'],
		[27, 9, 4, 4, '#D83030'], [9, 27, 4, 4, '#D83030'],

		// Central pulsing core - Yellow core expansion
		[17, 17, 6, 6, '#FACA10'],

		// Resource inflow/outflow indicators (green for extractors, yellow for factories) - Pulsate
		// Top
		[17, 0, 6, 6, '#30D850'],
		// Bottom
		[17, 34, 6, 6, '#30D850'],
		// Left
		[0, 17, 6, 6, '#FACA10'],
		// Right
		[34, 17, 6, 6, '#FACA10'],
	]]),

	// --- TURRETS (Central Focus) ---
	shrapnelTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'],
		[4, 4, 8, 8, '#D83030'], // Red central square
		[7, 0, 2, 4, '#9AA0AA'], [7, 4, 2, 2, '#F0F0F0'], // Barrel 1 (Short/Wide)
	], [
		[0, 0, 16, 16, '#1A1C20'],
		[4, 4, 8, 8, '#D83030'],
		[7, 0, 2, 3, '#9AA0AA'], [7, 3, 2, 2, '#D83030'], // Barrel 2 (Recoil)
	]]),
	piercingTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'],
		[6, 6, 4, 4, '#4070D0'], // Blue central core
		[7, 0, 2, 8, '#D83030'], // Barrel 1 (Long/Thin)
	], [
		[0, 0, 16, 16, '#1A1C20'],
		[6, 6, 4, 4, '#4070D0'],
		[7, 1, 2, 7, '#D83030'], // Barrel 2 (Recoil)
	]]),
	arcTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'],
		[6, 6, 4, 4, '#FACA10'], // Yellow core
		[7, 0, 2, 4, '#4070D0'], [0, 7, 4, 2, '#4070D0'],
		[7, 12, 2, 4, '#4070D0'], [12, 7, 4, 2, '#4070D0'], // Blue Emitters 1
	], [
		[0, 0, 16, 16, '#1A1C20'],
		[6, 6, 4, 4, '#FACA10'],
		[8, 0, 2, 4, '#4070D0'], [0, 8, 4, 2, '#4070D0'],
		[6, 12, 2, 4, '#4070D0'], [12, 6, 4, 2, '#4070D0'], // Blue Emitters 2 (Rotation implied)
	]]),
	siegeTurret: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'],
		[14, 14, 4, 4, '#D83030'], // Red central core
		[15, 0, 2, 16, '#4C5056'], // Cannon Barrel 1
	], [
		[0, 0, 32, 32, '#1A1C20'],
		[14, 14, 4, 4, '#D83030'],
		[15, 2, 2, 14, '#4C5056'], // Cannon Barrel 2 (Recoil)
	]]),
	laserTurret: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'],
		[14, 14, 4, 4, '#FACA10'], // Yellow Core
		[15, 0, 2, 32, '#D83030'], // Laser Emitter 1
		[13, 13, 6, 6, '#F0F0F0'], // White Charge Pulse 1
	], [
		[0, 0, 32, 32, '#1A1C20'],
		[14, 14, 4, 4, '#FACA10'],
		[15, 0, 2, 32, '#D83030'],
		[15, 15, 2, 2, '#F0F0F0'], // White Charge Pulse 2 (Small)
	]]),

	// --- RESOURCES (Ambient Pulse) ---
	waterDeposit: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4070D0'], // Fully filled with blue for seamless tiling

		// Inner water shimmer 1 (White - contained within the filled area)
		[7, 7, 2, 2, '#F0F0F0'],
		[3, 8, 2, 1, '#F0F0F0'], [11, 7, 2, 1, '#F0F0F0'],
	], [
		[0, 0, 16, 16, '#4070D0'], // Fully filled with blue

		// Inner water shimmer 2 (Blue, larger - contained within the filled area)
		[6, 6, 4, 4, '#4070D0'],
		[4, 7, 2, 2, '#4070D0'], [10, 7, 2, 2, '#4070D0'],
	]]),
	methaneDeposit: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#30D850'], // Fully filled with green for seamless tiling

		// Inner gas pulse 1 (Yellow - contained within the filled area)
		[7, 7, 2, 2, '#FACA10'],
		[3, 3, 2, 2, '#FACA10'], [11, 11, 2, 2, '#FACA10'],
	], [
		[0, 0, 16, 16, '#30D850'], // Fully filled with green

		// Inner gas pulse 2 (Green, larger - contained within the filled area)
		[6, 6, 4, 4, '#30D850'],
		[4, 4, 2, 2, '#30D850'], [10, 10, 2, 2, '#30D850'],
	]]),

	// --- MOBS (Movement/Blink) ---
	lowTierMob: new AnimatedGeneratedTextures(8, [[
		[2, 2, 4, 4, '#D83030'], [1, 3, 1, 1, '#FACA10'],
		[6, 3, 1, 1, '#FACA10'], [3, 6, 2, 1, '#1A1C20'],
		[3, 6, 2, 1, '#F0F0F0'], // Feet/base 1
	], [
		[2, 2, 4, 4, '#D83030'], [1, 3, 1, 1, '#FACA10'],
		[6, 3, 1, 1, '#FACA10'], [3, 6, 2, 1, '#1A1C20'],
		[3, 7, 2, 1, '#F0F0F0'], // Feet/base 2
	]]),
};
