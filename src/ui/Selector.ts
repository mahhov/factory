import {Container} from 'pixi.js';
import Vector from '../util/Vector.js';

enum State {
	NONE, HOVER, SELECTED
}

export default class Selector {
	private entityClassRect = new Container();

	private canvasPosition = new Vector();
	private worldPosition = new Vector();
	private selected = false;
}
