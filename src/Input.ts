import Vector from './Vector.js';

enum State {
	DOWN, UP, PRESSED, RELEASED
}

abstract class Binding {
	private readonly listenerStates: State[] = [];
	private state: State = State.UP;
	private listener = () => { };

	constructor(listenerStates: State[]) {
		this.listenerStates = listenerStates;
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
		if (this.listenerStates.includes(this.state))
			this.listener();
		this.state = KeyBinding.updateState(this.state);
	}
}

class KeyBinding extends Binding {
	private readonly key: string;

	constructor(listenerStates: State[], key: string) {
		super(listenerStates);
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
	private readonly button: MouseButton;

	constructor(listenerStates: State[], button: MouseButton) {
		super(listenerStates);
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

class Input {
	static State = State;

	keyBindings = {
		cameraLeft: new KeyBinding([State.DOWN, State.PRESSED], 'a'),
		cameraRight: new KeyBinding([State.DOWN, State.PRESSED], 'd'),
		cameraUp: new KeyBinding([State.DOWN, State.PRESSED], 'w'),
		cameraDown: new KeyBinding([State.DOWN, State.PRESSED], 's'),
		cameraZoomOut: new KeyBinding([State.DOWN, State.PRESSED], 'q'),
		cameraZoomIn: new KeyBinding([State.DOWN, State.PRESSED], 'e'),
	};
	mouseBindings = {
		placeBuildingStart: new MouseBinding([State.PRESSED], MouseButton.LEFT),
		placeBuilding: new MouseBinding([State.RELEASED], MouseButton.LEFT),
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

		mouseTarget.addEventListener('mousedown', e => {
			Object.values(this.mouseBindings).forEach(binding => binding.mouseDown(e.button));
			this.mouseDownPosition = this.mousePosition.copy;
		});
		window.addEventListener('mouseup', e =>
			Object.values(this.mouseBindings).forEach(binding => binding.mouseUp(e.button)));
		mouseTarget.addEventListener('mousemove', e =>
			this.mousePosition.set((e.x - mouseTarget.offsetLeft), e.y - mouseTarget.offsetTop));
	}

	tick() {
		Object.values(this.keyBindings).forEach(binding => binding.tick());
		Object.values(this.mouseBindings).forEach(binding => binding.tick());
	}
}

export default Input;
