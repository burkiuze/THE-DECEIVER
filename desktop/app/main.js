'use strict';
// The Deceiver masaüstü uygulaması: oyunu kendi Chromium motoruyla, tarayıcıdan bağımsız
// bir pencerede açar. Oyun dosyaları uygulamanın içindeki game/ klasöründedir.
const { app, BrowserWindow, Menu, ipcMain, screen, shell } = require('electron');
const path = require('path');

app.setName('TheDeceiver');
if (process.env.LOCALAPPDATA) app.setPath('userData', path.join(process.env.LOCALAPPDATA, 'TheDeceiver'));
if (process.platform === 'win32') app.setAppUserModelId('TheDeceiver.Game');

let win = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(createWindow);
}

function createWindow() {
  Menu.setApplicationMenu(null);
  const wa = screen.getPrimaryDisplay().workAreaSize;
  let h = Math.round(wa.height * 0.85), w = Math.round(wa.width * 0.85);
  if (w > h * 1.6) w = Math.round(h * 1.6);
  win = new BrowserWindow({
    width: w, height: h, minWidth: 960, minHeight: 600, center: true,
    title: 'The Deceiver',
    icon: path.join(__dirname, 'game', 'assets', 'icon.png'),
    backgroundColor: '#0b0a10',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', (e) => e.preventDefault());
  // Dış linkler (Bizi Takip Et) varsayılan tarayıcıda açılır; oyun penceresi başka sayfaya gitmez.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url); }
  });
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.on('closed', () => { win = null; });
}

ipcMain.handle('fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); return !!on; });
ipcMain.handle('quit', () => app.quit());
app.on('window-all-closed', () => app.quit());
