import {FillInput} from 'pixi.js';
import Color from './Color.js';

class TooltipLine {
	readonly string: String;
	readonly size: number;
	readonly color: FillInput;

	constructor(string: String, size: number = 14, color: FillInput = Color.DEFAULT_TEXT) {
		this.string = string;
		this.size = size;
		this.color = color;
	}
}

export default TooltipLine;
