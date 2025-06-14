import {Application, TextureStyle} from 'pixi.js';
import Camera from './Camera.js';
import Input from './Input.js';
import spriteLoader from './spriteLoader.js';
import Vector from './Vector.js';
import World from './World.js';

(async () => {
	let app = new Application();
	await app.init({
		background: 'black',
		width: 1400,
		height: 1400,
	});
	TextureStyle.defaultOptions.scaleMode = 'nearest';

	document.body.appendChild(app.canvas);

	await spriteLoader.preload();

	let camera = new Camera(app);
	let container = camera.container;

	let input = new Input(app.canvas);
	input.keyBindings.cameraLeft.setListener(() => camera.move(new Vector(-.01, 0)));
	input.keyBindings.cameraRight.setListener(() => camera.move(new Vector(.01, 0)));
	input.keyBindings.cameraUp.setListener(() => camera.move(new Vector(0, -.01)));
	input.keyBindings.cameraDown.setListener(() => camera.move(new Vector(0, .01)));
	input.keyBindings.cameraZoomOut.setListener(() => camera.zoom(.03));
	input.keyBindings.cameraZoomIn.setListener(() => camera.zoom(-.03));

	input.mouseBindings.left.setListener(() => console.log(
		camera.canvasToWorld(input.mousePosition.copy),
		camera.canvasToWorld(input.mouseDownPosition.copy)));

	let world = new World(World.emptyGrid(100, 100), container);

	setInterval(() => {
		input.tick();
		camera.tick();
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
