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

	let input = new Input();
	input.bindings.cameraLeft.setListener(() => camera.move(new Vector(-.01, 0)));
	input.bindings.cameraRight.setListener(() => camera.move(new Vector(.01, 0)));
	input.bindings.cameraUp.setListener(() => camera.move(new Vector(0, -.01)));
	input.bindings.cameraDown.setListener(() => camera.move(new Vector(0, .01)));
	input.bindings.cameraZoomOut.setListener(() => camera.zoom(.03));
	input.bindings.cameraZoomIn.setListener(() => camera.zoom(-.03));

	let world = new World(World.randomGrid(100, 100), container);

	setInterval(() => {
		input.tick();
		camera.tick();
	}, 10);

	let anim = spriteLoader.animation(spriteLoader.Resource.CONVEYOR, 'move');
	anim.x = .5;
	anim.y = .5;
	anim.width = .1;
	anim.height = anim.width;
	anim.animationSpeed = 0.1;
	anim.play();
	container.addChild(anim);
})();
