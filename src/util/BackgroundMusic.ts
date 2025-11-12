import util from './util.js';

export default class BackgroundMusic {
	private readonly paths: string[];
	private shuffledIndexes: number[] = [];
	private currentIndex: number = 0;
	private readonly audio = new Audio();

	constructor(paths: string[]) {
		this.paths = paths;
		this.shufflePlaylist();
		this.audio.src = this.currentPath;
		this.audio.addEventListener('ended', () => this.playNextTrack());
		document.addEventListener('click', () => this.audio.play(), {once: true});
		document.addEventListener('visibilitychange', () => {
			if (document.hidden)
				this.audio.pause();
			else
				this.audio.play();
		});
	}

	static load() {
		let basePath = '../resources/music/';
		let files = [
			'80s-pop-110346.mp3',
			'Crazy - Patrick Patrikios.mp3',
			'Demon - JVNA.mp3',
			'funk-break-432949.mp3',
			'Koto San - Ofshane.mp3',
			'Lights - Patrick Patrikios.mp3',
			'soft-background-music-432715.mp3',
			'synth-pop-110351.mp3',
			'Tropic Fuse - French Fuse.mp3',
			'upbeat-technology-413665.mp3',
		];
		return new BackgroundMusic(files.map(file => `${basePath}/${file}`));
	}

	private shufflePlaylist() {
		this.shuffledIndexes = util.arr(this.paths.length);
		for (let i = this.shuffledIndexes.length - 1; i > 0; i--) {
			let j = util.randInt(0, i + 1);
			[this.shuffledIndexes[i], this.shuffledIndexes[j]] = [this.shuffledIndexes[j], this.shuffledIndexes[i]];
		}
		this.currentIndex = 0;
	}

	private get currentPath(): string {
		return this.paths[this.shuffledIndexes[this.currentIndex]];
	}

	private playNextTrack() {
		this.currentIndex++;
		if (this.currentIndex === this.shuffledIndexes.length)
			this.shufflePlaylist();
		this.audio.src = this.currentPath;
		this.audio.play();
	}
}
