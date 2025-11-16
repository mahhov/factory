import Painter from '../graphics/Painter.js';
import Counter from '../util/Counter.js';
import util from '../util/util.js';
import Vector from '../util/Vector.js';
import {Mob} from './Entity.js';
import {EntityMobChaseTargetAttribute} from './EntityAttribute.js';
import {World} from './World.js';

let scoreMapping: Record<string, number> = {
	Empty: 0,
	Wall: -2,
	Conveyor: .1,
	Distributor: .1,
	Junction: .1,
	Bridge: .1,
	Extractor: 1,
	GlassFactory: 2,
	MegaFactory: 3,
};

export default class MobLogic {
	private targetingCounter = new Counter(10);
	private herdManager = new HerdManager();
	private mobs: Mob[] = [];
	private first = true;

	constructor(painter: Painter) {
		this.targetingCounter.reset(true);
	}

	tick(world: World) {
		if (this.first)
			for (let i = 0; i < 100; i++) {
				let position = new Vector(util.randInt(0, world.width), util.randInt(0, world.height));
				let mob = new Mob();
				this.mobs.push(mob);
				world.free.addTileable(position, mob);
				this.herdManager.addEnemy({id: i, position});
			}
		this.first = false;
		this.target(world);
	}


	private target(world: World) {
		if (!this.targetingCounter.tick()) return;

		this.herdManager.update();
		this.mobs.forEach((mob, i) => {
			let mobChaseTargetAttribute = mob.getAttribute(EntityMobChaseTargetAttribute)!;
			mobChaseTargetAttribute.target = this.herdManager.enemies[i].position;
		});
	}
}

interface Enemy {
	position: Vector;
	id: number;
	// Add other properties like size, maxSpeed, etc.
}

// SIMULATION CONSTANTS
const CONFIG = {
	// Spatial Partitioning Grid
	GRID_CELL_SIZE: 500,  // Size of one grid cell in world units

	// Boids Parameters
	MAX_SPEED: 2.5,
	NEIGHBOR_COUNT: 5,   // K: Number of closest neighbors for Cohesion
	COHESION_RADIUS: 500, // Search distance for Cohesion
	SEPARATION_RADIUS: 1, // Critical distance for Separation (Avoidance)

	// Rule Weights
	WEIGHT_COHESION: 0.8,
	WEIGHT_SEPARATION: 2.5, // Separation must be strong!
	WEIGHT_ALIGNMENT: 0.0, // Simplified: Alignment disabled for low computation
};

type Grid = Map<string, Enemy[]>;

class HerdManager {
	enemies: Enemy[] = [];
	private grid: Grid = new Map();

	/**
	 * Finds all enemies in the current cell and adjacent cells.
	 */
	private getNearbyEnemies(self: Enemy): Enemy[] {
		const neighbors: Enemy[] = [];
		const {x, y} = self.position;
		const cellSize = CONFIG.GRID_CELL_SIZE;

		// Calculate the grid cell coordinates (center cell)
		const cx = Math.floor(x / cellSize);
		const cy = Math.floor(y / cellSize);

		// Check the 9 cells (center + 8 neighbors)
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const key = `${cx + dx},${cy + dy}`;
				const cell = this.grid.get(key);

				if (cell) {
					neighbors.push(...cell.filter(e => e.id !== self.id));
				}
			}
		}
		return neighbors;
	}

	private updateGrid() {
		this.grid.clear();
		const cellSize = CONFIG.GRID_CELL_SIZE;

		for (const enemy of this.enemies) {
			const cx = Math.floor(enemy.position.x / cellSize);
			const cy = Math.floor(enemy.position.y / cellSize);
			const key = `${cx},${cy}`;

			if (!this.grid.has(key)) {
				this.grid.set(key, []);
			}
			this.grid.get(key)!.push(enemy);
		}
	}

	public update() {
		// 1. Rebuild the Grid (Must be done first)
		this.updateGrid();

		// 2. Calculate New Velocities for all enemies
		const newVelocities: Map<number, Vector> = new Map();

		for (const enemy of this.enemies) {
			const nearby = this.getNearbyEnemies(enemy);

			// Limit search by radius for performance
			const inRange = nearby.filter(n =>
				n.position.subtract(enemy.position).magnitude < CONFIG.COHESION_RADIUS,
			);

			const vCohesion = this.calculateCohesion(enemy, inRange);
			const vSeparation = this.calculateSeparation(enemy, inRange);

			let totalVector = Vector.V0;
			totalVector = totalVector.add(vCohesion.scale(CONFIG.WEIGHT_COHESION));
			totalVector = totalVector.add(vSeparation.scale(CONFIG.WEIGHT_SEPARATION));

			// Limit speed and store the new velocity
			const newVelocity = totalVector.setMagnitude(1).scale(CONFIG.MAX_SPEED);
			newVelocities.set(enemy.id, newVelocity);
		}

		// 3. Apply New Velocities (Euler integration)
		for (const enemy of this.enemies) {
			const newV = newVelocities.get(enemy.id)!;
			enemy.position = enemy.position.add(newV);
		}
	}

	// --- Boids Rules Implementation ---

	private calculateCohesion(self: Enemy, neighbors: Enemy[]): Vector {
		if (neighbors.length === 0) return Vector.V0;

		// Sort by distance and take only the closest K
		const closest = neighbors
			.sort((a, b) =>
				a.position.subtract(self.position).magnitude2 - b.position.subtract(self.position).magnitude2,
			)
			.slice(0, CONFIG.NEIGHBOR_COUNT);

		if (closest.length === 0) return Vector.V0;

		// Calculate the center of mass (CoM)
		let centerOfMass = closest.reduce(
			(sum, n) => sum.add(n.position),
			Vector.V0,
		);
		centerOfMass = centerOfMass.scale(1 / closest.length);

		// Vector towards CoM
		return centerOfMass.subtract(self.position).setMagnitude(1);
	}

	private calculateSeparation(self: Enemy, neighbors: Enemy[]): Vector {
		let separationVector = Vector.V0;

		for (const neighbor of neighbors) {
			const difference = self.position.subtract(neighbor.position);
			const distance = difference.magnitude;

			if (distance > 0 && distance < CONFIG.SEPARATION_RADIUS) {
				// Repel strongly when close: weight by inverse distance squared
				const magnitude = CONFIG.SEPARATION_RADIUS / (distance * distance);
				separationVector = separationVector.add(difference.setMagnitude(1).scale(magnitude));
			}
		}
		return separationVector;
	}

	// Public method to add enemies to the simulation
	public addEnemy(enemy: Enemy) {
		this.enemies.push(enemy);
	}
}
