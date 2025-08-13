namespace util {
	export let arr = (n: number) => [...Array(n)].map((_, i) => i);
	export let shuffle = <T>(array: T[]): T[] => {
		array = [...array];
		for (let i = 0; i < array.length; i++) {
			let r = randInt(i, array.length - 1);
			[array[i], array[r]] = [array[r], array[i]];
		}
		return array;
	};

	export let clamp = (v: number, min: number, max: number) =>
		Math.min(Math.max(v, min), max);

	export let rand = (n: number) => Math.random() * n;
	export let randInt = (min: number, max: number) => Math.floor(rand(max - min + 1)) + min;
	export let randPick = <T>(valueWeightPairs: [T, number][]) => {
		let sum = valueWeightPairs.reduce((sum: number, pair: [T, number]) => sum + pair[1], 0);
		let r = rand(sum);
		let pick = valueWeightPairs.find(pair => {
			r -= pair[1];
			return r < 0;
		})!;
		return pick[0];
	};

	export let enumKeys = (enumm: object): number[] =>
		Object.values(enumm).filter(value => typeof value === 'number');

	export let replace = <S, V>(values: V[], sources: S[], creator: (i: number, sources: S[]) => void, updater: (value: V, i: number, source: S) => void, remover: () => void) => {
		while (values.length < sources.length)
			creator(values.length, sources);
		while (values.length > sources.length)
			remover();
		sources.forEach((source, i) => updater(values[i], i, source));
	};
}

export default util;
