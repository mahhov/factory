import {Application, Rectangle} from 'pixi.js';
import Camera from './Camera.js';
import Painter from './graphics/Painter.js';
import SpriteLoader from './graphics/SpriteLoader.js';
import Controller from './ui/Controller.js';
import {Input} from './ui/Input.js';
import MultilineText, {Anchor} from './ui/MultilineText.js';
import Placer from './ui/Placer.js';
import TextLine from './ui/TextLine.js';
import Tooltip from './ui/Tooltip.js';
import BackgroundMusic from './util/BackgroundMusic.js';
import Vector from './util/Vector.js';
import {World} from './world/World.js';

class Loop {
	private readonly multilineText: MultilineText;
	private readonly index: number;
	private readonly label: string;
	private frames = 0;
	private last = 0;
	private readonly handler: () => void;

	constructor(multilineText: MultilineText, index: number, label: string, handler: () => void) {
		this.multilineText = multilineText;
		this.index = index;
		this.label = label;
		this.handler = handler;
	}

	run() {
		let now = performance.now();
		let elapsed = now - this.last;
		if (elapsed > 1000) {
			let fps = this.frames / elapsed * 1000;
			this.multilineText.lines[this.index] = new TextLine(`${this.label} ${Math.floor(fps)}`, {size: 10});
			this.multilineText.tick();
			this.frames = 0;
			this.last = now;
		}
		this.frames++;
		this.handler();
	}
}

let resize = () => {
	app.renderer.resize(window.innerWidth, window.innerHeight);
	app.stage.hitArea = new Rectangle(0, 0, app.renderer.width, app.renderer.height);
	painter.resize(new Vector(app.renderer.width, app.renderer.height));
};

let app = new Application();
await app.init({background: 'black'});
app.stage.eventMode = 'static';
document.body.appendChild(app.canvas);
await SpriteLoader.init(app.renderer);
let painter = new Painter(app.stage);
painter.addListener('resize', (size: Vector) => fpsText.position = new Vector(size.x / size.y, 0));
let camera = new Camera(painter, new Vector(.4), .2);
let input = new Input(app.stage, painter);
let world = new World(new Vector(300), painter, camera.container);
let placer = new Placer(painter, camera, input, world);
let tooltip = new Tooltip(painter, camera, input, world);
let controller = new Controller(camera, placer, tooltip, input, painter, world.size);
let backgroundMusic = BackgroundMusic.load();
let fpsText = new MultilineText(painter, new Vector(1, 0), [], Anchor.TOP_RIGHT);
let renderLoop = new Loop(fpsText, 0, 'render fps', () => {});
app.ticker.add(() => renderLoop.run());
let updateLoop = new Loop(fpsText, 1, 'update fps', () => {
	if (!document.hidden) {
		world.tick();
		camera.tick();
		input.tick();
		tooltip.tick();
	}
});
setInterval(() => updateLoop.run(), 10);
window.addEventListener('resize', resize);
resize();

console.info('version', (await (await fetch('./version.txt')).text()).trim());

// try {
// 	let serialized = await Storage.read('save');
// 	let loadedWorld = Serializer.deserialize(serialized);
// 	// if (loadedWorld)
// 	// 	world = loadedWorld;
// 	console.log('loaded');
// } catch (e) {
// 	console.warn('failed to load', e);
// } finally {
// 	setInterval(async () => {
// 		let serialized = Serializer.serialize(world);
// 		await Storage.write('save', serialized);
// 		console.log('saved');
// 	}, 1000);
// }

// todo
//   buildings:
//    - extractor
//    - transport
//    - factory
//    - towers
//    - wall
//    - power
//    - radar, purifier, storage, unloader
//    - modular weapons
//   resources:
//    - deposit
//    - wall mining
//    - liquid pools
//    - air
//   dynamic:
//    - resources deplete
//    - new resources emerge
//    - enemy spawn points, rogue armadas, creepers
//   spread:
//    - localized resources
//    - costly local outpost safe zones
//    - pollution or limit on outpost size
//    - limited building space
//    - weapons cover area instead of perimeter
//    - easier to transport outputs than bulk inputs
//   dangers:
//    - weather
//    - storm
//    - sunlight
//    - flood
//    - asteroid
//   enemies:
//    - self-destruct bugs
//    - small ships
//    - big ships that fire artillery and spawn smaller ships
//    - piercing lasers
//    - aoe attacks
//    - stationary towers

// todo save/load
// todo packed conveyor
// todo manual culling
