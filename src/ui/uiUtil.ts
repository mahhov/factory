import {Container} from 'pixi.js';
import Vector from '../util/Vector.js';

namespace uiUtil {
	export let mouseInContainer = (mousePosition: Vector, container: Container) => {
		let textLocalMouse = Vector.fromObj(container.toLocal(mousePosition));
		let containerSize = new Vector(container.width, container.height);
		return textLocalMouse.atLeast(new Vector()) && textLocalMouse.lessThan(containerSize);
	};
}

export default uiUtil;
