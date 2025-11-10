import {CanvasSource, Texture, TextureStyle} from 'pixi.js';

TextureStyle.defaultOptions.scaleMode = 'nearest';

class GeneratedTexture {
	texture: Texture;

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

	// --- DEFENSES (16x16) ---
	turret: new GeneratedTexture(16, [
		[0, 0, 16, 16, '#4b5563'], // Base Casing (Dark Grey)
		[2, 2, 12, 12, '#374151'], // Inner Base
		[5, 0, 6, 6, '#9ca3af'], // Rotating Turret Head
		[6, 6, 4, 10, '#f87171'], // Projectile Barrel (Red)
		[7, 10, 2, 2, '#fff'], // Muzzle Flash/Indicator
	]),
};

export let coloredGeneratedTextures = {
	// --- OVERLAYS (8x8) ---
	materialIndicator: new ColoredGeneratedTexture(8, color => [
		[2, 2, 4, 4, color], // Small Yellow Square
	]),
};
