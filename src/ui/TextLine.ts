import {FillInput} from 'pixi.js';
import uiColors from '../graphics/uiColors.js';

interface Options {
	callback?: () => void;
	size?: number;
	color?: FillInput;
}

export default class TextLine {
	readonly string: String;
	readonly callback: () => void;
	readonly size: number;
	readonly color: FillInput;

	constructor(string: string, options?: Options) {
		this.string = string;
		this.callback = options?.callback || (() => {});
		this.size = options?.size || 14;
		this.color = options?.color || uiColors.DEFAULT_TEXT;
	}
}
