import {Application, Container, Rectangle} from 'pixi.js';
import Camera from './Camera.js';
import Painter from './graphics/Painter.js';
import SpriteLoader from './graphics/SpriteLoader.js';
import Controller from './ui/Controller.js';
import {Input} from './ui/Input.js';
import Placer from './ui/Placer.js';
import Tooltip from './ui/Tooltip.js';
import BackgroundMusic from './util/BackgroundMusic.js';
import Vector from './util/Vector.js';
import {World} from './world/World.js';

class Loop {
	private label: string;
	private frames = 0;
	private last = 0;
	mostRecentFps = 0;
	private readonly handler: () => void;

	constructor(label: string, handler: () => void) {
		this.label = label;
		this.handler = handler;
	}

	run() {
		let now = performance.now();
		let elapsed = now - this.last;
		if (elapsed > 1000) {
			let fps = this.frames / elapsed * 1000;
			// console.log(this.label, fps);
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
window.addEventListener('resize', resize);

let app = new Application();
await app.init({background: 'black'});
app.stage.eventMode = 'static';
document.body.appendChild(app.canvas);
await SpriteLoader.init(app.renderer);
let painter = new Painter(app.stage);
resize();
let camera = new Camera(painter);
let uiContainer = new Container();
app.stage.addChild(uiContainer);
let input = new Input(app.stage);
let world = new World(new Vector(100), painter, camera.container);
let placer = new Placer(painter, camera, input, world);
let tooltip = new Tooltip(painter, camera, input, world);
let controller = new Controller(camera, placer, tooltip, input);
BackgroundMusic.load();

let renderLoop = new Loop('render fps', () => {
	camera.tick();
	input.tick();
	tooltip.tick();
});
app.ticker.add(() => renderLoop.run());

let updateLoop = new Loop('update fps', () => {
	world.tick();
});
setInterval(() => updateLoop.run(), 10);

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
