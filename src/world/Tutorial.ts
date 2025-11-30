import Camera from '../Camera.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import MultilineText from '../ui/MultilineText.js';
import TextLine from '../ui/TextLine.js';
import Vector from '../util/Vector.js';
import {Material} from './Resource.js';
import {World} from './World.js';

abstract class TutorialStep {
	readonly textLines: TextLine[];
	done: boolean = false;

	protected constructor(textLines: TextLine[]) {
		this.textLines = textLines;
	}

	initialize(world: World, camera: Camera): void {}

	tick(world: World, camera: Camera): void {}
}

class CameraTutorial extends TutorialStep {
	constructor() {
		super([
			new TextLine('Camera Tutorial', {color: Color.NAME_TEXT}),
			new TextLine('Use WASD or drag the middle mouse button to the pan camera.', {color: Color.DESCRIPTION_TEXT}),
			new TextLine('Use QE or mouse wheel to zoom the camera.', {color: Color.DESCRIPTION_TEXT}),
		]);
	}

	initialize(world: World, camera: Camera): void {
		camera.addListener('change', () => this.done = true);
	}
}

class ExtractorTutorial extends TutorialStep {
	constructor() {
		super([
			new TextLine('Placement Tutorial', {color: Color.NAME_TEXT}),
			new TextLine('Press <1> to select the extractor.', {color: Color.DESCRIPTION_TEXT}),
			new TextLine('Or use the buttons at the bottom.', {color: Color.DESCRIPTION_TEXT}),
			new TextLine('Click on an iron deposit to place the extractor.', {color: Color.DESCRIPTION_TEXT}),
		]);
	}

	tick(world: World, camera: Camera): void {
		for (let position of world.live.nonEmptyPositions) {
			let tile = world.live.getTileUnchecked(position);
			if (tile.tileable.constructor.name === 'Extractor') {
				this.done = true;
				return;
			}
		}
	}
}

class ObtainMaterial extends TutorialStep {
	private readonly material: Material;
	private oldQuantity = Infinity;

	constructor(textLines: TextLine[], material: Material) {
		super(textLines);
		this.material = material;
	}

	tick(world: World, camera: Camera): void {
		let quantity = world.playerLogic.materials.quantity(this.material);
		this.done = quantity > this.oldQuantity;
		this.oldQuantity = quantity;
	}
}

class IronTutorial extends ObtainMaterial {
	constructor() {
		super([
			new TextLine('Transport Tutorial', {color: Color.NAME_TEXT}),
			new TextLine('Press <ctrl+2> to select the conveyor belt.', {color: Color.DESCRIPTION_TEXT}),
			new TextLine('Or use the buttons at the bottom.', {color: Color.DESCRIPTION_TEXT}),
			new TextLine('Drag to create a path from the extractor to your base.', {color: Color.DESCRIPTION_TEXT}),
		], Material.IRON);
	}
}

class SteelTutorial extends ObtainMaterial {
	constructor() {
		super([
			new TextLine('Production Tutorial', {color: Color.NAME_TEXT}),
			new TextLine('Combine iron and flux-sand in a Steel Smelter to create steel.', {color: Color.DESCRIPTION_TEXT}),
		], Material.STEEL);
	}
}

export default class Tutorial {
	private index = -1;
	private readonly steps = [
		new CameraTutorial(),
		new ExtractorTutorial(),
		new IronTutorial(),
		new SteelTutorial(),
	];
	private readonly multilineText: MultilineText;
	private readonly world: World;
	private readonly camera: Camera;

	constructor(painter: Painter, world: World, camera: Camera) {
		this.multilineText = new MultilineText(painter, new Vector(.005, .5));
		this.multilineText.tick();
		this.world = world;
		this.camera = camera;
	}

	private get step(): TutorialStep | undefined {
		return this.steps[this.index];
	}

	private nextStep() {
		this.index++;
		let step = this.step;
		if (step) {
			step.initialize(this.world, this.camera);
			this.multilineText.lines = step.textLines;
		} else
			this.multilineText.lines = [];
		this.multilineText.tick();
	}

	get done() {
		return this.index > this.steps.length - 1;
	}

	tick() {
		// todo remove from tickables when done
		if (this.done) return;
		console.assert(!this.done);
		let step = this.step;
		step?.tick(this.world, this.camera);
		if (!step || step.done)
			this.nextStep();
	}
}
