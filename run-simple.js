const { app, BrowserWindow } = require('electron');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: true
  });
  
  mainWindow.loadURL(`data:text/html,
    <html>
      <body style="padding: 20px; font-family: system-ui;">
        <h1>SnapWrite Test</h1>
        <p>If you can see this, Electron is working!</p>
        <p>The app should be visible in your dock.</p>
      </body>
    </html>
  `);
  
  console.log('Window created and should be visible');
});

// Keep the app running
app.on('window-all-closed', (e) => {
  e.preventDefault();
});