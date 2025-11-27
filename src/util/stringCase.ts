let words = (str: string) => str.split(/[-_ ]|(?<=[a-z])(?=[A-Z])/);

export let toCamelCase = (str: string): string =>
	words(str)
		.map((s, i) => i ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s.toLowerCase())
		.join('');

export let toTitleCase = (str: string): string =>
	words(str)
		.map(s => s[0].toUpperCase() + s.slice(1).toLowerCase())
		.join(' ');

export let toSnakeCase = (str: string): string =>
	words(str)
		.join('_')
		.toUpperCase();

console.assert(toCamelCase('helloWorldMy_NAME_IS-W-o-L-f and i am the Really Big Bad_Wolf') === 'helloWorldMyNameIsWOLFAndIAmTheReallyBigBadWolf');
console.assert(toTitleCase('helloWorldMy_NAME_IS-W-o-L-f and i am the Really Big Bad_Wolf') === 'Hello World My Name Is W O L F And I Am The Really Big Bad Wolf');
console.assert(toSnakeCase('helloWorldMy_NAME_IS-W-o-L-f and i am the Really Big Bad_Wolf') === 'HELLO_WORLD_MY_NAME_IS_W_O_L_F_AND_I_AM_THE_REALLY_BIG_BAD_WOLF');
