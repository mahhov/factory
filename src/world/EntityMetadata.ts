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

let parseNumber = (str: string): number => str === '-' ? 0 : Number(str);

let parseResourceCount = (str: string): ResourceUtils.Count => {
	console.assert(/^\d+ [\w\-]+$/.test(str));
	let [count, resource] = str.split(' ') as [string, string];
	let resourceStr = dashCaseToSnakeCase(resource);
	console.assert(resourceStr in Resource);
	return new ResourceUtils.Count(Resource[resourceStr as keyof typeof Resource], Number(count));
};

let parseMaterialCounts = (str: string): ResourceUtils.Count[] =>
	str === '-' ? [] : str.split(', ').map(parseResourceCount);

let parseBuildingOutput = (str: string): ResourceUtils.Count | [string, number][] => {
	if (str === '-') return [];
	if (/^\d*\.?\d+ t\d+(, \d*\.?\d+ t\d+)* material \/ area$/.test(str)) {
		return [...str
			.matchAll(/(\d*\.?\d+) t(\d+)/g)
			.map(m => [m[2], Number(m[1])] as [string, number])];
	}
	if (/^\d+ liquid$/.test(str))
		return [['liquid', Number(str.split(' ')[0])]];
	return parseResourceCount(str);
};

let parseSection = <F extends Record<string, FieldHandler<any>>>(mdString: string, fields: F): ParsedResult<F>[] => {
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
	return datas.map(data => Object.fromEntries(Object.entries(fields).map(([key, handler]) => [key, handler(data)]))) as ParsedResult<F>[];
};

let sectionFields: Record<string, Record<string, FieldHandler<any>>> = {
	buildings: {
		name: (data: StringRecord) => lowerCaseToTitleCase(data.name),
		buildCost: (data: StringRecord) => parseMaterialCounts(data['cost to build']),
		materialInput: (data: StringRecord) => parseMaterialCounts(data['material / second']),
		powerInput: (data: StringRecord) => parseNumber(data['power / second']),
		heatOutput: (data: StringRecord) => parseNumber(data['heat / second']),
		materialOutput: (data: StringRecord) => parseBuildingOutput(data['output / second']),
		boost: (data: StringRecord) => !!data.boost,
		size: (data: StringRecord) => parseNumber(data.size),
		health: (data: StringRecord) => parseNumber(data.health),
	},
};

let parsed: Record<string, ParsedResult<any>[]> = {};
let metadataMarkdown = await (await fetch('../../resources/metadata.md')).text();
let parts = metadataMarkdown.split(/^#\s*(\w+)/gm);
for (let i = 1; i < parts.length; i += 2) {
	let header = parts[i];
	if (header in sectionFields)
		parsed[header] = parseSection(parts[i + 1], sectionFields[header]);
}

export default parsed;
