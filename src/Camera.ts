import Vector from './Vector.js';
import {Application, Container} from 'pixi.js';
import util from './util.js';

class Camera {
  private canvasWidth: number;
  private leftTop: Vector = new Vector();
  private width: number = 1;
  container: Container = new Container();

  constructor(app: Application) {
    this.canvasWidth = app.renderer.width;
    app.stage.addChild(this.container);
    this.updateContainer();
  }

  move(delta: Vector) {
    this.leftTop.add(delta.scale(this.width));
    // todo clamp
    // todo smooth
    this.updateContainer();
  }

  zoom(delta: number) {
    let centerWorld = this.canvasToWorld(new Vector(this.canvasWidth / 2, this.canvasWidth / 2));
    this.width = util.clamp(this.width + delta, .1, 1.5);
    this.leftTop = centerWorld.subtract(new Vector(this.width / 2));
    this.updateContainer();
  }

  private worldToCanvas(world: Vector) {
    return world
      .subtract(this.leftTop)
      .scale(1 / this.width * this.canvasWidth);
  }

  private canvasToWorld(canvas: Vector) {
    return canvas
      .scale(1 / this.canvasWidth * this.width)
      .add(this.leftTop);
  }

  private updateContainer() {
    this.container.scale = this.canvasWidth / this.width;
    this.container.position = this.worldToCanvas(new Vector());
  }
}

export default Camera;
