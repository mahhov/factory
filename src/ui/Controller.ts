import Camera from '../Camera.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Input, InputState, KeyBinding, MouseBinding, MouseButton, MouseWheelBinding} from './Input.js';
import Placer from './Placer.js';
import Tooltip from './Tooltip.js';

export default class Controller {
	constructor(camera: Camera, placer: Placer, tooltip: Tooltip, input: Input) {
		// camera
		input.addBinding(new KeyBinding('a', [], [InputState.DOWN], () => camera.move(new Vector(-.01, 0))));
		input.addBinding(new KeyBinding('d', [], [InputState.DOWN], () => camera.move(new Vector(.01, 0))));
		input.addBinding(new KeyBinding('w', [], [InputState.DOWN], () => camera.move(new Vector(0, -.01))));
		input.addBinding(new KeyBinding('s', [], [InputState.DOWN], () => camera.move(new Vector(0, .01))));
		input.addBinding(new KeyBinding('q', [], [InputState.DOWN], () => camera.zoom(.03)));
		input.addBinding(new KeyBinding('e', [], [InputState.DOWN], () => camera.zoom(-.03)));
		input.addBinding(new MouseWheelBinding(false, () => {
			if (placer.state !== Placer.State.STARTED)
				camera.zoom(-.3);
		}));
		input.addBinding(new MouseWheelBinding(true, () => {
			if (placer.state !== Placer.State.STARTED)
				camera.zoom(.3);
		}));

		// placer
		util.arr(Math.min(util.enumValues(Placer.Tool).length, 8))
			.forEach((tool, i) => input.addBinding(new KeyBinding(String(i), [], [InputState.PRESSED], () => placer.toggleTool(tool))));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.PRESSED], () => {
			if (placer.state !== Placer.State.EMPTY)
				placer.start();
		}));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.DOWN], () => placer.move()));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.RELEASED], () => placer.end()));
		input.addBinding(new MouseBinding(MouseButton.MIDDLE, [InputState.RELEASED], () => placer.pick()));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.PRESSED], () => {
			placer.setTool(Placer.Tool.EMPTY);
			placer.start();
		}));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.DOWN], () => placer.move()));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.RELEASED], () => placer.end()));
		input.addBinding(new MouseWheelBinding(false, () => placer.rotate(-1)));
		input.addBinding(new MouseWheelBinding(true, () => placer.rotate(1)));

		// tooltip
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.UP], () => {
			if (placer.state === Placer.State.EMPTY)
				tooltip.hover();
			else
				tooltip.unselect();
		}));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.PRESSED], () => {
			if (placer.state === Placer.State.EMPTY)
				tooltip.toggleSelect();
		}));
	}
}

// todo middle click drag to move camera
// todo allow clicking ui buttons
