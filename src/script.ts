import {Application, TextureStyle} from 'pixi.js';
import Camera from './Camera.js';
import {Input, KeyBinding, MouseBinding} from './Input.js';
import Placer from './Placer.js';
import spriteLoader from './spriteLoader.js';
import Vector from './Vector.js';
import {Conveyor, Empty, Source, Void, Wall, World} from './World.js';

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
	let world = new World(World.emptyGrid(100, 100), container);
	let placer = new Placer(camera, input, world);

	input.addBinding(new KeyBinding('a', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(-.01, 0))));
	input.addBinding(new KeyBinding('d', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(.01, 0))));
	input.addBinding(new KeyBinding('w', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(0, -.01))));
	input.addBinding(new KeyBinding('s', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(0, .01))));
	input.addBinding(new KeyBinding('q', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(.03)));
	input.addBinding(new KeyBinding('e', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(-.03)));

	[Empty, Wall, Conveyor, Source, Void].forEach((clazz, i) =>
		input.addBinding(new KeyBinding(String(i + 1), [Input.State.PRESSED], () => placer.selectEntity(clazz))));
	input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.PRESSED], () => placer.start()));
	input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.DOWN, Input.State.PRESSED], () => placer.move()));

	setInterval(() => {
		camera.tick();
		input.tick();
		world.tick();
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
