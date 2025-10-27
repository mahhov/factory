import {Container, Graphics, Text} from 'pixi.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import TextLine from './TextLine.js';

export default class MultilineText {
	readonly textContainer = new Container();
	readonly textBackground = new Container();
	position: Vector;
	lines: TextLine[];

	constructor(painter: Painter, position: Vector, lines: TextLine[]) {
		this.position = position;
		this.lines = lines;
		painter.textUiContainer.addChild(this.textContainer);
		painter.uiContainer.addChild(this.textBackground);
	}

	tick() {
		this.textBackground.removeChildren();
		if (!this.lines) {
			this.textContainer.removeChildren();
			return;
		}

		let y = 0;
		util.replace<TextLine, Text>(this.textContainer.children as Text[], this.lines,
			(i: number, tooltipLines: TextLine[]) => {
				let text = new Text({eventMode: 'static'});
				this.textContainer.addChild(text);
			},
			(text: Text, i: number, tooltipLine: TextLine) => {
				text.text = tooltipLine.string;
				text.style = {
					fontFamily: 'Arial',
					fontSize: tooltipLine.size,
					fill: tooltipLine.color,
				};
				text.y = y;
				y += text.height;
				text.onpointertap = tooltipLine.callback;
			},
			() => this.textContainer.removeChild(this.textContainer.children.at(-1)!));

		this.textContainer.position = this.position.scale(new Vector(1000));
		let textContainerSize = new Vector(this.textContainer.width / 1000, this.textContainer.height / 1000);

		this.textBackground.addChild(new Graphics()
			.rect(this.position.x, this.position.y, textContainerSize.x, textContainerSize.y)
			.fill({color: Color.TEXT_RECT_BACKGROUND}));
	}
}
