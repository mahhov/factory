import {Container, Graphics, Text} from 'pixi.js';
import Color from '../graphics/Color.js';
import Painter from '../graphics/Painter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import TextLine from './TextLine.js';

export enum Anchor {
	TOP_LEFT,
	TOP_RIGHT,
	BOTTOM_LEFT,
	BOTTOM_RIGHT,
}

export default class MultilineText {
	readonly textContainer = new Container();
	private readonly textBackground = new Container();
	position: Vector;
	lines: TextLine[];
	anchor: Anchor;

	constructor(painter: Painter, position: Vector = Vector.V0, lines: TextLine[] = [], anchor = Anchor.TOP_LEFT) {
		this.position = position;
		this.lines = lines;
		this.anchor = anchor;
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
				text.on('pointertap', () => tooltipLines[i].callback());
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
			},
			() => this.textContainer.removeChild(this.textContainer.children.at(-1)!));

		let position = this.position;
		if (this.anchor === Anchor.BOTTOM_LEFT || this.anchor === Anchor.BOTTOM_RIGHT)
			position = position.subtract(new Vector(0, this.textContainer.height / 1000));
		if (this.anchor === Anchor.TOP_RIGHT || this.anchor === Anchor.BOTTOM_RIGHT)
			position = position.subtract(new Vector(this.textContainer.width / 1000, 0));

		this.textContainer.position = position.scale(new Vector(1000));
		let textContainerSize = new Vector(this.textContainer.width / 1000, this.textContainer.height / 1000);

		this.textBackground.addChild(new Graphics()
			.rect(position.x, position.y, textContainerSize.x, textContainerSize.y)
			.fill({color: Color.TEXT_RECT_BACKGROUND}));
	}
}
