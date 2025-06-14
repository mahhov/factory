import Vector from './Vector.js';

enum State {
	DOWN, UP, PRESSED, RELEASED
}

abstract class Binding {
	private readonly pressOnly: boolean;
	private state: State = State.UP;
	private listener = () => { };

	constructor(pressOnly: boolean) {
		this.pressOnly = pressOnly;
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

	setListener(listener: () => void) {
		this.listener = listener;
	}

	tick() {
		if (this.state === State.PRESSED || (this.state === State.DOWN && !this.pressOnly))
			this.listener();
		this.state = KeyBinding.updateState(this.state);
	}
}

class KeyBinding extends Binding {
	private readonly key: string;

	constructor(pressOnly: boolean, key: string) {
		super(pressOnly);
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

class MouseBinding extends Binding {
	private readonly button: number;

	constructor(pressOnly: boolean, button: number) {
		super(pressOnly);
		this.button = button;
	}

	mouseDown(button: number) {
		if (this.button === button)
			this.press();
	}

	mouseUp(button: number) {
		if (this.button === button)
			this.release();
	}
}

class Input {
	keyBindings = {
		cameraLeft: new KeyBinding(false, 'a'),
		cameraRight: new KeyBinding(false, 'd'),
		cameraUp: new KeyBinding(false, 'w'),
		cameraDown: new KeyBinding(false, 's'),
		cameraZoomOut: new KeyBinding(false, 'q'),
		cameraZoomIn: new KeyBinding(false, 'e'),
	};
	mouseBindings = {
		left: new MouseBinding(false, 0),
		middle: new MouseBinding(false, 1),
		right: new MouseBinding(false, 2),
		back: new MouseBinding(false, 4),
		forward: new MouseBinding(false, 5),
	};
	mouseDownPosition = new Vector();
	mousePosition = new Vector();

	constructor(mouseTarget: HTMLCanvasElement) {
		window.addEventListener('blur', () => {
			[Object.values(this.keyBindings), Object.values(this.mouseBindings)]
				.flat()
				.forEach(binding => binding.release());
		});

		document.addEventListener('keydown', e => {
			if (!e.repeat)
				Object.values(this.keyBindings).forEach(binding => binding.keyDown(e.key));
		});
		document.addEventListener('keyup', e => {
			if (!e.repeat)
				Object.values(this.keyBindings).forEach(binding => binding.keyUp(e.key));
		});
		
		document.addEventListener('mousedown', e => {
			Object.values(this.mouseBindings).forEach(binding => binding.mouseDown(e.button));
			this.mouseDownPosition = this.mousePosition.copy;
		});
		document.addEventListener('mouseup', e =>
			Object.values(this.mouseBindings).forEach(binding => binding.mouseUp(e.button)));
		document.addEventListener('mousemove', e =>
			this.mousePosition.set((e.x - mouseTarget.offsetLeft), e.y - mouseTarget.offsetTop));
	}

	tick() {
		Object.values(this.keyBindings).forEach(binding => binding.tick());
		Object.values(this.mouseBindings).forEach(binding => binding.tick());
	}
}

export default Input;
