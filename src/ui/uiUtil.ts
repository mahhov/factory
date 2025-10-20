import {Container} from 'pixi.js';
import Vector2 from '../util/Vector2.js';

namespace uiUtil {
	export let mouseInContainer = (mousePosition: Vector2, container: Container) => {
		let textLocalMouse = Vector2.fromObj(container.toLocal(mousePosition));
		let containerSize = new Vector2(container.width, container.height);
		return textLocalMouse.boundBy(new Vector2(), containerSize);
	};
}

export default uiUtil;
