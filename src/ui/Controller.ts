import Camera from '../Camera.js';
import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Input, InputState, KeyBinding, KeyModifier, MouseBinding, MouseButton, MouseWheelBinding} from './Input.js';
import Placer, {PlacerState} from './Placer.js';
import Tooltip from './Tooltip.js';

export default class Controller {
	private readonly input: Input;
	private readonly painter: Painter;

	constructor(camera: Camera, placer: Placer, tooltip: Tooltip, input: Input, painter: Painter, worldSize: Vector) {
		this.input = input;
		this.painter = painter;

		// camera
		let zoomSpeed = 2 / Math.min(worldSize.x, worldSize.y);
		input.addBinding(new KeyBinding('KeyA', [], [InputState.DOWN], () => camera.move(new Vector(-.01, 0))));
		input.addBinding(new KeyBinding('KeyD', [], [InputState.DOWN], () => camera.move(new Vector(.01, 0))));
		input.addBinding(new KeyBinding('KeyW', [], [InputState.DOWN], () => camera.move(new Vector(0, -.01))));
		input.addBinding(new KeyBinding('KeyS', [], [InputState.DOWN], () => camera.move(new Vector(0, .01))));
		input.addBinding(new KeyBinding('KeyQ', [], [InputState.DOWN], () => camera.zoom(zoomSpeed, this.input.mouseCanvasPosition)));
		input.addBinding(new KeyBinding('KeyE', [], [InputState.DOWN], () => camera.zoom(-zoomSpeed, this.input.mouseCanvasPosition)));
		input.addBinding(new MouseBinding(MouseButton.MIDDLE, [InputState.DOWN], () =>
			camera.move(input.mousePosition.subtract(input.mouseLastPosition).scale(new Vector(-1 / this.painter.minCanvasSize)))));
		input.addBinding(new MouseWheelBinding(false, () => {
			if (placer.state === PlacerState.EMPTY)
				camera.zoom(-zoomSpeed * 10, this.input.mouseCanvasPosition);
		}));
		input.addBinding(new MouseWheelBinding(true, () => {
			if (placer.state === PlacerState.EMPTY)
				camera.zoom(zoomSpeed * 10, this.input.mouseCanvasPosition);
		}));

		// placer
		util.arr(9)
			.forEach(i => {
				let key = `Digit${i + 1}`;
				input.addBinding(new KeyBinding(key, [], [InputState.PRESSED], () => placer.toggleToolIndex(i)));
				input.addBinding(new KeyBinding(key, [KeyModifier.CONTROL], [InputState.PRESSED], () => placer.setToolGroupIndex(i)));
				input.addBinding(new KeyBinding(key, [KeyModifier.SHIFT], [InputState.PRESSED], () => placer.setToolGroupIndex(i + 5)));
			});
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.PRESSED], () => {
			if (placer.state !== PlacerState.EMPTY && !placer.tooltipVisible)
				placer.start();
		}));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.DOWN, InputState.UP], () => placer.move()));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.RELEASED], () => placer.end()));
		input.addBinding(new MouseBinding(MouseButton.MIDDLE, [InputState.RELEASED], () => {
			if (!placer.tooltipVisible)
				placer.pick();
		}));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.PRESSED], () => {
			if (!placer.tooltipVisible) {
				placer.clearTool();
				placer.start();
			}
		}));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.DOWN], () => placer.move()));
		input.addBinding(new MouseBinding(MouseButton.RIGHT, [InputState.RELEASED], () => placer.end()));
		input.addBinding(new MouseWheelBinding(false, () => placer.rotate(-1)));
		input.addBinding(new MouseWheelBinding(true, () => placer.rotate(1)));

		// tooltip
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.UP], () => {
			if (placer.state !== PlacerState.EMPTY || placer.tooltipVisible)
				tooltip.unselect();
			tooltip.hover();
		}));
		input.addBinding(new MouseBinding(MouseButton.LEFT, [InputState.PRESSED], () => {
			if (placer.state === PlacerState.EMPTY && !placer.tooltipVisible)
				tooltip.toggleSelect();
			else
				tooltip.hide();
		}));
		camera.addListener('change', () => tooltip.dirty());
		placer.addListener('toolChanged', () => tooltip.dirty());
	}
}
