export {};

/*

  This is not entirely correct. Mainly made to silence eslint

*/

declare global {
  interface FileSystemObserver {
    observe(handle: FileSystemFileHandle): Promise<undefined>;
    disconnect(): void;
  }
  var FileSystemObserver: {
    prototype: FileSystemObserver;
    new (callback: (records: FileSystemChangeRecord[], observer: FileSystemObserver) => void): FileSystemObserver;
  };

  interface FileSystemChangeRecord {
    readonly root: FileSystemFileHandle;
    readonly type: 'appeared' | 'disappeared' | 'errored' | 'modified' | 'moved' | 'unknown';
  }
}
