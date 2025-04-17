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

export const randomKey = () => Math.random().toString(16).slice(2);

export const clamp = (value: number, min: number, max: number) =>
  Math.max(Math.min(value, max), min);

const d2r = Math.PI / 180;
export const degToRad = (deg: number) => deg * d2r;

const r2d = 180 / Math.PI;
export const radToDeg = (rad: number) => rad * r2d;