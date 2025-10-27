import {FillInput} from 'pixi.js';
import Color from '../graphics/Color.js';

export default class TextLine {
	readonly string: String;
	readonly callback: () => void;
	readonly size: number;
	readonly color: FillInput;

	constructor(string: String, callback: () => void = () => 0, size: number = 14, color: FillInput = Color.DEFAULT_TEXT) {
		this.string = string;
		this.callback = callback;
		this.size = size;
		this.color = color;
	}
}
