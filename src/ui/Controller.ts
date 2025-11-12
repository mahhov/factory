import Camera from '../Camera.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Input, InputState, KeyBinding, KeyModifier, MouseBinding, MouseButton, MouseWheelBinding} from './Input.js';
import Placer, {PlacerState} from './Placer.js';
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
		input.addBinding(new MouseBinding(MouseButton.MIDDLE, [InputState.DOWN], () =>
			camera.move(input.mousePosition.subtract(input.mouseLastPosition).scale(new Vector(-.002)))));
		input.addBinding(new MouseWheelBinding(false, () => {
			if (placer.state === PlacerState.EMPTY)
				camera.zoom(-.3);
		}));
		input.addBinding(new MouseWheelBinding(true, () => {
			if (placer.state === PlacerState.EMPTY)
				camera.zoom(.3);
		}));

		// placer
		util.arr(9)
			.forEach(i => {
				let key = String(i + 1);
				input.addBinding(new KeyBinding(key, [], [InputState.PRESSED], () => placer.toggleToolIndex(i)));
				input.addBinding(new KeyBinding(key, [KeyModifier.CONTROL], [InputState.PRESSED], () => placer.setToolGroupIndex(i)));
			});
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.PRESSED], () => {
			if (placer.state !== PlacerState.EMPTY)
				placer.start();
		}));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.DOWN, InputState.UP], () => placer.move()));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.RELEASED], () => placer.end()));
		input.addBinding(new MouseBinding(MouseButton.MIDDLE, [InputState.RELEASED], () => placer.pick()));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.PRESSED], () => {
			placer.clearTool();
			placer.start();
		}));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.DOWN], () => placer.move()));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.RELEASED], () => placer.end()));
		input.addBinding(new MouseWheelBinding(false, () => placer.rotate(-1)));
		input.addBinding(new MouseWheelBinding(true, () => placer.rotate(1)));

		// tooltip
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.UP], () => {
			if (placer.state !== PlacerState.EMPTY)
				tooltip.unselect();
			tooltip.hover();
		}));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.PRESSED], () => {
			if (placer.state === PlacerState.EMPTY)
				tooltip.toggleSelect();
		}));
	}
}
