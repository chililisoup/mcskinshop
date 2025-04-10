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
