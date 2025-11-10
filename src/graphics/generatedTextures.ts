import {CanvasSource, Texture, TextureStyle} from 'pixi.js';

TextureStyle.defaultOptions.scaleMode = 'nearest';

class GeneratedTexture {
	readonly texture: Texture;

	constructor(size: number, rects: [number, number, number, number, string][]) {
		this.texture = GeneratedTexture.texture(size, rects);
	}

	static texture(size: number, rects: [number, number, number, number, string][]): Texture {
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
	}
}

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
		this.textureCache[key] ||= GeneratedTexture.texture(this.size, this.rectsHandler(...colors));
		return this.textureCache[key];
	}
}

class AnimatedGeneratedTextures {
	readonly textures: Texture[];

	constructor(size: number, rectsArray: [number, number, number, number, string][][]) {
		this.textures = rectsArray.map(rects => GeneratedTexture.texture(size, rects));
	}
}

// AI generated
export let generatedTextures = {
	// Empty tile for background
	empty: new GeneratedTexture(8, []),

	// --- WALLS (16x16 / 32x32) ---
	ironWall: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#374151'], // Full Casing (Dark Grey)
		[1, 1, 14, 14, '#4b5563'], // Inner Wall
		[4, 4, 8, 8, '#6b7280'], // Central Block
	]),
	steelWall: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#374151'],
		[1, 1, 14, 14, '#4b5563'],
		[3, 3, 10, 10, '#1f2937'], // Inner Core (Darker)
		[7, 1, 2, 14, '#f87171'],
		[1, 7, 14, 2, '#f87171'], // Plus Reinforcement (Red)
	]),
	bunker: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#4b5563'],
		[2, 2, 28, 28, '#1f2937'],
		[4, 4, 24, 24, '#f87171'], // Red Inner Core
		[10, 10, 12, 12, '#374151'], // Central Bunker Block
	]),

	// --- EXTRACTORS (16x16 / 32x32) ---
	extractor: new GeneratedTexture(16, [
		[4, 4, 8, 8, '#22c55e'], // Green Casing
		[7, 0, 2, 16, '#facc15'],
		[0, 7, 16, 2, '#facc15'], // Yellow Shafts
		[6, 6, 4, 4, '#d97706'], // Central Intake Core
	]),
	reinforcedExtractor: new GeneratedTexture(32, [
		[4, 4, 24, 24, '#22c55e'],
		[14, 0, 4, 32, '#facc15'],
		[0, 14, 32, 4, '#facc15'],
		[10, 10, 12, 12, '#d97706'], // Inner Core
		[12, 1, 8, 4, '#d97706'],
		[12, 27, 8, 4, '#d97706'], // Reinforced Caps
		[1, 12, 4, 8, '#d97706'],
		[27, 12, 4, 8, '#d97706'],
	]),
	quadraticExtractor: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#1f2937'], // Dark Casing
		[4, 4, 24, 24, '#22c55e'],
		[14, 0, 4, 32, '#facc15'],
		[0, 14, 32, 4, '#facc15'],
		[10, 10, 12, 12, '#d97706'],
		[8, 8, 16, 16, '#047857'], // QUADRATIC FOCUS RING (Dark Green)
	]),
	laserExtractor: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#1f2937'],
		[4, 4, 24, 24, '#22c55e'],
		[14, 0, 4, 32, '#facc15'],
		[0, 14, 32, 4, '#facc15'],
		[12, 12, 8, 8, '#ef4444'], // Red Laser Core
		[1, 1, 4, 4, '#0ea5e9'],
		[27, 1, 4, 4, '#0ea5e9'], // Laser Channels (Cyan)
		[1, 27, 4, 4, '#0ea5e9'],
		[27, 27, 4, 4, '#0ea5e9'],
	]),

	// --- TRANSPORT (8x8) ---
	conveyor: new GeneratedTexture(8, [
		[3, 0, 2, 8, '#9ca3af'], // Gray Track
		[3, 1, 2, 1, '#facc15'],
		[3, 4, 2, 1, '#facc15'],
		[3, 7, 2, 1, '#facc15'], // Yellow Arrows
	]),
	highSpeedConveyor: new GeneratedTexture(8, [
		[3, 0, 2, 8, '#4b5563'], // Darker Track
		[3, 1, 2, 1, '#facc15'],
		[3, 2, 2, 1, '#facc15'], // Double Chevron
		[3, 5, 2, 1, '#facc15'],
		[3, 6, 2, 1, '#facc15'],
	]),
	packedConveyor: new GeneratedTexture(8, [
		[2, 0, 4, 8, '#1f2937'], // Packed Track (4px wide)
		[3, 1, 2, 1, '#3b82f6'],
		[3, 3, 2, 1, '#3b82f6'],
		[3, 5, 2, 1, '#3b82f6'],
		[3, 7, 2, 1, '#3b82f6'], // Blue Arrows
	]),
	distributor: new GeneratedTexture(8, [
		[3, 3, 2, 2, '#f97316'], // Orange Hub
		[3, 0, 2, 3, '#9ca3af'],
		[3, 5, 2, 3, '#9ca3af'],
		[0, 3, 3, 2, '#9ca3af'],
		[5, 3, 3, 2, '#9ca3af'], // Cross path
	]),
	junction: new GeneratedTexture(8, [
		[0, 3, 8, 2, '#4b5563'],
		[3, 0, 2, 8, '#4b5563'], // Grey Cross
		[3, 3, 2, 2, '#facc15'], // Yellow Center
	]),

	// --- FACTORIES (16x16 / 32x32) ---
	steelSmelter: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#4b5563'],
		[2, 2, 12, 12, '#1f2937'],
		[4, 4, 8, 8, '#dc2626'], // Red Smelting Core
		[7, 0, 2, 16, '#f97316'],
		[0, 7, 16, 2, '#f97316'], // Orange Heat Channels
	]),
	metaglassFoundry: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#3b82f6'],
		[2, 2, 12, 12, '#0ea5e9'],
		[4, 4, 8, 8, '#ecfdf5'], // White Glass Pool
		[1, 1, 2, 2, '#fff'],
		[13, 1, 2, 2, '#fff'], // Corner Shimmer
		[1, 13, 2, 2, '#fff'],
		[13, 13, 2, 2, '#fff'],
	]),
	plasteelMixer: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#059669'],
		[4, 4, 24, 24, '#047857'],
		[14, 1, 4, 30, '#3b82f6'],
		[1, 14, 30, 4, '#3b82f6'], // Blue Mixer Blades
		[12, 12, 8, 8, '#fef08a'], // Central Mixer Core
	]),
	thermiteForge: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#1f2937'],
		[4, 4, 24, 24, '#dc2626'],
		[8, 8, 16, 16, '#f97316'], // Thermite Layer
		[12, 12, 8, 8, '#fff'], // White-hot center
	]),
	exidiumCatalyst: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#9333ea'], // Purple Casing
		[4, 4, 24, 24, '#4c0f88'],
		[10, 10, 12, 12, '#facc15'], // Gold Catalyst Core
		[15, 1, 2, 30, '#fff'],
		[1, 15, 30, 2, '#fff'], // White Energy Cross
	]),

	// --- STORAGE (16x16 / 8x8) ---
	storage: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#f97316'],
		[2, 2, 12, 12, '#d97706'],
		[4, 4, 8, 2, '#fef08a'],
		[4, 8, 8, 2, '#fef08a'], // Stacked Materials
		[7, 0, 2, 4, '#92400e'], // Access Hatch
	]),
	dispenser: new GeneratedTexture(8, [
		[1, 1, 6, 6, '#4b5563'], // Grey Casing
		[3, 3, 2, 2, '#facc15'], // Material Core
		[3, 5, 2, 3, '#f97316'], // Output Chute
	]),

	// --- POWER (16x16 / 32x32 / 8x8) ---
	thermalGenerator: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#475569'],
		[2, 2, 12, 12, '#1f2937'],
		[5, 5, 6, 6, '#dc2626'], // Red Heat Core
		[6, 4, 4, 8, '#f97316'],
		[4, 6, 8, 4, '#f97316'], // Orange Flame/Heat transfer
	]),
	solarArray: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#047857'], // Dark Green Frame
		[1, 1, 14, 14, '#22c55e'], // Panel
		[3, 0, 2, 16, '#ecfdf5'],
		[7, 0, 2, 16, '#ecfdf5'],
		[11, 0, 2, 16, '#ecfdf5'], // Cell Lines
	]),
	methaneBurner: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#374151'],
		[4, 4, 24, 24, '#22c55e'], // Green Gas Chamber
		[10, 10, 12, 12, '#dc2626'], // Central Burner
		[14, 14, 4, 4, '#fff'], // White Ignition Point
		[2, 2, 4, 4, '#facc15'],
		[26, 2, 4, 4, '#facc15'], // Gas Inlets
		[2, 26, 4, 4, '#facc15'],
		[26, 26, 4, 4, '#facc15'],
	]),
	thermiteReactor: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#1f2937'],
		[2, 2, 28, 28, '#475569'],
		[6, 6, 20, 20, '#ef4444'], // Reactor Field (Red)
		[10, 10, 12, 12, '#fff'], // Central Core
		[15, 0, 2, 32, '#facc15'],
		[0, 15, 32, 2, '#facc15'], // Confinement Field
	]),
	conductor: new GeneratedTexture(8, [
		[3, 0, 2, 8, '#facc15'],
		[0, 3, 8, 2, '#facc15'], // Yellow Wires
		[3, 3, 2, 2, '#f97316'], // Orange Hub
	]),
	battery: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#10b981'],
		[1, 1, 14, 14, '#047857'],
		[4, 4, 8, 8, '#facc15'], // Charge Plate
		[7, 1, 2, 14, '#fff'],
		[1, 7, 14, 2, '#fff'], // Plus/Charge Symbol
	]),

	// --- FLUID/AIR (8x8 / 16x16 / 32x32) ---
	airVent: new GeneratedTexture(8, [
		[1, 1, 6, 6, '#d1d5db'], // Grey Casing
		[3, 0, 2, 1, '#0ea5e9'],
		[3, 7, 2, 1, '#0ea5e9'],
		[0, 3, 1, 2, '#0ea5e9'],
		[7, 3, 1, 2, '#0ea5e9'], // Air Outlets (Cyan)
	]),
	waterVent: new GeneratedTexture(8, [
		[1, 1, 6, 6, '#3b82f6'], // Blue Casing
		[3, 0, 2, 1, '#ecfdf5'],
		[3, 7, 2, 1, '#ecfdf5'],
		[0, 3, 1, 2, '#ecfdf5'],
		[7, 3, 1, 2, '#ecfdf5'], // Water Outlets (White)
	]),
	methaneVent: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#22c55e'], // Green Casing
		[2, 2, 12, 12, '#1f2937'],
		[7, 0, 2, 4, '#f97316'],
		[0, 7, 4, 2, '#f97316'], // Methane Vents (Orange)
		[7, 12, 2, 4, '#f97316'],
		[12, 7, 4, 2, '#f97316'],
	]),
	pump: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#475569'],
		[2, 2, 12, 12, '#1f2937'],
		[7, 0, 2, 16, '#3b82f6'],
		[0, 7, 16, 2, '#3b82f6'], // Intake Pipes
		[6, 6, 4, 4, '#0ea5e9'], // Fluid Impeller
	]),
	poweredPump: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#475569'],
		[2, 2, 12, 12, '#1f2937'],
		[7, 0, 2, 16, '#3b82f6'],
		[0, 7, 16, 2, '#3b82f6'],
		[6, 6, 4, 4, '#facc15'], // Powered Impeller
		[1, 1, 2, 2, '#f97316'], // Power Inlet
	]),
	well: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#374151'],
		[4, 4, 24, 24, '#475569'],
		[10, 10, 12, 12, '#0ea5e9'], // Water/Fluid Core
		[14, 0, 4, 32, '#3b82f6'],
		[0, 14, 32, 4, '#3b82f6'], // Heavy Intake Pipes
		[1, 1, 6, 6, '#facc15'], // Reinforced Corners
		[25, 1, 6, 6, '#facc15'],
		[1, 25, 6, 6, '#facc15'],
		[25, 25, 6, 6, '#facc15'],
	]),
	pipe: new GeneratedTexture(8, [
		[3, 0, 2, 8, '#3b82f6'], // Blue Pipe
		[3, 3, 2, 2, '#ecfdf5'], // White Pulse
	]),
	pipeDistributor: new GeneratedTexture(8, [
		[3, 3, 2, 2, '#3b82f6'], // Blue Hub
		[3, 0, 2, 3, '#0ea5e9'],
		[3, 5, 2, 3, '#0ea5e9'],
		[0, 3, 3, 2, '#0ea5e9'],
		[5, 3, 3, 2, '#0ea5e9'], // Cyan Cross path
	]),
	pipeJunction: new GeneratedTexture(8, [
		[0, 3, 8, 2, '#3b82f6'],
		[3, 0, 2, 8, '#3b82f6'], // Blue Cross
		[3, 3, 2, 2, '#ecfdf5'], // White Center
	]),
	tank: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#3b82f6'],
		[2, 2, 12, 12, '#0ea5e9'],
		[4, 4, 8, 1, '#ecfdf5'],
		[4, 6, 8, 1, '#ecfdf5'],
		[4, 8, 8, 1, '#ecfdf5'],
		[4, 10, 8, 1, '#ecfdf5'], // Fill Lines
	]),

	// --- DEFENSE TURRETS (16x16 / 32x32) ---
	shrapnelTurret: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#4b5563'], // Base Casing
		[2, 2, 12, 12, '#374151'], // Inner Base
		[5, 5, 6, 6, '#9ca3af'], // Turret Swivel
		[4, 0, 8, 4, '#f97316'], // Wide Barrel (Orange for spread)
		[6, 4, 4, 2, '#d97706'], // Barrel Opening
	]),
	piercingTurret: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#374151'], // Base Casing
		[2, 2, 12, 12, '#1f2937'], // Inner Base
		[5, 5, 6, 6, '#6b7280'], // Turret Swivel
		[7, 0, 2, 8, '#f87171'], // Long, Thin Barrel (Red for precision)
		[7, 8, 2, 2, '#dc2626'], // Muzzle
	]),
	arcTurret: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#475569'], // Base Casing
		[2, 2, 12, 12, '#374151'], // Inner Base
		[5, 5, 6, 6, '#0ea5e9'], // Central Arc Generator (Cyan)
		[7, 0, 2, 4, '#ecfdf5'],
		[0, 7, 4, 2, '#ecfdf5'], // Arc Emitters (White)
		[7, 12, 2, 4, '#ecfdf5'],
		[12, 7, 4, 2, '#ecfdf5'],
	]),
	siegeTurret: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#1f2937'], // Heavy Base
		[4, 4, 24, 24, '#374151'], // Reinforced Inner Base
		[10, 10, 12, 12, '#4b5563'], // Turret Mount
		[12, 0, 8, 16, '#facc15'], // Massive Cannon Barrel (Yellow for heavy projectile)
		[14, 16, 4, 4, '#d97706'], // Muzzle Indicator
	]),
	laserTurret: new GeneratedTexture(32, [
		[0, 0, 32, 32, '#4b5563'], // Base Casing
		[4, 4, 24, 24, '#374151'], // Inner Base
		[12, 12, 8, 8, '#f87171'], // Central Laser Core (Red)
		[14, 0, 4, 32, '#ef4444'], // Long Laser Emitter
		[1, 1, 6, 6, '#dc2626'],
		[25, 1, 6, 6, '#dc2626'], // Power Capacitors
		[1, 25, 6, 6, '#dc2626'],
		[25, 25, 6, 6, '#dc2626'],
	]),
	lowTierMob: new GeneratedTexture(8, [
		[2, 2, 4, 4, '#dc2626'], // Main Body (Red)
		[1, 3, 2, 2, '#ef4444'], // Left Eye/Sensor
		[5, 3, 2, 2, '#ef4444'], // Right Eye/Sensor
		[3, 6, 2, 1, '#facc15'], // Small Feet/Base
	]),
};

export let coloredGeneratedTextures = {
	// --- OVERLAYS (8x8) ---
	materialIndicator: new ColoredGeneratedTexture(8, color => [
		[2, 2, 4, 4, color], // Small Yellow Square
	]),
};

export let animatedGeneratedTextures = {
	// --- COLOR KEY ---
	// P-DARK: #1A1C20 (Base/Shadow)
	// P-MID: #4C5056 (Casing/Rock)
	// P-LIGHT: #9AA0AA (Highlight/Pipe)
	// ACCENT-HEAT: #D83030 (Red/Danger)
	// ACCENT-POWER: #FACA10 (Yellow/Energy)
	// ACCENT-LIFE: #30D850 (Green/Methane)
	// ACCENT-FLUID: #4070D0 (Blue/Water)
	// P-WHITE: #F0F0F0 (Spark/Glow)

	// --- WALLS (Static - one frame) ---
	ironWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], // Mid Casing
		[1, 1, 14, 14, '#1A1C20'], // Inner Wall Shadow
		[4, 4, 8, 8, '#9AA0AA'], // Central Block Highlight
	]]),
	steelWall: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'],
		[1, 1, 14, 14, '#1A1C20'],
		[3, 3, 10, 10, '#1A1C20'], // Inner Core
		[7, 1, 2, 14, '#D83030'],
		[1, 7, 14, 2, '#D83030'], // Plus Reinforcement
	]]),
	bunker: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'],
		[2, 2, 28, 28, '#1A1C20'],
		[4, 4, 24, 24, '#D83030'], // Red Inner Core
		[10, 10, 12, 12, '#4C5056'], // Central Bunker Block
	]]),

	// --- EXTRACTORS (2 Frames: Internal Pulse) ---
	extractor: new AnimatedGeneratedTextures(16, [[
		[4, 4, 8, 8, '#30D850'], // Green Casing
		[7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#D83030'], // Core (Frame 1: Darker Red)
	], [
		[4, 4, 8, 8, '#30D850'],
		[7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#FACA10'], // Core (Frame 2: Yellow pulse)
	]]),
	reinforcedExtractor: new AnimatedGeneratedTextures(32, [[
		[4, 4, 24, 24, '#30D850'],
		[14, 0, 4, 32, '#FACA10'],
		[0, 14, 32, 4, '#FACA10'],
		[10, 10, 12, 12, '#D83030'],
		[12, 1, 8, 4, '#D83030'], [12, 27, 8, 4, '#D83030'],
		[1, 12, 4, 8, '#D83030'], [27, 12, 4, 8, '#D83030'],
		[11, 11, 10, 10, '#F0F0F0'], // Pulse 1 (Smaller, brighter)
	], [
		[4, 4, 24, 24, '#30D850'],
		[14, 0, 4, 32, '#FACA10'],
		[0, 14, 32, 4, '#FACA10'],
		[10, 10, 12, 12, '#D83030'],
		[12, 1, 8, 4, '#D83030'], [12, 27, 8, 4, '#D83030'],
		[1, 12, 4, 8, '#D83030'], [27, 12, 4, 8, '#D83030'],
		[9, 9, 14, 14, '#FACA10'], // Pulse 2 (Larger yellow)
	]]),
	quadraticExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#30D850'],
		[14, 0, 4, 32, '#FACA10'], [0, 14, 32, 4, '#FACA10'],
		[10, 10, 12, 12, '#D83030'], [8, 8, 16, 16, '#1A1C20'],
		[7, 7, 18, 18, '#30D850'], // Outer ring (Frame 1: lighter green)
	], [
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#30D850'],
		[14, 0, 4, 32, '#FACA10'], [0, 14, 32, 4, '#FACA10'],
		[10, 10, 12, 12, '#D83030'], [8, 8, 16, 16, '#1A1C20'],
		[8, 8, 16, 16, '#1A1C20'], // Outer ring (Frame 2: Darker/Normal)
	]]),
	laserExtractor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#30D850'],
		[14, 0, 4, 32, '#FACA10'], [0, 14, 32, 4, '#FACA10'],
		[12, 12, 8, 8, '#D83030'], [1, 1, 4, 4, '#4070D0'],
		[27, 1, 4, 4, '#4070D0'], [1, 27, 4, 4, '#4070D0'],
		[27, 27, 4, 4, '#4070D0'],
		[15, 15, 2, 2, '#F0F0F0'], // Central Laser Spark (Frame 1)
	], [
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#30D850'],
		[14, 0, 4, 32, '#FACA10'], [0, 14, 32, 4, '#FACA10'],
		[12, 12, 8, 8, '#D83030'], [1, 1, 4, 4, '#4070D0'],
		[27, 1, 4, 4, '#4070D0'], [1, 27, 4, 4, '#4070D0'],
		[27, 27, 4, 4, '#4070D0'],
		[14, 14, 4, 4, '#F0F0F0'], // Central Laser Spark (Frame 2: Larger spark)
	]]),

	// --- TRANSPORT (2 Frames: Chevron Movement) ---
	conveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#9AA0AA'],
		[3, 1, 2, 1, '#FACA10'],
		[3, 4, 2, 1, '#FACA10'],
		[3, 7, 2, 1, '#FACA10'], // Arrows (Frame 1)
	], [
		[3, 0, 2, 8, '#9AA0AA'],
		[3, 0, 2, 1, '#FACA10'],
		[3, 3, 2, 1, '#FACA10'],
		[3, 6, 2, 1, '#FACA10'], // Arrows shift down (Frame 2)
	]]),
	highSpeedConveyor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#4C5056'],
		[3, 1, 2, 1, '#FACA10'], [3, 2, 2, 1, '#FACA10'],
		[3, 5, 2, 1, '#FACA10'], [3, 6, 2, 1, '#FACA10'], // Double Chevrons (Frame 1)
	], [
		[3, 0, 2, 8, '#4C5056'],
		[3, 0, 2, 1, '#FACA10'], [3, 1, 2, 1, '#FACA10'],
		[3, 4, 2, 1, '#FACA10'], [3, 5, 2, 1, '#FACA10'], // Double Chevrons shift down (Frame 2)
	]]),
	packedConveyor: new AnimatedGeneratedTextures(8, [[
		[2, 0, 4, 8, '#1A1C20'],
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
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[4, 4, 8, 8, '#D83030'], [7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[7, 7, 2, 2, '#F0F0F0'], // Smelt pulse (Frame 1)
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[4, 4, 8, 8, '#D83030'], [7, 0, 2, 16, '#FACA10'],
		[0, 7, 16, 2, '#FACA10'],
		[6, 6, 4, 4, '#FACA10'], // Smelt pulse (Frame 2: Larger yellow pulse)
	]]),
	metaglassFoundry: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4070D0'], [2, 2, 12, 12, '#9AA0AA'],
		[4, 4, 8, 8, '#F0F0F0'], [1, 1, 2, 2, '#F0F0F0'],
		[13, 1, 2, 2, '#F0F0F0'], [1, 13, 2, 2, '#F0F0F0'],
		[13, 13, 2, 2, '#F0F0F0'],
		[5, 5, 6, 6, '#4070D0'], // Glass shimmer (Frame 1: Fluid color)
	], [
		[0, 0, 16, 16, '#4070D0'], [2, 2, 12, 12, '#9AA0AA'],
		[4, 4, 8, 8, '#F0F0F0'], [1, 1, 2, 2, '#F0F0F0'],
		[13, 1, 2, 2, '#F0F0F0'], [1, 13, 2, 2, '#F0F0F0'],
		[13, 13, 2, 2, '#F0F0F0'],
		[6, 6, 4, 4, '#9AA0AA'], // Glass shimmer (Frame 2: Light Grey)
	]]),
	plasteelMixer: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#30D850'], [4, 4, 24, 24, '#1A1C20'],
		[14, 1, 4, 30, '#4070D0'], [1, 14, 30, 4, '#4070D0'],
		[12, 12, 8, 8, '#FACA10'],
		[13, 13, 6, 6, '#F0F0F0'], // White flash in center
	], [
		[0, 0, 32, 32, '#30D850'], [4, 4, 24, 24, '#1A1C20'],
		[14, 1, 4, 30, '#4070D0'],
		[1, 14, 30, 4, '#4070D0'],
		[12, 12, 8, 8, '#FACA10'], // Reset
		[14, 14, 4, 4, '#FACA10'],
	]]),
	thermiteForge: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#D83030'],
		[8, 8, 16, 16, '#FACA10'], [12, 12, 8, 8, '#F0F0F0'],
		[14, 14, 4, 4, '#D83030'], // Inner glow 1
	], [
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#D83030'],
		[8, 8, 16, 16, '#FACA10'], [12, 12, 8, 8, '#F0F0F0'],
		[13, 13, 6, 6, '#FACA10'], // Inner glow 2 (Larger yellow)
	]]),
	exidiumCatalyst: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#1A1C20'], // Simplified casing colors
		[10, 10, 12, 12, '#FACA10'], [15, 1, 2, 30, '#F0F0F0'],
		[1, 15, 30, 2, '#F0F0F0'],
		[15, 0, 2, 32, '#4C5056'], // Energy cross less visible (Frame 1)
	], [
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#1A1C20'],
		[10, 10, 12, 12, '#FACA10'],
		[15, 0, 2, 32, '#F0F0F0'], // Energy cross fully charged (Frame 2: Bright white)
		[0, 15, 32, 2, '#F0F0F0'],
	]]),

	// --- STORAGE (Static) ---
	storage: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#FACA10'], [2, 2, 12, 12, '#D83030'],
		[4, 4, 8, 2, '#F0F0F0'], [4, 8, 8, 2, '#F0F0F0'],
		[7, 0, 2, 4, '#1A1C20'], // Access Hatch (Dark)
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
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#D83030'], [6, 4, 4, 8, '#FACA10'],
		[4, 6, 8, 4, '#FACA10'],
		[7, 7, 2, 2, '#FACA10'], // Heat center (Frame 1: Yellow)
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#D83030'], [6, 4, 4, 8, '#FACA10'],
		[4, 6, 8, 4, '#FACA10'],
		[6, 6, 4, 4, '#F0F0F0'], // Heat center (Frame 2: White hot pulse)
	]]),
	solarArray: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#1A1C20'], [1, 1, 14, 14, '#30D850'],
		[3, 0, 2, 16, '#F0F0F0'], [7, 0, 2, 16, '#F0F0F0'],
		[11, 0, 2, 16, '#F0F0F0'],
		[1, 1, 2, 2, '#FACA10'], // Corner charge pulse (Frame 1)
	], [
		[0, 0, 16, 16, '#1A1C20'], [1, 1, 14, 14, '#30D850'],
		[3, 0, 2, 16, '#F0F0F0'], [7, 0, 2, 16, '#F0F0F0'],
		[11, 0, 2, 16, '#F0F0F0'],
		[3, 3, 2, 2, '#FACA10'], // Corner charge pulse (Frame 2: Shifted down/right)
	]]),
	methaneBurner: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#30D850'],
		[10, 10, 12, 12, '#D83030'], [14, 14, 4, 4, '#F0F0F0'],
		[2, 2, 4, 4, '#FACA10'], [26, 2, 4, 4, '#FACA10'],
		[2, 26, 4, 4, '#FACA10'], [26, 26, 4, 4, '#FACA10'],
		[12, 12, 8, 8, '#D83030'], // Burner pulse (Frame 1: Red flame)
	], [
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#30D850'],
		[10, 10, 12, 12, '#D83030'], [14, 14, 4, 4, '#F0F0F0'],
		[2, 2, 4, 4, '#FACA10'], [26, 2, 4, 4, '#FACA10'],
		[2, 26, 4, 4, '#FACA10'], [26, 26, 4, 4, '#FACA10'],
		[11, 11, 10, 10, '#FACA10'], // Burner pulse (Frame 2: Larger yellow flame)
	]]),
	thermiteReactor: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#4C5056'],
		[6, 6, 20, 20, '#D83030'], [10, 10, 12, 12, '#F0F0F0'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#D83030'], // Core blink (Frame 1: Red Center)
	], [
		[0, 0, 32, 32, '#1A1C20'], [2, 2, 28, 28, '#4C5056'],
		[6, 6, 20, 20, '#D83030'], [10, 10, 12, 12, '#F0F0F0'],
		[15, 0, 2, 32, '#FACA10'], [0, 15, 32, 2, '#FACA10'],
		[14, 14, 4, 4, '#F0F0F0'], // Core blink (Frame 2: White Hot Center)
	]]),
	conductor: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#FACA10'], [0, 3, 8, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'],
		[3, 3, 2, 2, '#F0F0F0'], // Power blink (Frame 1)
	], [
		[3, 0, 2, 8, '#FACA10'], [0, 3, 8, 2, '#FACA10'],
		[3, 3, 2, 2, '#D83030'],
		[3, 3, 2, 2, '#FACA10'], // Power blink (Frame 2: Yellow)
	]]),
	battery: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#30D850'], [1, 1, 14, 14, '#1A1C20'],
		[4, 4, 8, 8, '#FACA10'], [7, 1, 2, 14, '#F0F0F0'],
		[1, 7, 14, 2, '#F0F0F0'],
		[4, 4, 8, 2, '#F0F0F0'], // Charge bar 1
	], [
		[0, 0, 16, 16, '#30D850'], [1, 1, 14, 14, '#1A1C20'],
		[4, 4, 8, 8, '#FACA10'], [7, 1, 2, 14, '#F0F0F0'],
		[1, 7, 14, 2, '#F0F0F0'],
		[4, 6, 8, 2, '#F0F0F0'], // Charge bar 2 (Shifted down)
	]]),

	// --- FLUID/AIR (2 Frames: Gas/Fluid Pulse) ---
	airVent: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#9AA0AA'], [3, 0, 2, 1, '#4070D0'],
		[3, 7, 2, 1, '#4070D0'], [0, 3, 1, 2, '#4070D0'],
		[7, 3, 1, 2, '#4070D0'],
		[3, 0, 2, 1, '#F0F0F0'], // Air pulse (Frame 1)
	], [
		[1, 1, 6, 6, '#9AA0AA'], [3, 0, 2, 1, '#4070D0'],
		[3, 7, 2, 1, '#4070D0'], [0, 3, 1, 2, '#4070D0'],
		[7, 3, 1, 2, '#4070D0'],
		[3, 7, 2, 1, '#F0F0F0'], // Air pulse (Frame 2: Output end)
	]]),
	waterVent: new AnimatedGeneratedTextures(8, [[
		[1, 1, 6, 6, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'],
		[3, 7, 2, 1, '#F0F0F0'], [0, 3, 1, 2, '#F0F0F0'],
		[7, 3, 1, 2, '#F0F0F0'],
		[3, 0, 2, 1, '#F0F0F0'], // Water pulse (Frame 1)
	], [
		[1, 1, 6, 6, '#4070D0'], [3, 0, 2, 1, '#F0F0F0'],
		[3, 7, 2, 1, '#F0F0F0'], [0, 3, 1, 2, '#F0F0F0'],
		[7, 3, 1, 2, '#F0F0F0'],
		[3, 7, 2, 1, '#F0F0F0'], // Water pulse (Frame 2: Output end)
	]]),
	methaneVent: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#30D850'], [2, 2, 12, 12, '#1A1C20'],
		[7, 0, 2, 4, '#D83030'], [0, 7, 4, 2, '#D83030'],
		[7, 12, 2, 4, '#D83030'], [12, 7, 4, 2, '#D83030'],
		[8, 1, 2, 2, '#FACA10'], // Methane pulse (Frame 1)
	], [
		[0, 0, 16, 16, '#30D850'], [2, 2, 12, 12, '#1A1C20'],
		[7, 0, 2, 4, '#D83030'], [0, 7, 4, 2, '#D83030'],
		[7, 12, 2, 4, '#D83030'], [12, 7, 4, 2, '#D83030'],
		[1, 8, 2, 2, '#FACA10'], // Methane pulse (Frame 2: Rotated)
	]]),
	pump: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[6, 6, 4, 4, '#4070D0'],
		[7, 4, 2, 2, '#F0F0F0'], [7, 10, 2, 2, '#F0F0F0'],
		[4, 7, 2, 2, '#F0F0F0'], [10, 7, 2, 2, '#F0F0F0'], // Impeller: Cross
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[6, 6, 4, 4, '#4070D0'],
		[4, 4, 2, 2, '#F0F0F0'], [10, 4, 2, 2, '#F0F0F0'],
		[4, 10, 2, 2, '#F0F0F0'], [10, 10, 2, 2, '#F0F0F0'], // Impeller: Diagonal
	]]),
	poweredPump: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[6, 6, 4, 4, '#FACA10'], [1, 1, 2, 2, '#D83030'],
		[7, 4, 2, 2, '#F0F0F0'], [7, 10, 2, 2, '#F0F0F0'],
		[4, 7, 2, 2, '#F0F0F0'], [10, 7, 2, 2, '#F0F0F0'], // Impeller: Cross
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[7, 0, 2, 16, '#4070D0'], [0, 7, 16, 2, '#4070D0'],
		[6, 6, 4, 4, '#FACA10'], [1, 1, 2, 2, '#D83030'],
		[4, 4, 2, 2, '#F0F0F0'], [10, 4, 2, 2, '#F0F0F0'],
		[4, 10, 2, 2, '#F0F0F0'], [10, 10, 2, 2, '#F0F0F0'], // Impeller: Diagonal
	]]),
	well: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#4C5056'],
		[10, 10, 12, 12, '#4070D0'], [14, 0, 4, 32, '#4070D0'],
		[0, 14, 32, 4, '#4070D0'], [1, 1, 6, 6, '#FACA10'],
		[25, 1, 6, 6, '#FACA10'], [1, 25, 6, 6, '#FACA10'],
		[25, 25, 6, 6, '#FACA10'],
		[15, 15, 2, 2, '#F0F0F0'], // Water pulse (Frame 1)
	], [
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#4C5056'],
		[10, 10, 12, 12, '#4070D0'], [14, 0, 4, 32, '#4070D0'],
		[0, 14, 32, 4, '#4070D0'], [1, 1, 6, 6, '#FACA10'],
		[25, 1, 6, 6, '#FACA10'], [1, 25, 6, 6, '#FACA10'],
		[25, 25, 6, 6, '#FACA10'],
		[14, 14, 4, 4, '#F0F0F0'], // Water pulse (Frame 2: Larger)
	]]),
	pipe: new AnimatedGeneratedTextures(8, [[
		[3, 0, 2, 8, '#4070D0'],
		[3, 1, 2, 2, '#F0F0F0'], // Fluid pulse (Frame 1)
	], [
		[3, 0, 2, 8, '#4070D0'],
		[3, 5, 2, 2, '#F0F0F0'], // Fluid pulse (Frame 2: Shifted down)
	]]),
	pipeDistributor: new AnimatedGeneratedTextures(8, [[
		[3, 3, 2, 2, '#4070D0'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'],
		[3, 4, 2, 1, '#F0F0F0'], // Center pulse (Frame 1)
	], [
		[3, 3, 2, 2, '#4070D0'], [3, 0, 2, 3, '#9AA0AA'],
		[3, 5, 2, 3, '#9AA0AA'], [0, 3, 3, 2, '#9AA0AA'],
		[5, 3, 3, 2, '#9AA0AA'],
		[3, 3, 2, 2, '#F0F0F0'], // Center pulse (Frame 2: Larger)
	]]),
	pipeJunction: new AnimatedGeneratedTextures(8, [[
		[0, 3, 8, 2, '#4070D0'], [3, 0, 2, 8, '#4070D0'],
		[3, 3, 2, 2, '#F0F0F0'], // Center flash (Frame 1)
	], [
		[0, 3, 8, 2, '#4070D0'], [3, 0, 2, 8, '#4070D0'],
		[3, 3, 2, 2, '#FACA10'], // Center flash (Frame 2: Yellow)
	]]),
	tank: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4070D0'], [2, 2, 12, 12, '#9AA0AA'],
		[4, 4, 8, 1, '#F0F0F0'], [4, 6, 8, 1, '#F0F0F0'],
		[4, 8, 8, 1, '#F0F0F0'], [4, 10, 8, 1, '#F0F0F0'],
		[5, 5, 6, 6, '#9AA0AA'], // Fluid surface ripple (Frame 1)
	], [
		[0, 0, 16, 16, '#4070D0'], [2, 2, 12, 12, '#9AA0AA'],
		[4, 4, 8, 1, '#F0F0F0'], [4, 6, 8, 1, '#F0F0F0'],
		[4, 8, 8, 1, '#F0F0F0'], [4, 10, 8, 1, '#F0F0F0'],
		[4, 4, 8, 8, '#F0F0F0'], // Fluid surface ripple (Frame 2: White)
	]]),

	// --- TURRETS (2 Frames: Recoil/Charge) ---
	shrapnelTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#9AA0AA'], [4, 0, 8, 4, '#D83030'],
		[6, 4, 4, 2, '#FACA10'],
		[5, 0, 6, 4, '#D83030'], // Barrel extended (Frame 1: Ready)
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#9AA0AA'], [4, 0, 8, 4, '#D83030'],
		[6, 4, 4, 2, '#FACA10'],
		[4, 1, 8, 3, '#D83030'], // Barrel recoiled (Frame 2: Fired)
	]]),
	piercingTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#9AA0AA'], [7, 0, 2, 8, '#D83030'],
		[7, 8, 2, 2, '#FACA10'],
		[7, 0, 2, 8, '#D83030'], // Barrel extended (Frame 1: Ready)
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#9AA0AA'], [7, 0, 2, 8, '#D83030'],
		[7, 8, 2, 2, '#FACA10'],
		[7, 1, 2, 7, '#D83030'], // Barrel recoiled (Frame 2: Fired)
	]]),
	arcTurret: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#4070D0'], [7, 0, 2, 4, '#F0F0F0'],
		[0, 7, 4, 2, '#F0F0F0'], [7, 12, 2, 4, '#F0F0F0'],
		[12, 7, 4, 2, '#F0F0F0'],
		[6, 6, 4, 4, '#F0F0F0'], // Central glow (Frame 1: Bright white)
	], [
		[0, 0, 16, 16, '#4C5056'], [2, 2, 12, 12, '#1A1C20'],
		[5, 5, 6, 6, '#4070D0'], [7, 0, 2, 4, '#F0F0F0'],
		[0, 7, 4, 2, '#F0F0F0'], [7, 12, 2, 4, '#F0F0F0'],
		[12, 7, 4, 2, '#F0F0F0'],
		[5, 5, 6, 6, '#4070D0'], // Central glow (Frame 2: Blue)
	]]),
	siegeTurret: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#4C5056'],
		[10, 10, 12, 12, '#4C5056'], [12, 0, 8, 16, '#FACA10'],
		[14, 16, 4, 4, '#D83030'],
		[12, 0, 8, 16, '#FACA10'], // Barrel extended (Frame 1: Ready)
	], [
		[0, 0, 32, 32, '#1A1C20'], [4, 4, 24, 24, '#4C5056'],
		[10, 10, 12, 12, '#4C5056'], [12, 0, 8, 16, '#FACA10'],
		[14, 16, 4, 4, '#D83030'],
		[12, 2, 8, 14, '#FACA10'], // Barrel recoiled (Frame 2: Fired)
	]]),
	laserTurret: new AnimatedGeneratedTextures(32, [[
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#1A1C20'],
		[12, 12, 8, 8, '#D83030'], [14, 0, 4, 32, '#D83030'],
		[1, 1, 6, 6, '#D83030'], [25, 1, 6, 6, '#D83030'],
		[1, 25, 6, 6, '#D83030'], [25, 25, 6, 6, '#D83030'],
		[15, 15, 2, 2, '#F0F0F0'], // Central core spark (Frame 1)
	], [
		[0, 0, 32, 32, '#4C5056'], [4, 4, 24, 24, '#1A1C20'],
		[12, 12, 8, 8, '#D83030'], [14, 0, 4, 32, '#D83030'],
		[1, 1, 6, 6, '#F0F0F0'], [25, 1, 6, 6, '#F0F0F0'], // Capacitors charge white
		[1, 25, 6, 6, '#F0F0F0'], [25, 25, 6, 6, '#F0F0F0'],
		[14, 14, 4, 4, '#F0F0F0'], // Central core large spark (Frame 2)
	]]),

	// --- MOBS (2 Frames: Movement/Blink) ---
	lowTierMob: new AnimatedGeneratedTextures(8, [[
		[2, 2, 4, 4, '#D83030'], [1, 3, 2, 2, '#FACA10'],
		[5, 3, 2, 2, '#FACA10'], [3, 6, 2, 1, '#1A1C20'],
		[3, 6, 2, 1, '#F0F0F0'], // Feet/base 1
	], [
		[2, 2, 4, 4, '#D83030'], [1, 3, 2, 2, '#FACA10'],
		[5, 3, 2, 2, '#FACA10'], [3, 6, 2, 1, '#1A1C20'],
		[3, 7, 2, 1, '#F0F0F0'], // Feet/base 2 (Shifted down for walking effect)
	]]),
};
