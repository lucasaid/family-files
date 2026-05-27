// Central data path — resolves to the folder containing the .app when packaged,
// or the project root in dev. All file utils should import from here instead of
// using process.cwd() directly.
const { ipcRenderer } = (window as any).require('electron');
export const dataPath: string = ipcRenderer.sendSync('get-data-path');
