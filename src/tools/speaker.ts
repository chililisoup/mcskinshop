export default class Speaker<TType, LListener extends (...args: TType[]) => void> {
  private listeners = new Set<LListener>();
  private argSupplier?: () => TType;

  constructor(argSupplier?: () => TType) {
    this.argSupplier = argSupplier;
  }

  registerListener = (listener: LListener): void => void this.listeners.add(listener);

  unregisterListener = (listener: LListener): void => void this.listeners.delete(listener);

  updateListeners = (args?: TType) =>
    this.listeners.forEach(listener =>
      args ? listener(args) : this.argSupplier ? listener(this.argSupplier()) : listener()
    );
}
