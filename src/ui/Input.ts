import Vector2 from '../util/Vector2.js';

enum State {
	DOWN, UP, PRESSED, RELEASED
}

abstract class Binding {
	private readonly listenerStates: State[] = [];
	private readonly listener = () => { };
	private state: State = State.UP;

	protected constructor(listenerStates: State[], listener: () => void) {
		this.listenerStates = listenerStates;
		this.listener = listener;
	}

	static updateState(state: State) {
		switch (state) {
			case State.DOWN:
			case State.PRESSED:
				return State.DOWN;
			case State.UP:
			case State.RELEASED:
				return State.UP;
		}
	}

	press() {
		if (this.state === State.UP)
			this.state = State.PRESSED;
	}

	release() {
		if (this.state === State.DOWN)
			this.state = State.RELEASED;
	}

	keyDown(key: string) {}

	keyUp(key: string) {}

	mouseDown(button: MouseButton) {}

	mouseUp(button: MouseButton) {}

	mouseWheel(down: boolean) { }

	tick() {
		if (this.listenerStates.includes(this.state))
			this.listener();
		this.state = KeyBinding.updateState(this.state);
	}
}

class KeyBinding extends Binding {
	private readonly key: string;

	constructor(key: string, listenerStates: State[], listener: () => void) {
		super(listenerStates, listener);
		this.key = key;
	}

	keyDown(key: string) {
		if (this.key === key)
			this.press();
	}

	keyUp(key: string) {
		if (this.key === key)
			this.release();
	}
}

enum MouseButton {
	LEFT, MIDDLE, RIGHT, BACK, FORWARD
}

class MouseBinding extends Binding {
	static readonly MouseButton = MouseButton;
	private readonly button: MouseButton;

	constructor(button: MouseButton, listenerStates: State[], listener: () => void) {
		super(listenerStates, listener);
		this.button = button;
	}

	mouseDown(button: MouseButton) {
		if (this.button === button)
			this.press();
	}

	mouseUp(button: MouseButton) {
		if (this.button === button)
			this.release();
	}
}

class MouseWheelBinding extends Binding {
	private readonly down: boolean;

	constructor(down: boolean, listenerStates: State[], listener: () => void) {
		super(listenerStates, listener);
		this.down = down;
	}

	mouseWheel(down: boolean) {
		if (this.down === down)
			this.press();
	}

	tick() {
		super.tick();
		this.release();
	}
}

class Input {
	static readonly State = State;

	private bindings: Binding[] = [];
	mouseDownPosition = new Vector2();
	mousePosition = new Vector2();

	constructor(mouseTarget: HTMLCanvasElement) {
		window.addEventListener('blur', () =>
			Object.values(this.bindings).forEach(binding => binding.release()));

		document.addEventListener('keydown', e => {
			if (!e.repeat)
				Object.values(this.bindings).forEach(binding => binding.keyDown(e.key));
		});
		document.addEventListener('keyup', e => {
			if (!e.repeat)
				Object.values(this.bindings).forEach(binding => binding.keyUp(e.key));
		});

		mouseTarget.addEventListener('mousedown', e => {
			Object.values(this.bindings).forEach(binding => binding.mouseDown(e.button));
			this.mouseDownPosition = this.mousePosition;
		});
		window.addEventListener('mouseup', e =>
			Object.values(this.bindings).forEach(binding => binding.mouseUp(e.button)));
		mouseTarget.addEventListener('mousemove', e =>
			this.mousePosition = new Vector2((e.x - mouseTarget.offsetLeft), e.y - mouseTarget.offsetTop));
		mouseTarget.addEventListener('wheel', e => {
			if (e.deltaY < 0)
				Object.values(this.bindings).forEach(binding => binding.mouseWheel(false));
			else
				Object.values(this.bindings).forEach(binding => binding.mouseWheel(true));
		});

		document.addEventListener('contextmenu', e => e.preventDefault());
	}

	addBinding(binding: Binding) {
		this.bindings.push(binding);
	}

	tick() {
		Object.values(this.bindings).forEach(binding => binding.tick());
	}
}

export {Input, KeyBinding, MouseBinding, MouseWheelBinding};
