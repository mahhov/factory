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
	pump: new AnimatedGeneratedTextures(16, [[
		[0, 0, 16, 16, '#475569'],
		[2, 2, 12, 12, '#1f2937'],
		[7, 0, 2, 16, '#3b82f6'],
		[0, 7, 16, 2, '#3b82f6'],
		[6, 6, 4, 4, '#0ea5e9'], // Fluid Impeller Core
		// Impeller Blades (Diagonal Corners)
		[4, 4, 2, 2, '#ecfdf5'],
		[10, 4, 2, 2, '#ecfdf5'],
		[4, 10, 2, 2, '#ecfdf5'],
		[10, 10, 2, 2, '#ecfdf5'],
	], [
		[0, 0, 16, 16, '#475569'],
		[2, 2, 12, 12, '#1f2937'],
		[7, 0, 2, 16, '#3b82f6'],
		[0, 7, 16, 2, '#3b82f6'],
		[6, 6, 4, 4, '#0ea5e9'], // Fluid Impeller Core
		// Impeller Blades (Up/Down/Left/Right)
		[7, 4, 2, 2, '#ecfdf5'],
		[7, 10, 2, 2, '#ecfdf5'],
		[4, 7, 2, 2, '#ecfdf5'],
		[10, 7, 2, 2, '#ecfdf5'],
	]]),
};

// Object.entries({
// 	// Resource deposits
// 	ironDeposit: new GeneratedTexture(24, [
// 		[2, 4, 20, 14, '#3f434a'],
// 		[6, 8, 5, 6, '#2b2f35'],
// 		[13, 6, 6, 5, '#2b2f35'],
// 		[4, 6, 4, 2, '#555a63'],
// 	]),
//
// 	sulphateDeposit: new GeneratedTexture(24, [
// 		[3, 3, 18, 18, '#b89f34'],
// 		[6, 6, 5, 7, '#8c7a28'],
// 		[13, 5, 5, 6, '#8c7a28'],
// 		[5, 12, 6, 6, '#e0cf5b'],
// 	]),
//
// 	fluxSandDeposit: new GeneratedTexture(24, [
// 		[2, 2, 20, 20, '#d9d4c0'],
// 		[6, 6, 7, 6, '#c3bda6'],
// 		[13, 7, 5, 6, '#bfb9a4'],
// 		[4, 14, 6, 4, '#f3eed7'],
// 	]),
//
// 	// Liquids
// 	waterLake: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2d6fa3'],
// 		[2, 3, 20, 5, '#3a86be'],
// 		[4, 12, 16, 6, '#3983bc'],
// 		[3, 19, 10, 3, '#3fa6d8'],
// 	]),
//
// 	methaneLake: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#3d1e72'],
// 		[2, 4, 20, 5, '#572a95'],
// 		[5, 12, 14, 6, '#6a3cb3'],
// 		[3, 18, 12, 4, '#7d45cc'],
// 	]),
//
// 	// Walls & bunker
// 	ironWall: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#3d4248'],
// 		[3, 3, 18, 18, '#2b2f34'],
// 		[4, 4, 6, 6, '#555a5f'],
// 		[14, 14, 6, 6, '#555a5f'],
// 	]),
//
// 	steelWall: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2a2e34'],
// 		[3, 3, 18, 18, '#1c1f24'],
// 		[5, 5, 6, 6, '#737b85'],
// 		[12, 11, 5, 6, '#8c96a1'],
// 	]),
//
// 	bunker: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#26282c'],
// 		[3, 3, 18, 18, '#3e4247'],
// 		[6, 6, 12, 6, '#141618'],
// 		[8, 12, 8, 6, '#4d5259'],
// 	]),
//
// 	// Extractors
// 	extractor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#3a3d41'],
// 		[4, 4, 16, 16, '#2a2d30'],
// 		[8, 8, 8, 8, '#1c1e20'],
// 		[5, 5, 14, 2, '#4c5055'],
// 	]),
//
// 	reinforcedExtractor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2c2f33'],
// 		[3, 3, 18, 18, '#1d1f22'],
// 		[4, 4, 6, 6, '#4d535a'],
// 		[9, 9, 6, 6, '#2ab3f7'],
// 	]),
//
// 	quadraticExtractor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#33363a'],
// 		[5, 5, 5, 5, '#1f2225'],
// 		[14, 5, 5, 5, '#1f2225'],
// 		[5, 14, 5, 5, '#1f2225'],
// 		[14, 14, 5, 5, '#1f2225'],
// 	]),
//
// 	laserExtractor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#26282d'],
// 		[4, 4, 16, 16, '#1d1f24'],
// 		[8, 8, 8, 8, '#6a3c9f'],
// 		[11, 11, 2, 2, '#ff1744'],
// 	]),
//
// 	// Conveyors & transport
// 	conveyor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2a2d31'],
// 		[0, 0, 3, 24, '#3b3f44'],
// 		[21, 0, 3, 24, '#3b3f44'],
// 		[3, 0, 18, 24, '#1f2225'],
// 	]),
//
// 	highSpeedConveyor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#33373c'],
// 		[0, 0, 3, 24, '#4d5257'],
// 		[21, 0, 3, 24, '#4d5257'],
// 		[3, 0, 18, 24, '#1b1d21'],
// 		[3, 2, 18, 2, '#636b75'],
// 	]),
//
// 	distributor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2d3135'],
// 		[8, 8, 8, 8, '#1e2023'],
// 		[11, 0, 2, 8, '#45494e'],
// 		[0, 11, 8, 2, '#45494e'],
// 	]),
//
// 	junction: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2c2f33'],
// 		[0, 10, 24, 4, '#1f2225'],
// 		[10, 0, 4, 24, '#1f2225'],
// 		[0, 9, 24, 1, '#3b3f44'],
// 	]),
//
// 	// Processing buildings
// 	steelSmelter: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2d3036'],
// 		[4, 4, 16, 16, '#1c1e22'],
// 		[6, 10, 12, 8, '#3b3f46'],
// 		[8, 12, 8, 4, '#d46a1c'],
// 	]),
//
// 	metaglassFoundry: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2e3136'],
// 		[4, 4, 16, 16, '#202226'],
// 		[6, 6, 12, 6, '#2f9bd6'],
// 		[8, 9, 8, 3, '#6fc5ff'],
// 	]),
//
// 	plasteelMixer: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#30343a'],
// 		[4, 4, 16, 16, '#1f2226'],
// 		[6, 8, 12, 8, '#5a7b9a'],
// 		[9, 11, 6, 4, '#f0b04e'],
// 	]),
//
// 	thermiteForge: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2e32'],
// 		[4, 4, 16, 16, '#191b20'],
// 		[7, 10, 10, 6, '#b63b11'],
// 		[9, 12, 6, 3, '#ff6f2a'],
// 	]),
//
// 	exidiumCatalyst: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2a2d30'],
// 		[5, 5, 14, 14, '#1b1d21'],
// 		[8, 8, 8, 8, '#7b2e8e'],
// 		[10, 10, 4, 4, '#ff3f6b'],
// 	]),
//
// 	// Storage & dispenser
// 	storage: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2f3337'],
// 		[4, 4, 16, 16, '#202326'],
// 		[6, 6, 12, 12, '#3b3f44'],
// 		[9, 9, 6, 6, '#2e3237'],
// 	]),
//
// 	dispenser: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2f3337'],
// 		[4, 4, 16, 16, '#1f2226'],
// 		[9, 9, 6, 6, '#e09a3a'],
// 		[10, 10, 4, 4, '#ffd27a'],
// 	]),
//
// 	// Power generation & storage
// 	thermalGenerator: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2f33'],
// 		[4, 4, 16, 16, '#1c1f22'],
// 		[7, 7, 10, 10, '#2f9bd6'],
// 		[9, 12, 6, 4, '#66c4ff'],
// 	]),
//
// 	solarArray: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2c2f33'],
// 		[3, 6, 18, 12, '#1a2230'],
// 		[6, 8, 12, 8, '#2a9be6'],
// 		[8, 10, 8, 4, '#66c4ff'],
// 	]),
//
// 	methaneBurner: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2d2f33'],
// 		[4, 4, 16, 16, '#191b20'],
// 		[8, 10, 8, 6, '#6a3cb3'],
// 		[10, 12, 4, 2, '#9f6df0'],
// 	]),
//
// 	thermiteReactor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#27292d'],
// 		[3, 3, 18, 18, '#16171a'],
// 		[7, 7, 10, 10, '#c43a12'],
// 		[9, 11, 6, 6, '#ff7a2f'],
// 	]),
//
// 	conductor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2e33'],
// 		[10, 0, 4, 24, '#4b5158'],
// 		[0, 10, 24, 4, '#4b5158'],
// 		[11, 11, 2, 2, '#ffd24a'],
// 	]),
//
// 	battery: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2a2e33'],
// 		[4, 4, 16, 16, '#1f2226'],
// 		[8, 6, 8, 12, '#3b3f44'],
// 		[10, 8, 4, 8, '#ffd24a'],
// 	]),
//
// 	// Vents
// 	airVent: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2c2f33'],
// 		[4, 4, 16, 16, '#1d2024'],
// 		[6, 6, 12, 4, '#4a4f54'],
// 		[6, 14, 12, 4, '#3b4045'],
// 	]),
//
// 	waterVent: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2c2f33'],
// 		[4, 4, 16, 16, '#172833'],
// 		[6, 6, 12, 4, '#2d6fa3'],
// 		[6, 14, 12, 4, '#3fa6d8'],
// 	]),
//
// 	methaneVent: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2c2f33'],
// 		[4, 4, 16, 16, '#1b1030'],
// 		[6, 6, 12, 4, '#5a2a91'],
// 		[6, 14, 12, 4, '#7d45cc'],
// 	]),
//
// 	// Pumps & wells
// 	pump: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#33363a'],
// 		[5, 5, 14, 14, '#1f2225'],
// 		[9, 9, 6, 6, '#2f9bd6'],
// 		[10, 10, 4, 4, '#66c4ff'],
// 	]),
//
// 	poweredPump: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2e33'],
// 		[4, 4, 16, 16, '#1c1f22'],
// 		[7, 7, 10, 10, '#4c9be6'],
// 		[10, 10, 4, 4, '#ffd24a'],
// 	]),
//
// 	well: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2e3136'],
// 		[6, 6, 12, 12, '#1f2428'],
// 		[8, 8, 8, 8, '#2d6fa3'],
// 		[10, 10, 4, 4, '#66c4ff'],
// 	]),
//
// 	// Pipes & tanks
// 	pipe: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2e32'],
// 		[10, 0, 4, 24, '#4b4f54'],
// 		[0, 10, 24, 4, '#4b4f54'],
// 		[11, 11, 2, 2, '#6f6f73'],
// 	]),
//
// 	pipeDistributor: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2e32'],
// 		[8, 8, 8, 8, '#1f2226'],
// 		[11, 0, 2, 8, '#45494e'],
// 		[0, 11, 8, 2, '#45494e'],
// 	]),
//
// 	pipeJunction: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2b2e32'],
// 		[0, 10, 24, 4, '#4b4f54'],
// 		[10, 0, 4, 24, '#4b4f54'],
// 		[11, 11, 2, 2, '#9aa0a6'],
// 	]),
//
// 	tank: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2f3337'],
// 		[4, 4, 16, 16, '#1f2226'],
// 		[6, 6, 12, 12, '#3b3f44'],
// 		[8, 8, 8, 8, '#2d6fa3'],
// 	]),
//
// 	// Turrets
// 	shrapnelTurret: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2d3034'],
// 		[6, 6, 12, 12, '#1d2023'],
// 		[8, 8, 8, 8, '#7a2f2f'],
// 		[10, 10, 4, 4, '#ff6b4d'],
// 	]),
//
// 	piercingTurret: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2d3034'],
// 		[5, 5, 14, 14, '#1c1f22'],
// 		[8, 7, 8, 10, '#26343f'],
// 		[11, 9, 2, 6, '#ffd24a'],
// 	]),
//
// 	arcTurret: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#26282c'],
// 		[5, 5, 14, 14, '#1a1c1f'],
// 		[8, 8, 8, 8, '#2a9be6'],
// 		[10, 10, 4, 4, '#66c4ff'],
// 	]),
//
// 	siegeTurret: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#2a2d31'],
// 		[4, 4, 16, 16, '#1b1d20'],
// 		[6, 6, 12, 6, '#4b4f54'],
// 		[8, 9, 8, 6, '#9a9fa4'],
// 	]),
//
// 	laserTurret: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#26282c'],
// 		[5, 5, 14, 14, '#191b1f'],
// 		[9, 8, 6, 8, '#6a3c9f'],
// 		[11, 10, 2, 4, '#ff1744'],
// 	]),
//
// 	// Enemies (variety)
// 	enemySmall: new GeneratedTexture(24, [
// 		[4, 4, 16, 16, '#3a3b3f'],
// 		[7, 7, 10, 10, '#2b2d30'],
// 		[9, 9, 6, 6, '#ffd6a6'],
// 	]),
//
// 	enemySpitter: new GeneratedTexture(24, [
// 		[3, 3, 18, 18, '#5a2a2a'],
// 		[7, 7, 10, 10, '#3b1a1a'],
// 		[10, 9, 4, 6, '#ff6b4d'],
// 	]),
//
// 	enemyTank: new GeneratedTexture(24, [
// 		[0, 0, 24, 24, '#323639'],
// 		[4, 6, 16, 12, '#1f2225'],
// 		[7, 8, 10, 8, '#4b4f54'],
// 		[10, 9, 4, 6, '#ff6b4d'],
// 	]),
//
// 	enemyDrone: new GeneratedTexture(24, [
// 		[6, 6, 12, 12, '#2b2f33'],
// 		[8, 8, 8, 8, '#1f2226'],
// 		[10, 10, 4, 4, '#ff3f6b'],
// 	]),
// }).forEach(([name, texture]) => {
// 	let c = texture.texture.source.resource;
// 	c.title = name;
// 	document.body.appendChild(c);
// });

