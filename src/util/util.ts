namespace util {
	export let arr = (n: number) => [...Array(n)].map((_, i) => i);
	export let shuffle = <T>(array: T[]): T[] => {
		array = [...array];
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
	export let unique = <T extends any>(value: T, index: number, array: T[]): boolean => array.indexOf(value) === index;

	export let clamp = (v: number, min: number, max: number) =>
		Math.min(Math.max(v, min), max);

	export let rand = (n: number) => Math.random() * n;
	export let randInt = (minInclusive: number, maxExclusive: number) => Math.floor(rand(maxExclusive - minInclusive)) + minInclusive;
	export let randPick = <T>(valueWeightPairs: [T, number][]) => {
		let sum = valueWeightPairs.reduce((sum: number, pair: [T, number]) => sum + pair[1], 0);
		let r = rand(sum);
		let pick = valueWeightPairs.find(pair => {
			r -= pair[1];
			return r < 0;
		})!;
		return pick[0];
	};

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

	// 'iron wall' => 'Iron Wall'
	export let lowerCaseToTitleCase = (str: string): string => str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
	// 'flux-sand' -> 'FLUX_SAND'
	export let dashCaseToSnakeCase = (str: string): string => str.split('-').join('_').toUpperCase();
	// 'IrON waLl' -> 'ironWall'
	export let titleCaseToCamelCase = (str: string): string => str
		.split(' ')
		.map((s, i) => i ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s.toLowerCase())
		.join('');
	export let snakeCaseToTitleCase = (str: string): string => lowerCaseToTitleCase(str.split('_').join(' '));
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

	export let debug = new URLSearchParams(window.location.search).has('debug');
}

export default util;
