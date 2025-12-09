import Vector from './Vector.js';

namespace util {
	export let arr = (n: number) => [...Array(n)].map((_, i) => i);
	export let shuffleInPlace = <T>(array: T[]): T[] => {
		for (let i = 0; i < array.length; i++) {
			let r = randInt(i, array.length);
			[array[i], array[r]] = [array[r], array[i]];
		}
		return array;
	};
	export let findMinMap = <T>(array: T[], map: (value: T, index: number, array: T[]) => number) => {
		let minIndex = 0;
		let minValue = Infinity;
		array.forEach((value, i) => {
			let mappedValue = map(value, i, array);
			if (mappedValue < minValue) {
				minIndex = i;
				minValue = mappedValue;
			}
		});
		return array[minIndex];
	};
	export let unique = <T>(value: T, index: number, array: T[]): boolean => array.indexOf(value) === index;

	export let centerIterator = (min: Vector, max: Vector, start: Vector, handler: (x: number, y: number) => boolean) => {
		if (handler(start.x, start.y)) return;
		let left = start.x;
		let right = start.x;
		let up = start.y;
		let down = start.y;
		while (left > min.x || right < max.x || up > min.y || down < max.y) {
			if (left > min.x) {
				left--;
				if (handler(left, start.y)) return;
				let upY = start.y - 1;
				let downY = start.y + 1;
				while (upY >= up && downY <= down) {
					if (handler(left, upY--)) return;
					if (handler(left, downY++)) return;
				}
				while (upY >= up)
					if (handler(left, upY--)) return;
				while (downY <= down)
					if (handler(left, downY++)) return;
			}
			if (right < max.x) {
				right++;
				if (handler(right, start.y)) return;
				let upY = start.y - 1;
				let downY = start.y + 1;
				while (upY >= up && downY <= down) {
					if (handler(right, upY--)) return;
					if (handler(right, downY++)) return;
				}
				while (upY >= up)
					if (handler(right, upY--)) return;
				while (downY <= down)
					if (handler(right, downY++)) return;
			}
			if (up > min.y) {
				up--;
				if (handler(start.x, up)) return;
				let leftX = start.x - 1;
				let rightX = start.x + 1;
				while (leftX >= left && rightX <= right) {
					if (handler(leftX--, up)) return;
					if (handler(rightX++, up)) return;
				}
				while (leftX >= left)
					if (handler(leftX--, up)) return;
				while (rightX <= right)
					if (handler(rightX++, up)) return;
			}
			if (down < max.y) {
				down++;
				if (handler(start.x, down)) return;
				let leftX = start.x - 1;
				let rightX = start.x + 1;
				while (leftX >= left && rightX <= right) {
					if (handler(leftX--, down)) return;
					if (handler(rightX++, down)) return;
				}
				while (leftX >= left)
					if (handler(leftX--, down)) return;
				while (rightX <= right)
					if (handler(rightX++, down)) return;
			}
		}
	};

	export let clamp = (v: number, min: number, max: number) =>
		Math.min(Math.max(v, min), max);

	export let rand = (min: number, max: number) => Math.random() * (max - min) + min;
	export let randWidth = (width: number) => rand(-width / 2, width / 2);
	export let randInt = (minInclusive: number, maxExclusive: number) => Math.floor(rand(minInclusive, maxExclusive));
	export let randPick = <T>(valueWeightPairs: [T, number][]) => {
		let sum = valueWeightPairs.reduce((sum: number, pair: [T, number]) => sum + pair[1], 0);
		let r = rand(0, sum);
		let pick = valueWeightPairs.find(pair => {
			r -= pair[1];
			return r < 0;
		})!;
		return pick[0];
	};

	// returns a position on the perimeter of the rectangle with corners [0, 0] and [size.x, size.y]
	export let perimeter = (size: Vector, ratio: number) => {
		let distance = ratio * (size.x + size.y) * 2;
		if (distance < size.x)
			return new Vector(distance, 0);
		distance -= size.x;
		if (distance < size.y)
			return new Vector(size.x, distance);
		distance -= size.y;
		if (distance < size.x)
			return new Vector(size.x - distance, size.y);
		distance -= size.x;
		return new Vector(0, size.y - distance);
	};

	let cos90LookupTable = arr(100000).map((_, i, a) => Math.cos(i / a.length * 90 * Math.PI / 180));
	let cos90Lookup = (degrees: number) => {
		return cos90LookupTable[Math.round(degrees / 90 * (cos90LookupTable.length - 1))];
	};
	export let cos = (degrees: number) => {
		degrees = degrees % (360);
		if (degrees < 0) degrees += 360;
		if (degrees > 180) degrees = 360 - degrees;
		return degrees <= 90 ?
			cos90Lookup(degrees) :
			-cos90Lookup(180 - degrees);
	};
	export let sin = (degrees: number) => cos(90 - degrees);
	for (let i = -1000; i < 1000; i++) {
		console.assert(Math.abs(cos(i) - Math.cos(i * Math.PI / 180)) < .0001);
		console.assert(Math.abs(sin(i) - Math.sin(i * Math.PI / 180)) < .0001);
	}

	export let enumKeys = <T extends {}>(enumm: T): (keyof T)[] =>
		Object.values(enumm).filter(value => typeof value !== 'number') as (keyof T)[];
	export let enumValues = <T extends {}>(enumm: T): T[keyof T][] =>
		Object.values(enumm).filter(value => typeof value === 'number') as T[keyof T][];

	export let replace = <S, V>(values: V[], sources: S[], creator: (i: number, sources: S[]) => void, updater: (value: V, i: number, source: S) => void, remover: () => void) => {
		while (values.length < sources.length)
			creator(values.length, sources);
		while (values.length > sources.length)
			remover();
		sources.forEach((source, i) => updater(values[i], i, source));
	};

	export let textPercent = (ratio: number, size: number = 6): string => {
		let chars = '░▒▓█';
		let value = ratio * size;
		let filled = Math.floor(value);
		let empty = size - filled;
		let partialChar = '';
		if (value > filled) {
			partialChar = chars[Math.floor((value % 1) * 3)];
			empty -= 1;
		}
		let filledStr = chars[3].repeat(filled);
		let emptyStr = chars[0].repeat(empty);
		return `${filledStr}${partialChar}${emptyStr}`;
	};

	export let sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

	export let debug = new URLSearchParams(window.location.search).has('debug');
}

export default util;
