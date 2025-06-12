enum State {
	DOWN, UP, PRESSED, RELEASED
}

class KeyBinding {
	private readonly key: string;
	private readonly pressOnly: boolean;
	private state: State = State.UP;
	private listener = () => { };

	constructor(key: string, pressOnly: boolean) {
		this.key = key;
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

	setListener(listener: () => void) {
		this.listener = listener;
	}

	keydown(key: string) {
		if (this.key === key)
			this.state = State.PRESSED;
	}

	keyup(key: string) {
		if (this.key === key)
			this.state = State.RELEASED;
	}

	tick() {
		if (this.state === State.PRESSED || (this.state === State.DOWN && !this.pressOnly))
			this.listener();
		this.state = KeyBinding.updateState(this.state);
	}
}

class Input {
	bindings = {
		cameraLeft: new KeyBinding('a', false),
		cameraRight: new KeyBinding('d', false),
		cameraUp: new KeyBinding('w', false),
		cameraDown: new KeyBinding('s', false),
		cameraZoomOut: new KeyBinding('q', false),
		cameraZoomIn: new KeyBinding('e', false),
	};

	constructor() {
		document.addEventListener('keydown', e => {
			if (!e.repeat)
				Object.values(this.bindings).forEach(binding => binding.keydown(e.key));
		});

		document.addEventListener('keyup', e => {
			if (!e.repeat)
				Object.values(this.bindings).forEach(binding => binding.keyup(e.key));
		});
	}

	tick() {
		Object.values(this.bindings).forEach(binding => binding.tick());
	}
}

export default Input;
