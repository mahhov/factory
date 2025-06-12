import {AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, SCALE_MODES, Sprite, Texture, TexturePool, TextureStyle} from 'pixi.js';
import Camera from './Camera.js';
import Input from './Input.js';
import Vector from './Vector.js';

(async () => {
  let app = new Application();
  await app.init({
    background: 'black',
    width: 1400,
    height: 1400,
  });
  TextureStyle.defaultOptions.scaleMode = 'nearest';

  document.body.appendChild(app.canvas);

  let camera = new Camera(app);
  let container = camera.container;

  let input = new Input();
  input.bindings.cameraLeft.setListener(() => camera.move(new Vector(-.01, 0)));
  input.bindings.cameraRight.setListener(() => camera.move(new Vector(.01, 0)));
  input.bindings.cameraUp.setListener(() => camera.move(new Vector(0, -.01)));
  input.bindings.cameraDown.setListener(() => camera.move(new Vector(0, .01)));
  input.bindings.cameraZoomOut.setListener(() => camera.zoom(.03));
  input.bindings.cameraZoomIn.setListener(() => camera.zoom(-.03));
  setInterval(() => {
    input.tick();
  }, 10);

  let path = `../resources/conveyor/conveyor.json`;
  const sheet = await Assets.load(path);

  const anim = new AnimatedSprite(sheet.animations['move']);
  anim.x = .5;
  anim.y = .5;
  anim.width = .1;
  anim.height = anim.width;
  anim.animationSpeed = 0.1;
  anim.play();
  container.addChild(anim);
})();

// let $ = q => document.querySelector(q);
// let $$ = q => document.querySelectorAll(q);
//
// let canvas = $('canvas');
//
// class Painter {
//   private canvas: HTMLCanvasElement;
//
//   constructor(canvas) {
//     this.canvas = canvas;
//   }
// }
//
// console.log('yo2');
