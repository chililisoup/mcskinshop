export const fileSystemAccess = 'showOpenFilePicker' in window && 'FileSystemObserver' in window;

export const getBlob = async (content: string) => await fetch(content).then(r => r.blob());

export const download = async (filename: string, content: string) => {
  if (content === null) return;

  if (fileSystemAccess) {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename
    });

    const blob = await getBlob(content);
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

    return;
  }

  const name = window.prompt('Download as...', filename.split('.')[0]);
  if (name === null) return;

  const link = document.createElement('a');
  link.href = content;
  link.download = name + '.' + filename.split('.')[1];

  link.click();
};

export const getRemoteJson = async (path: string) => {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Response status: ${response.status}`);

    const json: unknown = await response.json();
    if (json && typeof json === 'object') return json;

    throw new Error(`Could not load JSON at ${path}`);
  } catch (error) {
    console.error(error);
  }
};

export const corsProxy = (url: string) => 'https://corsproxy.io/?url=' + url;

// https://stackoverflow.com/a/30106551
export const b64ToUtf8 = (b64: string) =>
  decodeURIComponent(
    atob(b64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

// https://stackoverflow.com/a/70811091
export const isKeyOfObject = <T extends object>(key: unknown, obj: T): key is keyof T => {
  return (
    (typeof key === 'string' || typeof key === 'number' || typeof key === 'symbol') && key in obj
  );
};

export const includes = <T, U extends T>(array: readonly U[] | U[], value: T): value is U =>
  (array as unknown[]).includes(value);

// https://stackoverflow.com/a/16436975
export const arraysEqual = (first: unknown[], second: unknown[]) => {
  if (first === second) return true;
  if (first === null || second === null) return false;
  if (first.length !== second.length) return false;
  for (let i = 0; i < first.length; ++i) if (first[i] !== second[i]) return false;
  return true;
};

export const randomKey = () => Math.random().toString(16).slice(2);

export const clamp = (value: number, min: number, max: number) =>
  Math.max(Math.min(value, max), min);

const d2r = Math.PI / 180;
export const degToRad = (deg: number) => deg * d2r;

const r2d = 180 / Math.PI;
export const radToDeg = (rad: number) => rad * r2d;

export const lerp = (factor: number, from: number, to: number) => (1 - factor) * from + factor * to;

let slim = false;
export const setSlim = (set: boolean) => (slim = set);
export const getSlim = () => slim;

export const getCssVariable = (variable: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(variable);
};
