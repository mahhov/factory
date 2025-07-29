import {FillInput} from 'pixi.js';

class TooltipLine {
	readonly string: String;
	readonly size: number;
	readonly color: FillInput;

	constructor(string: String, size: number, color: FillInput) {
		this.string = string;
		this.size = size;
		this.color = color;
	}
}

export default TooltipLine;
