import {Application, Container, TextureStyle} from 'pixi.js';
import Camera from './Camera.js';
import {Input, KeyBinding, MouseBinding, MouseWheelBinding} from './ui/Input.js';
import Painter from './graphics/Painter.js';
import Placer from './ui/Placer.js';
import SpriteLoader from './graphics/SpriteLoader.js';
import Tooltip from './ui/Tooltip.js';
import Vector from './util/Vector.js';
import {World, WorldLayer} from './world/World.js';

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
	let world = new World(WorldLayer.emptyGrid(100, 100), camera.container);
	let placer = new Placer(painter, camera, input, world);
	let tooltip = new Tooltip(painter, camera, input, world.live);

	input.addBinding(new KeyBinding('a', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(-.01, 0))));
	input.addBinding(new KeyBinding('d', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(.01, 0))));
	input.addBinding(new KeyBinding('w', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(0, -.01))));
	input.addBinding(new KeyBinding('s', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(0, .01))));
	input.addBinding(new KeyBinding('q', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(.03)));
	input.addBinding(new KeyBinding('e', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(-.03)));

	Placer.entityClasses.forEach((clazz, i) => input.addBinding(new KeyBinding(String(i + 1), [Input.State.PRESSED], () => placer.selectEntity(clazz))));
	input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.PRESSED], () => placer.start()));
	input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.DOWN], () => placer.move()));
	input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.RELEASED], () => placer.end()));
	input.addBinding(new MouseWheelBinding(false, [Input.State.PRESSED], () => placer.rotate(-1)));
	input.addBinding(new MouseWheelBinding(true, [Input.State.PRESSED], () => placer.rotate(1)));

	input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.UP], () => tooltip.reposition()));

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
