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

	export let enumKeys = <T extends {}>(enumm: T): T[keyof T][] =>
		Object.values(enumm).filter(value => typeof value === 'number') as T[keyof T][];

	export let replace = <S, V>(values: V[], sources: S[], creator: (i: number, sources: S[]) => void, updater: (value: V, i: number, source: S) => void, remover: () => void) => {
		while (values.length < sources.length)
			creator(values.length, sources);
		while (values.length > sources.length)
			remover();
		sources.forEach((source, i) => updater(values[i], i, source));
	};
}

export default util;
