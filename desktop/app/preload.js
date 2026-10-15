'use strict';
// Oyunun pencereyi yönetmesi için iki küçük köprü: tam ekran ve çıkış.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deceiverFullscreen', (on) => ipcRenderer.invoke('fullscreen', !!on));
contextBridge.exposeInMainWorld('deceiverQuit', () => ipcRenderer.invoke('quit'));
