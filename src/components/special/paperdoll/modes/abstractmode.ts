import PaperDoll from '@components/special/paperdoll/paperdoll';

export default abstract class AbstractMode {
  instance: PaperDoll;

  constructor(instance: PaperDoll) {
    this.instance = instance;
  }

  abstract init: (canvas: HTMLCanvasElement) => void;

  abstract dispose: (canvas: HTMLCanvasElement) => void;
}
