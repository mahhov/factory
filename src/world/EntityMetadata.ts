import {Resource, ResourceUtils} from './Resource.js';

type StringRecord = Record<string, string>;
type FieldHandler<R> = (data: StringRecord) => R;
type FieldHandlerDictionary = Record<string, FieldHandler<any>>;
type FieldHandlerDictionary2 = Record<string, FieldHandlerDictionary>;
export type ParsedLine<T extends FieldHandlerDictionary> = {
	[K in keyof T]: T[K] extends FieldHandler<infer R> ? R : never;
};
type ParsedSection<T extends FieldHandlerDictionary> = ParsedLine<T>[];
type ParsedSection2<T extends FieldHandlerDictionary2> = {
	[K in keyof T]: ParsedSection<T[K]>;
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

let parseBuildingOutput = (str: string): ResourceUtils.Count | number[] | number => {
	if (str === '-') return [];
	if (/^\d*\.?\d+ t\d+(, \d*\.?\d+ t\d+)* material \/ area$/.test(str)) {
		return [...str
			.matchAll(/(\d*\.?\d+) t(\d+)/g)
			.map((m, i) => {
				console.assert(Number(m[2]) === i + 1);
				return Number(m[1]);
			})];
	}
	if (/^\d+ (rate|capacity|liquid)$/.test(str))
		return Number(str.split(' ')[0]);
	return parseResourceCount(str);
};

let parseSection = <F extends FieldHandlerDictionary>(mdString: string, fields: F): ParsedSection<F> => {
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
	return datas.map(data => Object.fromEntries(Object.entries(fields).map(([key, handler]) => [key, handler(data)]))) as ParsedSection<F>;
};

let parseSection2 = <F2 extends FieldHandlerDictionary2>(mdString: string, fields2: F2): ParsedSection2<F2> => {
	let parsed: Partial<ParsedSection2<F2>> = {};
	let parts = mdString.split(/^#\s*(\w+)/gm);
	for (let i = 1; i < parts.length; i += 2) {
		let header: keyof typeof fields2 = parts[i];
		if (header in fields2)
			parsed[header] = parseSection(parts[i + 1], fields2[header]);
	}
	return parsed as ParsedSection2<F2>;
};

export let sectionFields = {
	buildings: {
		name: (data: StringRecord) => lowerCaseToTitleCase(data.name),
		buildTime: (data: StringRecord) => parseNumber(data['build time']),
		buildCost: (data: StringRecord) => parseMaterialCounts(data['build cost']),
		materialInput: (data: StringRecord) => parseMaterialCounts(data['material / second']),
		powerInput: (data: StringRecord) => parseNumber(data['power / second']),
		heatOutput: (data: StringRecord) => parseNumber(data['heat / second']),
		materialOutput: (data: StringRecord) => parseBuildingOutput(data['output / second']),
		boost: (data: StringRecord) => !!data.boost,
		size: (data: StringRecord) => parseNumber(data.size),
		health: (data: StringRecord) => parseNumber(data.health),
	},
};

let mdString = await (await fetch('../../resources/metadata.md')).text();
let parsed = parseSection2(mdString, sectionFields);

export let findEntityMetadata = <T extends keyof typeof sectionFields>(type: T, name: string): ParsedLine<typeof sectionFields[T]> =>
	parsed[type].find(entry => entry.name === name)!;
