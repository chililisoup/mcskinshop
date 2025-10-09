import PaperDoll from '@components/special/paperdoll/paperdoll';

export default abstract class AbstractMode {
  instance: PaperDoll;
  name: string;

  constructor(instance: PaperDoll, name: string) {
    this.instance = instance;
    this.name = name;
  }

  abstract init: (canvas: HTMLCanvasElement) => void;

  abstract dispose: (canvas: HTMLCanvasElement) => void;

  abstract settingsRibbon: React.JSX.Element;
}
