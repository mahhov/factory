import Camera from '../Camera.js';
import util from '../util/util.js';
import Vector2 from '../util/Vector2.js';
import {Empty} from '../world/Entity.js';
import {Input, KeyBinding, MouseBinding, MouseWheelBinding} from './Input.js';
import Placer from './Placer.js';
import Tooltip from './Tooltip.js';

export default class Controller {
	constructor(camera: Camera, placer: Placer, tooltip: Tooltip, input: Input) {
		// camera
		input.addBinding(new KeyBinding('a', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector2(-.01, 0))));
		input.addBinding(new KeyBinding('d', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector2(.01, 0))));
		input.addBinding(new KeyBinding('w', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector2(0, -.01))));
		input.addBinding(new KeyBinding('s', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector2(0, .01))));
		input.addBinding(new KeyBinding('q', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(.03)));
		input.addBinding(new KeyBinding('e', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(-.03)));
		input.addBinding(new MouseWheelBinding(false, [Input.State.PRESSED], () => {
			if (placer.state !== Placer.State.STARTED)
				camera.zoom(-.3);
		}));
		input.addBinding(new MouseWheelBinding(true, [Input.State.PRESSED], () => {
			if (placer.state !== Placer.State.STARTED)
				camera.zoom(.3);
		}));

		// placer
		util.arr(10)
			.map(i => Placer.entityClasses[i])
			.forEach((clazz, i) => input.addBinding(new KeyBinding(String(i + 1), [Input.State.PRESSED], () => placer.toggleEntity(clazz))));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.PRESSED], () => {
			if (placer.state !== Placer.State.EMPTY)
				placer.start();
		}));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.DOWN, Input.State.UP], () => placer.move()));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.RELEASED], () => placer.end()));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.MIDDLE, [Input.State.RELEASED], () => placer.pick()));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.RIGHT, [Input.State.PRESSED], () => {
			placer.setEntity(Empty);
			placer.start();
		}));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.RIGHT, [Input.State.DOWN, Input.State.UP], () => placer.move()));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.RIGHT, [Input.State.RELEASED], () => placer.end()));
		input.addBinding(new MouseWheelBinding(false, [Input.State.PRESSED], () => placer.rotate(-1)));
		input.addBinding(new MouseWheelBinding(true, [Input.State.PRESSED], () => placer.rotate(1)));

		// tooltip
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.UP], () => {
			if (placer.state === Placer.State.EMPTY)
				tooltip.hover();
			else
				tooltip.unselect();
		}));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.PRESSED], () => {
			if (placer.state === Placer.State.EMPTY)
				tooltip.toggleSelect();
		}));
	}
}
