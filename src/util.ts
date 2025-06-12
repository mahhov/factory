let arr = (n: number) => [...Array(n)];

let clamp = (v: number, min: number, max: number) =>
	Math.min(Math.max(v, min), max);

let rand = (n: number) => Math.random() * n;

let randPick = <T>(valueWeightPairs: [T, number][]) => {
	let sum = valueWeightPairs.reduce((sum: number, pair: [T, number]) => sum + pair[1], 0);
	let r = rand(sum);
	let pick = valueWeightPairs.find(pair => {
		r -= pair[1];
		return r < 0;
	})!;
	return pick[0];
};

export default {
	arr, clamp,
	rand, randPick,
};
