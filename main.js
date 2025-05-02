const { app, BrowserWindow, BrowserView, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const dataPath = path.join(app.getPath('userData'), 'data.json');

function convertToChatURL(url, platform) {
  if (platform === 'twitch') {
    const match = url.match(/twitch\.tv\/([^\/\?\&]+)/);
    if (match) return `https://www.twitch.tv/popout/${match[1]}/chat?popout=&darkpopout=`;
  }
  if (platform === 'youtube') {
    const match = url.match(/v=([^&]+)/) || url.match(/youtube\.com\/watch\?[^v]*v=([^&]+)/);
    if (match) return `https://www.youtube.com/live_chat?v=${match[1]}&dark_theme=1`;
  }
  if (platform === 'loco') {
    return url;
  }
  if (platform === 'kick') {
    const match = url.match(/kick\.com\/([^\/\?\&]+)/);
    if (match) return `https://kick.com/${match[1]}/chatroom`;
  }
  return null;
}

function saveChatData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function loadChatData() {
  if (fs.existsSync(dataPath)) {
    try {
      return JSON.parse(fs.readFileSync(dataPath));
    } catch {
      return null;
    }
  }
  return null;
}

app.commandLine.appendSwitch('allow-file-access-from-files');

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    const savedData = loadChatData();
    if (savedData) {
      mainWindow.webContents.send('load-saved-data', savedData);
    }
  });
});

ipcMain.on('start-chats', async (event, chatData) => {
  saveChatData(chatData);
  mainWindow.close();

  const mainViewWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      contextIsolation: true,
    },
  });

  const views = [];
  const twitchSession = session.fromPartition('persist:twitch-shared');

  const twitch7TVLoaded = (async () => {
    let extensionPath;
    if (app.isPackaged) {
      extensionPath = path.join(process.resourcesPath, 'app.asar.unpacked', '7tv-extension');
    } else {
      extensionPath = path.join(__dirname, '7tv-extension');
    }

    try {
      await twitchSession.loadExtension(extensionPath, { allowFileAccess: true });
      console.log('7TV carregado na sessão compartilhada da Twitch');
    } catch (err) {
      console.error('Erro ao carregar 7TV:', err);
    }
  })();

  for (let i = 0; i < chatData.length; i++) {
    const { platform, link } = chatData[i];

    const ses = platform === 'twitch'
      ? twitchSession
      : session.fromPartition(`persist:${platform}${i}`);

    if (platform === 'twitch') await twitch7TVLoaded;

    const view = new BrowserView({ webPreferences: { session: ses } });
    views.push({ view, platform, session: ses });
    mainViewWindow.addBrowserView(view);

    const chatURL = convertToChatURL(link, platform);
    await view.webContents.loadURL(chatURL);

    if (platform === 'loco') {
      ses.webRequest.onBeforeRequest((details, callback) => {
        if (details.url.includes('.m3u8') || details.url.includes('.mp4') || details.url.includes('.webm')) {
          callback({ cancel: true });
        } else {
          callback({ cancel: false });
        }
      });

      view.webContents.on('did-finish-load', () => {
        view.webContents.insertCSS(`
          video,
          .VideoPlayer__container,
          .Player__container,
          .Player,
          .VideoPlayer,
          .VideoElement,
          .VideoOverlay,
          .VideoWrapper {
            display: none !important;
          }

          .Chat__container {
            width: 100% !important;
            height: 100vh !important;
          }
        `);
      });
    }
  }

  const updateLayout = () => {
    const [width, height] = mainViewWindow.getContentSize();
    const colWidth = Math.floor(width / views.length);
    views.forEach((item, index) => {
      item.view.setBounds({ x: index * colWidth, y: 0, width: colWidth, height });
    });
  };

  mainViewWindow.on('resize', updateLayout);
  updateLayout();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
