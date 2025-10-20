import {Application, Container, TextureStyle} from 'pixi.js';
import Camera from './Camera.js';
import Painter from './graphics/Painter.js';
import SpriteLoader from './graphics/SpriteLoader.js';
import Controller from './ui/Controller.js';
import {Input} from './ui/Input.js';
import Placer from './ui/Placer.js';
import Tooltip from './ui/Tooltip.js';
import Vector from './util/Vector.js';
import {World} from './world/World.js';

(async () => {
	let app = new Application();
	await app.init({
		background: 'black',
		width: 1400,
		height: 1400,
	});
	TextureStyle.defaultOptions.scaleMode = 'nearest';
	document.body.appendChild(app.canvas);
	await SpriteLoader.init(app.renderer);
	let painter = new Painter(app.renderer.width, app.stage);
	let camera = new Camera(painter);
	let uiContainer = new Container();
	app.stage.addChild(uiContainer);
	let input = new Input(app.canvas);
	let world = new World(new Vector(100), camera.container);
	let placer = new Placer(painter, camera, input, world);
	let tooltip = new Tooltip(painter, camera, input, world);
	let controller = new Controller(camera, placer, tooltip, input);

	setInterval(() => {
		camera.tick();
		input.tick();
		world.tick();
		tooltip.tick();
	}, 10);
})();

// todo
//   buildings:
//    - extractor
//    - transport
//    - factory
//    - towers
//    - wall
//    - power
//    - radar, purifier, storage, unloader
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
//   ui:
//    - tooltips
//    - click to select entity
