import {Resource, ResourceUtils} from './Resource.js';

type StringRecord = Record<string, string>;
type FieldHandler<R> = (data: StringRecord) => R;
type ParsedResult<T extends Record<string, FieldHandler<any>>> = {
	[K in keyof T]: T[K] extends FieldHandler<infer R> ? R : never;
};

// 'iron wall' => 'Iron Wall'
let lowerCaseToTitleCase = (str: string): string => str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// 'flux-sand' -> 'FLUX_SAND'
let dashCaseToSnakeCase = (str: string): string => str.split('-').join('_').toUpperCase();

let parseResourceCounts = (str: string): ResourceUtils.Count[] =>
	str.split(', ').map(s => {
		console.assert(/^\d+ [\w\-]+$/.test(s));
		let [count, resource] = s.split(' ') as [string, string];
		let resourceStr = dashCaseToSnakeCase(resource);
		console.assert(resourceStr in Resource);
		return new ResourceUtils.Count(Resource[resourceStr as keyof typeof Resource], Number(count));
	});

let parseNumber = (str: string): number => str === '-' ? 0 : Number(str);

let parse = <F extends Record<string, FieldHandler<any>>>(mdString: string, fields: F): ParsedResult<F>[] => {
	let [headers, ...lines]: string[][] = mdString
		.trim()
		.split('\n')
		.filter(line => line.match(/\w/))
		.map(line => line
			.trim()
			.split('|')
			.filter(v => v)
			.map(v => v.trim()));

	let datas: StringRecord[] = lines.map(line => Object.fromEntries(line.map((cell, i) => [headers[i], cell])));
	return datas.map(data =>
		Object.fromEntries(
			Object.entries(fields).map(([key, handler]) => [key, handler(data)]),
		),
	) as ParsedResult<F>[]; // Type Assertion to enforce the derived type F
};

// todo:

let x = await fetch('../../resources/metadata.md');
let y = await x.text();
let sections: StringRecord = {};
let parts = y.split(/^#\s*(\w+)/gm);
for (let i = 1; i < parts.length; i += 2)
	sections[parts[i]] = parts[i + 1];

let fields = {
	name: (data: StringRecord) => lowerCaseToTitleCase(data.name),
	buildCost: (data: StringRecord) => parseResourceCounts(data['cost to build']),
	materialInput: (data: StringRecord) => 0,
	powerInput: (data: StringRecord) => parseNumber(data['power / second']),
	heatOutput: (data: StringRecord) => parseNumber(data['heat / second']),
	materialOutput: (data: StringRecord) => 0,
	boost: (data: StringRecord) => 0,
	size: (data: StringRecord) => parseNumber(data.size),
	health: (data: StringRecord) => parseNumber(data.health),
};

let parsed = parse(sections.buildings, fields);
console.log(parsed);
