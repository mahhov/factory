let arr = (n: number) => [...Array(n)];

let clamp = (v: number, min: number, max: number) =>
	Math.min(Math.max(v, min), max);

let rand = (n: number) => Math.random() * n;

let randInt = (min: number, max: number) => Math.floor(rand(max - min + 1)) + min;

let randPick = <T>(valueWeightPairs: [T, number][]) => {
	let sum = valueWeightPairs.reduce((sum: number, pair: [T, number]) => sum + pair[1], 0);
	let r = rand(sum);
	let pick = valueWeightPairs.find(pair => {
		r -= pair[1];
		return r < 0;
	})!;
	return pick[0];
};

let shuffle = <T>(array: T[]): T[] => {
	array = [...array];
	for (let i = 0; i < array.length; i++) {
		let r = randInt(i, array.length - 1);
		[array[i], array[r]] = [array[r], array[i]];
	}
	return array;
};

let enumKeys = (enumm: object): number[] =>
	Object.values(enumm).filter(value => typeof value === 'number');

export default {arr, clamp, rand, randPick, shuffle, enumKeys};
