import Camera from '../Camera.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Input, KeyBinding, MouseBinding, MouseWheelBinding} from './Input.js';
import Placer from './Placer.js';
import Tooltip from './Tooltip.js';

export default class Controller {
	constructor(camera: Camera, placer: Placer, tooltip: Tooltip, input: Input) {
		input.addBinding(new KeyBinding('a', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(-.01, 0))));
		input.addBinding(new KeyBinding('d', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(.01, 0))));
		input.addBinding(new KeyBinding('w', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(0, -.01))));
		input.addBinding(new KeyBinding('s', [Input.State.DOWN, Input.State.PRESSED], () => camera.move(new Vector(0, .01))));
		input.addBinding(new KeyBinding('q', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(.03)));
		input.addBinding(new KeyBinding('e', [Input.State.DOWN, Input.State.PRESSED], () => camera.zoom(-.03)));

		util.arr(10)
			.map((_, i) => Placer.entityClasses[i])
			.forEach((clazz, i) => input.addBinding(new KeyBinding(String(i + 1), [Input.State.PRESSED], () => placer.selectEntity(clazz))));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.PRESSED], () => placer.start()));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.DOWN], () => placer.move()));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.RELEASED], () => placer.end()));
		input.addBinding(new MouseWheelBinding(false, [Input.State.PRESSED], () => placer.rotate(-1)));
		input.addBinding(new MouseWheelBinding(true, [Input.State.PRESSED], () => placer.rotate(1)));

		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.UP], () => {
			if (!placer.started)
				tooltip.hover();
		}));
		input.addBinding(new MouseBinding(MouseBinding.MouseButton.LEFT, [Input.State.PRESSED], () => {
			if (!placer.started)
				tooltip.toggleSelect();
		}));
	}
}
