import {toSnakeCase, toTitleCase} from '../util/stringCase.js';
import util from '../util/util.js';
import {Liquid, Material, Resource, ResourceUtils} from './Resource.js';

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

let parseNumber = (str: string): number => str === '-' ? 0 : Number(str);

let parseResourceCount = <T extends Resource>(str: string, resourceEnum: Record<string, string | T>): ResourceUtils.Count<T> => {
	console.assert(/^\d+ [\w\-]+$/.test(str));
	let [count, resourceDash] = str.split(' ');
	let resourceStr = toSnakeCase(resourceDash);
	console.assert(resourceStr in resourceEnum);
	return new ResourceUtils.Count(resourceEnum[resourceStr] as T, Number(count));
};

let parseResourceCounts = <T extends Resource>(str: string, resourceEnum: Record<string, string | T>): ResourceUtils.Count<T>[] =>
	str === '-' ? [] : str.split(', ').map(str => parseResourceCount(str, resourceEnum));

let parseBuildingOutput = (str: string): ResourceUtils.Count<Material> | number[] | number => {
	if (str === '-') return [];
	if (/^\d*\.?\d+ t\d+(, \d*\.?\d+ t\d+)* resource \/ area$/.test(str)) {
		return [...str
			.matchAll(/(\d*\.?\d+) t(\d+)/g)
			.map((m, i) => {
				console.assert(Number(m[2]) === i + 1);
				return Number(m[1]);
			})];
	}
	if (/^\d+ (rate|power|range|capacity|coolant|liquid)$/.test(str))
		return Number(str.split(' ')[0]);
	return parseResourceCount(str, Material);
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
		name: (data: StringRecord) => toTitleCase(data.name),
		buildTime: (data: StringRecord) => parseNumber(data['build time']),
		buildCost: (data: StringRecord) => parseResourceCounts(data['build cost'], Material),
		materialInput: (data: StringRecord) => parseResourceCounts(data['material / second'], Material),
		powerInput: (data: StringRecord) => parseNumber(data['power / second']),
		heatOutput: (data: StringRecord) => parseNumber(data['heat / second']),
		liquidInput: (data: StringRecord) => parseResourceCounts(data['liquid / second'], Liquid),
		output: (data: StringRecord) => parseBuildingOutput(data['output / second']),
		boost: (data: StringRecord) => !!data.boost,
		size: (data: StringRecord) => parseNumber(data.size),
		health: (data: StringRecord) => parseNumber(data.health),
		description: (data: StringRecord) => data.description,
	},
	turrets: {
		name: (data: StringRecord) => toTitleCase(data.name),
		buildTime: (data: StringRecord) => parseNumber(data['build time']),
		buildCost: (data: StringRecord) => parseResourceCounts(data['build cost'], Material),
		attackRate: (data: StringRecord) => parseNumber(data['attacks / second']),
		damage: (data: StringRecord) => parseNumber(data['damage / attack']),
		materialInput: (data: StringRecord) => parseNumber(data['materials / attack']),
		size: (data: StringRecord) => parseNumber(data.size),
		health: (data: StringRecord) => parseNumber(data.health),
		accuracy: (data: StringRecord) => parseNumber(data['accuracy - spray cone in degrees']),
		range: (data: StringRecord) => parseNumber(data.range),
		projectileSpeed: (data: StringRecord) => parseNumber(data['projectile speed']),
		description: (data: StringRecord) => data.description,
	},
	mobs: {
		name: (data: StringRecord) => toTitleCase(data.name),
		size: (data: StringRecord) => parseNumber(data.size),
		health: (data: StringRecord) => parseNumber(data.health),
		movementSpeed: (data: StringRecord) => parseNumber(data['movement speed']),
		attackType: (data: StringRecord) => data['attack type'],
		attackTarget: (data: StringRecord) => data['attack target'],
		attackAffect: (data: StringRecord) => data['attack affect'],
		collisionWidth: (data: StringRecord) => parseNumber(data['collision, width']),
		damageSize: (data: StringRecord) => parseNumber(data['damage size']),
		count: (data: StringRecord) => parseNumber(data.count),
		projectileSpeed: (data: StringRecord) => parseNumber(data['projectile speed']),
		range: (data: StringRecord) => parseNumber(data.range),
		damage: (data: StringRecord) => parseNumber(data.damage),
		attackLatency: (data: StringRecord) => parseNumber(data['attack latency']),
		damageDuration: (data: StringRecord) => parseNumber(data['damage duration']),
		description: (data: StringRecord) => data.description,
	},
};

let mdString = await (await fetch('./resources/metadata.md')).text();
let parsed = parseSection2(mdString, sectionFields);

export let findEntityMetadata = <T extends keyof typeof sectionFields>(type: T, name: string): ParsedLine<typeof sectionFields[T]> =>
	parsed[type].find(entry => entry.name === name)!;
