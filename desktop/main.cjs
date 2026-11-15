const { app, BrowserWindow, protocol, net, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setName('Kinetic Core');
app.setAppUserModelId('ua.mykyta.kineticcore');
app.enableSandbox();
protocol.registerSchemesAsPrivileged([
  { scheme: 'kinetic', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);
let window;
const origin = 'kinetic://game';
const csp = "default-src 'self'; script-src 'self' https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js; style-src 'self' 'unsafe-inline' https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css; img-src 'self' data: blob: https:; connect-src 'self' https:; worker-src 'self' blob:; font-src 'self' data: https:; object-src 'none'; base-uri 'self'; frame-src 'none'";

async function createWindow() {
  window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 800, minHeight: 600,
    backgroundColor: '#000000', title: 'Kinetic Core',
    icon: path.join(__dirname, 'resources/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false,
      webviewTag: false, navigateOnDragDrop: false,
    },
  });
  // This game needs no native bridge, device permissions or popup windows.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== `${origin}/index.html`) event.preventDefault();
  });
  window.webContents.on('will-redirect', event => event.preventDefault());
  window.on('closed', () => { window = null; });
  await window.loadURL(`${origin}/index.html`);
}

app.whenReady().then(async () => {
  const game = path.resolve(__dirname, 'game');
  protocol.handle('kinetic', async request => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'game' || !['GET', 'HEAD'].includes(request.method)) return new Response('', { status: 403 });
      const filename = path.resolve(game, '.' + decodeURIComponent(url.pathname));
      if (!filename.startsWith(game + path.sep)) return new Response('', { status: 403 });
      const response = await net.fetch(pathToFileURL(filename).toString());
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', csp);
      return new Response(response.body, { status: response.status, headers });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  await createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
