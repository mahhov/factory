import {textureColors} from './generatedTextures.js';

let uiColors = {
	NAME_TEXT: '#ffff00',
	DESCRIPTION_TEXT: '#cccccc',
	HEALTH_TEXT: '#ff5555',
	POWER_TEXT: textureColors.power,
	COOLANT_TEXT: '#00e1ff',
	LIQUID_TEXT: textureColors.water,
	SELECTED_TEXT: '#567cc1',
	DEFAULT_TEXT: '#ffffff',
	TEXT_RECT_BACKGROUND: '#000000',

	RECT_OUTLINE: '#ffffff',
	SELECTED_RECT_OUTLINE: '#ffff00',

	// todo these dont belong in uiColors
	PROJECTILE_RED: '#ff0000',
	PROJECTILE_BLUE: '#0000ff',
	SMOKE_GRAY: '#aaaaaa',
	DAMAGED_RED: '#ff0000aa',
	DAMAGE_AREA_RED: '#ff000044',
};

export default uiColors;
