export default class Speaker<TType, LListener extends (...args: TType[]) => void> {
  private listeners: LListener[] = [];
  private argSupplier?: () => TType;

  constructor(argSupplier?: () => TType) {
    this.argSupplier = argSupplier;
  }

  registerListener = (listener: LListener) => {
    if (!this.listeners.includes(listener)) this.listeners.push(listener);
  };

  unregisterListener = (listener: LListener) => {
    this.listeners = this.listeners.filter(registered => registered !== listener);
  };

  updateListeners = (args?: TType) => {
    this.listeners.forEach(listener =>
      args ? listener(args) : this.argSupplier ? listener(this.argSupplier()) : listener()
    );
  };
}
