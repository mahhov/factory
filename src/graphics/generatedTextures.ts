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
};

export let animatedGeneratedTextures = {
	// --- WALLS (Static - Outlines define shape) ---
	ironWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'], // Top/Bottom outline
		[0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'], // Left/Right outline
		[3, 3, 10, 10, '#1A1C20'], // Inner frame
		[7, 7, 2, 2, '#9AA0AA'], // Center rivet
	]]),
	steelWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 1, '#4C5056'], [0, 15, 16, 1, '#4C5056'],
		[0, 0, 1, 16, '#4C5056'], [15, 0, 1, 16, '#4C5056'],
		[3, 3, 10, 10, '#1A1C20'], // Inner frame
		[1, 7, 14, 1, '#D83030'], [7, 1, 1, 14, '#D83030'], // Red reinforcement cross
	]]),
	bunker: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 1, '#4C5056'], [0, 31, 32, 1, '#4C5056'],
		[0, 0, 1, 32, '#4C5056'], [31, 0, 1, 32, '#4C5056'],
		[4, 4, 24, 24, '#1A1C20'],
		[8, 8, 16, 16, '#D83030'], // Red Inner Core
		[15, 15, 2, 2, '#4C5056'], // Central Block
	]]),

	// --- EXTRACTORS (2 Frames: Internal Pulse) ---
	extractor: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 16, '#FACA10'], [0, 7, 16, 2, '#FACA10'], // Yellow shafts
		[6, 6, 4, 4, '#30D850'], // Green Core outline
		[7, 7, 2, 2, '#D83030'], // Center pulse 1
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 16, '#FACA10'], [0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#30D850'],
		[6, 6, 4, 4, '#FACA10'], // Center pulse 2 (Yellow)
	]]),
	reinforcedExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'], // Yellow shafts
		[12, 12, 8, 8, '#30D850'], // Green Core
		[15, 15, 2, 2, '#F0F0F0'], // Pulse 1 (Small white)
	], [
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[12, 12, 8, 8, '#30D850'],
		[14, 14, 4, 4, '#FACA10'], // Pulse 2 (Yellow)
	]]),
	quadraticExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#30D850'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#D83030'],
		[10, 10, 12, 12, '#FACA10'], // Outer Ring 1
	], [
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#30D850'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#D83030'],
		[11, 11, 10, 10, '#30D850'], // Outer Ring 2 (Shift/pulse)
	]]),
	laserExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#30D850'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#D83030'], // Red Core
		[4, 4, 2, 2, '#4070D0'], [26, 4, 2, 2, '#4070D0'],
		[4, 26, 2, 2, '#4070D0'], [26, 26, 2, 2, '#4070D0'],
		[15, 15, 2, 2, '#F0F0F0'], // Central Laser Spark (Frame 1)
	], [
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#30D850'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#D83030'],
		[4, 4, 2, 2, '#4070D0'], [26, 4, 2, 2, '#4070D0'],
		[4, 26, 2, 2, '#4070D0'], [26, 26, 2, 2, '#4070D0'],
		[14, 14, 4, 4, '#D83030'], // Central Laser Spark (Frame 2: Red core glow)
	]]),

	// --- TRANSPORT (2 Frames: Chevron Movement) ---
	conveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#9AA0AA'], // Track
		[3, 1, 2, 1, '#FACA10'], [3, 4, 2, 1, '#FACA10'], [3, 7, 2, 1, '#FACA10'], // Arrows (Frame 1)
	], [
		[3, 0, 2, 8, '#9AA0AA'],
		[3, 0, 2, 1, '#FACA10'], [3, 3, 2, 1, '#FACA10'], [3, 6, 2, 1, '#FACA10'], // Arrows shift down (Frame 2)
	]]),
	highSpeedConveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#4C5056'], // Darker Track
		[3, 1, 2, 1, '#FACA10'], [3, 2, 2, 1, '#FACA10'],
		[3, 5, 2, 1, '#FACA10'], [3, 6, 2, 1, '#FACA10'], // Double Chevrons (Frame 1)
	], [
		[3, 0, 2, 8, '#4C5056'],
		[3, 0, 2, 1, '#FACA10'], [3, 1, 2, 1, '#FACA10'],
		[3, 4, 2, 1, '#FACA10'], [3, 5, 2, 1, '#FACA10'], // Double Chevrons shift down (Frame 2)
	]]),
	packedConveyor: new AnimatedGeneratedTextures(8, [[
		[2, 0, 4, 8, '#1A1C20'], // Packed Track
		[3, 1, 2, 1, '#4070D0'], [3, 3, 2, 1, '#4070D0'],
		[3, 5, 2, 1, '#4070D0'], [3, 7, 2, 1, '#4070D0'], // Blue Arrows (Frame 1)
	], [
		[2, 0, 4, 8, '#1A1C20'],
		[3, 0, 2, 1, '#4070D0'], [3, 2, 2, 1, '#4070D0'],
		[3, 4, 2, 1, '#4070D0'], [3, 6, 2, 1, '#4070D0'], // Blue Arrows shift down (Frame 2)
	]]),
	distributor: new AnimatedGeneratedTextures(8, [[
		[3, 3, 2, 2, '#D83030'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'],
		[3, 4, 2, 1, '#FACA10'], // Indicator pulse (Frame 1)
	], [
		[3, 3, 2, 2, '#D83030'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'],
		[3, 3, 2, 2, '#F0F0F0'], // Indicator pulse (Frame 2: Brighter)
	]]),
	junction: new AnimatedGeneratedTextures(8, [[
		[0, 3, 8, 2, '#4C5056'], [3, 0, 2, 8, '#4C5056'],
		[3, 3, 2, 2, '#FACA10'],
		[3, 3, 2, 2, '#F0F0F0'], // Center flash (Frame 1: White)
	], [
		[0, 3, 8, 2, '#4C5056'], [3, 0, 2, 8, '#4C5056'],
		[3, 3, 2, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'], // Center flash (Frame 2: Red)
	]]),

	// --- FACTORIES (2 Frames: Heat/Mixer Animation) ---
	steelSmelter: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[4, 4, 8, 8, '#D83030'], [7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[7, 7, 2, 2, '#F0F0F0'], // Smelt pulse 1
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[4, 4, 8, 8, '#D83030'], [7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#FACA10'], // Smelt pulse 2
	]]),
	metaglassFoundry: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4070D0'], [1, 1, 14, 14, '#9AA0AA'],
		[4, 4, 8, 8, '#F0F0F0'],
		[1, 1, 2, 2, '#F0F0F0'], [13, 13, 2, 2, '#F0F0F0'],
		[5, 5, 6, 6, '#4070D0'], // Glass shimmer 1 (Fluid color)
	], [
		[0, 0, 16, 16, '#4070D0'], [1, 1, 14, 14, '#9AA0AA'],
		[4, 4, 8, 8, '#F0F0F0'],
		[13, 1, 2, 2, '#F0F0F0'], [1, 13, 2, 2, '#F0F0F0'],
		[6, 6, 4, 4, '#9AA0AA'], // Glass shimmer 2 (Light Grey)
	]]),
	plasteelMixer: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#30D850'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#4070D0'], [0, 15, 32, 2, '#4070D0'],
		[12, 12, 8, 8, '#FACA10'],
		[13, 13, 6, 6, '#F0F0F0'], // White flash in center
	], [
		[0, 0, 32, 32, '#30D850'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#4070D0'],
		[0, 15, 32, 2, '#4070D0'],
		[12, 12, 8, 8, '#FACA10'],
		[14, 14, 4, 4, '#FACA10'], // Yellow pulse
	]]),
	thermiteForge: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#D83030'],
		[8, 8, 16, 16, '#FACA10'],
		[14, 14, 4, 4, '#F0F0F0'], // Inner glow 1
	], [
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#D83030'],
		[8, 8, 16, 16, '#FACA10'],
		[13, 13, 6, 6, '#FACA10'], // Inner glow 2
	]]),
	exidiumCatalyst: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[14, 14, 4, 4, '#FACA10'],
		[15, 0, 2, 32, '#4C5056'], [0, 15, 32, 2, '#4C5056'], // Inactive cross
		[15, 15, 2, 2, '#F0F0F0'], // Center flash 1
	], [
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[14, 14, 4, 4, '#FACA10'],
		[15, 0, 2, 32, '#F0F0F0'], [0, 15, 32, 2, '#F0F0F0'], // Active cross
		[14, 14, 4, 4, '#FACA10'], // Center flash 2
	]]),

	// --- STORAGE (Static) ---
	storage: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#FACA10'], [1, 1, 14, 14, '#D83030'],
		[4, 4, 8, 1, '#F0F0F0'], [4, 8, 8, 1, '#F0F0F0'], // Material lines
		[7, 0, 2, 4, '#1A1C20'], // Access Hatch
	]]),
	dispenser: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#4C5056'], [3, 3, 2, 2, '#FACA10'],
		[3, 5, 2, 3, '#D83030'],
		[3, 5, 2, 1, '#F0F0F0'], // Output flash (Frame 1)
	], [
		[1, 1, 6, 6, '#4C5056'], [3, 3, 2, 2, '#FACA10'],
		[3, 5, 2, 3, '#D83030'],
		[3, 7, 2, 1, '#F0F0F0'], // Output flash (Frame 2: Shifted down)
	]]),

	// --- POWER (2 Frames: Energy Flow/Pulse) ---
	thermalGenerator: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[5, 5, 6, 6, '#D83030'], [7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[7, 7, 2, 2, '#FACA10'], // Heat center 1
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[5, 5, 6, 6, '#D83030'], [7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#F0F0F0'], // Heat center 2 (White hot pulse)
	]]),
	solarArray: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'], [1, 1, 14, 14, '#30D850'],
		[3, 0, 2, 16, '#F0F0F0'], [7, 0, 2, 16, '#F0F0F0'],
		[11, 0, 2, 16, '#F0F0F0'],
		[1, 1, 2, 2, '#FACA10'], // Charge pulse 1
	], [
		[0, 0, 16, 16, '#1A1C20'], [1, 1, 14, 14, '#30D850'],
		[3, 0, 2, 16, '#F0F0F0'], [7, 0, 2, 16, '#F0F0F0'],
		[11, 0, 2, 16, '#F0F0F0'],
		[3, 3, 2, 2, '#FACA10'], // Charge pulse 2
	]]),
	methaneBurner: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#30D850'],
		[14, 14, 4, 4, '#F0F0F0'], [2, 2, 4, 4, '#FACA10'],
		[26, 2, 4, 4, '#FACA10'], [2, 26, 4, 4, '#FACA10'],
		[26, 26, 4, 4, '#FACA10'],
		[12, 12, 8, 8, '#D83030'], // Burner pulse 1
	], [
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#30D850'],
		[14, 14, 4, 4, '#F0F0F0'], [2, 2, 4, 4, '#FACA10'],
		[26, 2, 4, 4, '#FACA10'], [2, 26, 4, 4, '#FACA10'],
		[26, 26, 4, 4, '#FACA10'],
		[11, 11, 10, 10, '#FACA10'], // Burner pulse 2
	]]),
	thermiteReactor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#4C5056'],
		[6, 6, 20, 20, '#D83030'], [15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#F0F0F0'], // Core blink 1
	], [
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#4C5056'],
		[6, 6, 20, 20, '#D83030'], [15, 0, 2, 32, '#FACA10'],
		[0, 15, 32, 2, '#FACA10'],
		[15, 15, 2, 2, '#D83030'], // Core blink 2
	]]),
	conductor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#FACA10'], [0, 3, 8, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'],
		[3, 3, 2, 2, '#F0F0F0'], // Power blink 1
	], [
		[3, 0, 2, 8, '#FACA10'], [0, 3, 8, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'],
		[3, 3, 2, 2, '#FACA10'], // Power blink 2
	]]),
	battery: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#30D850'], [1, 1, 14, 14, '#1A1C20'],
		[7, 1, 2, 14, '#F0F0F0'], [1, 7, 14, 2, '#F0F0F0'],
		[4, 4, 8, 2, '#FACA10'], // Charge bar 1
	], [
		[0, 0, 16, 16, '#30D850'], [1, 1, 14, 14, '#1A1C20'],
		[7, 1, 2, 14, '#F0F0F0'], [1, 7, 14, 2, '#F0F0F0'],
		[4, 6, 8, 2, '#FACA10'], // Charge bar 2
	]]),

	// --- FLUID/AIR (2 Frames: Gas/Fluid Pulse) ---
	airVent: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#9AA0AA'], [3, 0, 2, 1, '#4070D0'],
		[3, 7, 2, 1, '#4070D0'], [0, 3, 1, 2, '#4070D0'],
		[7, 3, 1, 2, '#4070D0'],
		[3, 0, 2, 1, '#F0F0F0'], // Air pulse 1
	], [
		[1, 1, 6, 6, '#9AA0AA'], [3, 0, 2, 1, '#4070D0'],
		[3, 7, 2, 1, '#4070D0'], [0, 3, 1, 2, '#4070D0'],
		[7, 3, 1, 2, '#4070D0'],
		[3, 7, 2, 1, '#F0F0F0'], // Air pulse 2
	]]),
	waterVent: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'],
		[3, 7, 2, 1, '#F0F0F0'], [0, 3, 1, 2, '#F0F0F0'],
		[7, 3, 1, 2, '#F0F0F0'],
		[3, 0, 2, 1, '#F0F0F0'], // Water pulse 1
	], [
		[1, 1, 6, 6, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'],
		[3, 7, 2, 1, '#F0F0F0'], [0, 3, 1, 2, '#F0F0F0'],
		[7, 3, 1, 2, '#F0F0F0'],
		[3, 7, 2, 1, '#F0F0F0'], // Water pulse 2
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
		[14, 14, 4, 4, '#FACA10'], // Reinforced center
		[15, 15, 2, 2, '#F0F0F0'], // Water pulse 1
	], [
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[15, 0, 2, 32, '#4070D0'], [0, 15, 32, 2, '#4070D0'],
		[14, 14, 4, 4, '#FACA10'],
		[14, 14, 4, 4, '#4070D0'], // Water pulse 2 (Fluid color)
	]]),
	pipe: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#4070D0'],
		[3, 1, 2, 2, '#F0F0F0'], // Fluid pulse 1
	], [
		[3, 0, 2, 8, '#4070D0'],
		[3, 5, 2, 2, '#F0F0F0'], // Fluid pulse 2
	]]),
	pipeDistributor: new AnimatedGeneratedTextures(8, [[
		[3, 3, 2, 2, '#4070D0'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'],
		[3, 4, 2, 1, '#F0F0F0'], // Center pulse 1
	], [
		[3, 3, 2, 2, '#4070D0'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'],
		[3, 3, 2, 2, '#F0F0F0'], // Center pulse 2
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

	// --- TURRETS (2 Frames: Recoil/Charge) ---
	shrapnelTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[5, 5, 6, 6, '#9AA0AA'], [4, 0, 8, 4, '#D83030'],
		[6, 4, 4, 2, '#FACA10'],
		[5, 0, 6, 4, '#D83030'], // Barrel extended 1
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[5, 5, 6, 6, '#9AA0AA'], [4, 0, 8, 4, '#D83030'],
		[6, 4, 4, 2, '#FACA10'],
		[4, 1, 8, 3, '#D83030'], // Barrel recoiled 2
	]]),
	piercingTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 8, '#D83030'], [7, 8, 2, 2, '#FACA10'],
		[7, 0, 2, 8, '#D83030'], // Barrel extended 1
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[7, 0, 2, 8, '#D83030'], [7, 8, 2, 2, '#FACA10'],
		[7, 1, 2, 7, '#D83030'], // Barrel recoiled 2
	]]),
	arcTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[5, 5, 6, 6, '#4070D0'], [7, 0, 2, 4, '#F0F0F0'],
		[0, 7, 4, 2, '#F0F0F0'], [7, 12, 2, 4, '#F0F0F0'],
		[12, 7, 4, 2, '#F0F0F0'],
		[6, 6, 4, 4, '#F0F0F0'], // Central glow 1
	], [
		[0, 0, 16, 16, '#4C5056'], [1, 1, 14, 14, '#1A1C20'],
		[5, 5, 6, 6, '#4070D0'], [7, 0, 2, 4, '#F0F0F0'],
		[0, 7, 4, 2, '#F0F0F0'], [7, 12, 2, 4, '#F0F0F0'],
		[12, 7, 4, 2, '#F0F0F0'],
		[5, 5, 6, 6, '#4070D0'], // Central glow 2
	]]),
	siegeTurret: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [1, 1, 30, 30, '#4C5056'],
		[12, 0, 8, 16, '#FACA10'], [14, 16, 4, 4, '#D83030'],
		[12, 0, 8, 16, '#FACA10'], // Barrel extended 1
	], [
		[0, 0, 32, 32, '#1A1C20'], [1, 1, 30, 30, '#4C5056'],
		[12, 0, 8, 16, '#FACA10'], [14, 16, 4, 4, '#D83030'],
		[12, 2, 8, 14, '#FACA10'], // Barrel recoiled 2
	]]),
	laserTurret: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[14, 0, 4, 32, '#D83030'],
		[15, 15, 2, 2, '#F0F0F0'], // Central core spark 1
	], [
		[0, 0, 32, 32, '#4C5056'], [1, 1, 30, 30, '#1A1C20'],
		[14, 0, 4, 32, '#D83030'],
		[14, 14, 4, 4, '#F0F0F0'], // Central core large spark 2
	]]),

	// --- MOBS (2 Frames: Movement/Blink) ---
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
