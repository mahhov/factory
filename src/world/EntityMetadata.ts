import {Resource, ResourceUtils} from './Resource.js';

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

let mdString = `
| name                     | cost to build                       | material / second                                | power / second | heat / second | output / second                     | boost     | size | health | description                                                                                                            |
|--------------------------|-------------------------------------|--------------------------------------------------|----------------|---------------|-------------------------------------|-----------|------|--------|------------------------------------------------------------------------------------------------------------------------|
| iron wall                | 40 iron                             | -                                                | -              | -             | -                                   | -         | 2    | 400    | blocks damage                                                                                                          |
| steel wall               | 40 steel                            | -                                                | -              | -             | -                                   | -         | 2    | 800    | blocks damage                                                                                                          |
| plasteel bunker          | 80 plasteel                         | -                                                | 50             | -             | -                                   | water 50% | 3    | 1800   | 50% armor buff in 10x10 area                                                                                           |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| extractor                | 15 iron                             | -                                                | -              | -             | .1 t1 material / area               | -         | 2    | 200    | can extracts iron, flux-sand, sulphur                                                                                  |
| reinforced extractor     | 15 steel                            | -                                                | 50             | -             | .15 t1, .1 t2 material / area       | water 50% | 3    | 400    | can extracts iron, flux-sand, sulphur, titanium                                                                        |
| quadratic extractor      | 30 steel, 30 titanium               | -                                                | 300            | 5             | .3 t1, .2 t2, .1 t3 material / area | water 50% | 4    | 800    | can extracts iron, flux-sand, sulphur, titanium, graphite                                                              |
| laser extractor          | 30 steel, 30 plasteel, 30 graphite  | -                                                | 400            | 100           | .6 t1, .4 t2, .2 t3 material / area | water 50% | 4    | 800    | can extracts iron, flux-sand, sulphur, titanium, graphite                                                              |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| thermal generator        | 10 steel                            | 1 sulphur                                        | -              |               | 100 power                           | -         | 2    | 100    | generates a low amount of power using common resources                                                                 |
| solar array              | 10 steel, 1 titanium                  | -                                                | -              | -             | 50 power                            | -         | 2    | 10     | generates a very low amount of power using no resources                                                                |
| methane burner           | 20 steel, 20 graphite               | 1 graphite, 200 methane                          | -              | 50            | 500 power                           | -         | 3    | 200    | generates a medium amount of power using rare resources and requires cooling                                           |
| thermite reactor         | 20 steel, 20 plasteel, 20 graphite | 1 thermite                                       | 1000           | 400           | 5000 power                          | -         | 3    | 100    | generates a high amount of power using very rare resources and requires a lot of cooling. consumes power to start      |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| conductor                | 5 steel                             | -                                                | 5              | -             | -                                   | -         | 1    | 10     | conducts power                                                                                                         |
| battery                  | 10 iron, 10 titanium                | -                                                | 10             | 2             | -                                   | -         | 2    | 20     | stores 5000 power                                                                                                      |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| air vent                 | 5 steel                             | -                                                | -              | -             | 10 cooling unit                     | -         | 1    | 20     | cools adjacent buildings                                                                                               |
| water vent               | 5 steel, 5 titanium                 | 50 water                                         | -              | -             | 20 cooling unit                     | -         | 1    | 20     | cools adjacent buildings                                                                                               |
| methane vent             | 10 steel, 10 graphite               | 200 methane                                      | 50             | -             | 200 cooling unit                    | -         | 2    | 20     | cools adjacent buildings                                                                                               |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| steel smelter            | 15 iron                             | 2 iron, flux-sand                                | -              | -             | steel                               | -         | 2    | 100    | creates composite/alloy material                                                                                       |
| metaglass foundry        | 15 steel                            | 1 steel, 2 flux-sand                               | 50             | 5             | metaglass                           | -         | 2    | 100    | creates composite/alloy material                                                                                       |
| plasteel mixer           | 30 steel, 30 graphite               | 1 titanium, 1 steel, 1 iron, 1 sulphur                   | 100            | 5             | plasteel                            | -         | 3    | 200    | creates composite/alloy material                                                                                       |
| thermite mixer           | 30 steel, 30 plasteel               | 1 graphite, 1 plasteel, 1 sulphur, 3 flux-sand   | 300            | 20            | thermite                            | -         | 3    | 200    | creates composite/alloy material                                                                                       |
| exidium mixer            | 30 steel, 30 plasteel               | 2 graphite, 1 plasteel, 2 metaglass, 1 flux-sand | 300            | 20            | exidium                             | -         | 3    | 200    | creates composite/alloy material                                                                                       |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| conveyor belt            | 5 iron                              | -                                                | -              | -             | -                                   | -         | 1    | 10     | takes items from 3 directions, outputs them in 1 direction                                                             |
| high speed conveyor belt | 5 iron, 5 metaglass                   | -                                                | -              | -             | -                                   | -         | 1    | 20     | 2x faster than conveyor belt                                                                                           |
| packed conveyor belt     | 5 iron, 5 metaglass, 5 plasteel         | -                                                | -              | -             | -                                   | -         | 1    | 20     | 8x faster than conveyor belt. cannot feed directly into buildings or other blocks. can only feed into material storage |
| distributor              | 5 steel                             | -                                                | -              | -             | -                                   | -         | 1    | 10     | outputs materials evenly in all directions                                                                             |
| junction                 | 5 steel                             | -                                                | -              | -             | -                                   | -         | 1    | 10     | crosswalk-like, passes materials in the direction they're going                                                        |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| material storage         | 15 iron, 15 metaglass               | -                                                | -              | -             | -                                   | -         | 2    | 200    | stores up to 500 of each material. cannot store flux sand                                                              |
| dispenser                | 5 steel                             | -                                                | -              | -             | -                                   | -         | 1    | 20     | unloads materials from storage                                                                                         |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
| pump                     | 15 steel                            | -                                                | -              | -             | 300                                 | -         | 2    | 100    | extracts water. must be placed on water tile                                                                           |
| powered pump             | 15 iron, 15 titanium                | -                                                | 50             | -             | 1000                                | -         | 2    | 100    | extracts water, methane. must be placed on water or methane tile                                                       |
| well                     | 30 iron, 30 plasteel                | -                                                | 1000           | -             | 100                                 | -         | 3    | 200    | extracts low amounts of water. can be placed on sand tiles                                                             |
| pipe                     | 5 steel                             | -                                                | -              | -             | -                                   | -         | 1    | 20     | transports either water or methane                                                                                     |
| liquid storage           | 10 iron, 10 titanium                | -                                                | -              | -             | -                                   | -         | 2    | 200    | 500 units of either water or methane                                                                                   |
|                          |                                     |                                                  |                |               |                                     |           |      |        |                                                                                                                        |
`;

let parse = (mdString: string, fields: Record<string, (v: Record<string, string>) => any>): Record<string, any>[] => {
	let [headers, ...lines]: string[][] = mdString
		.trim()
		.split('\n')
		.filter(line => !line.match(/^[|\- ]*$/))
		.map(line => line
			.split('|')
			.filter(v => v)
			.map(v => v.trim()));
	let datas: Record<string, string>[] = lines.map(line => Object.fromEntries(line.map((cell, i) => [headers[i], cell])));
	return datas.map(data => Object.fromEntries(Object.entries(fields).map(([key, handler]) => [key, handler(data)])));
};

let fields = {
	name: (data: Record<string, string>) => lowerCaseToTitleCase(data.name),
	buildCost: (data: Record<string, string>) => parseResourceCounts(data['cost to build']),
	materialInput: (data: Record<string, string>) => 0,
	powerInput: (data: Record<string, string>) => parseNumber(data['power / second']),
	heatOutput: (data: Record<string, string>) => parseNumber(data['heat / second']),
	materialOutput: (data: Record<string, string>) => 0,
	boost: (data: Record<string, string>) => 0,
	size: (data: Record<string, string>) => parseNumber(data.size),
	health: (data: Record<string, string>) => parseNumber(data.health),
};

let parsed = parse(mdString, fields);
parsed[0].name;
console.log(parsed);

