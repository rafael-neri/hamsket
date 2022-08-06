'use strict';

const {app, protocol, BrowserWindow, dialog, shell, Menu, ipcMain, nativeImage, session} = require('electron');
// Tray
const tray = require('./tray');
// AutoLaunch
const AutoLaunch = require('auto-launch');
// Configuration
const Config = require('electron-store');
// Updater
const updater = require('./updater');
// File System
const fs = require("fs");
const path = require('path');
const contextMenu = require('electron-context-menu');

// If 'data' folder exists in Hamsket's folder, set userdata, logs, and usercache path to there
var basepath = app.getAppPath();
if (fs.existsSync(path.join(basepath, 'data'))) {
	app.setPath('userData', path.join(basepath, 'data', 'data'));
	app.setPath('logs', path.join(basepath, 'data', 'logs'));
	app.setPath('userCache', path.join(basepath, 'data', 'cache'));
}

// Initial Config
const config = new Config({
	 defaults: {
		 always_on_top: false
		,hide_menu_bar: false
		,tabbar_location: 'top'
		,window_display_behavior: 'taskbar_tray'
		,auto_launch: false
		,flash_frame: true
		,window_close_behavior: 'keep_in_tray'
		,start_minimized: false
		,systemtray_indicator: true
		,master_password: false
		,dont_disturb: false
		,disable_gpu: process.platform === 'linux'
		,proxy: false
		,proxyHost: ''
		,proxyPort: ''
		,proxyLogin: ''
		,proxyPassword: ''
		,locale: 'en'
		,enable_hidpi_support: false
		,default_service: 'hamsketTab'

		,x: undefined
		,y: undefined
		,width: 1000
		,height: 800
		,maximized: false
	}
});

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Fix issues with HiDPI scaling on Windows platform
if (config.get('enable_hidpi_support') && (process.platform === 'win32')) {
	app.commandLine.appendSwitch('high-dpi-support', 'true');
	app.commandLine.appendSwitch('force-device-scale-factor', '1');
}

// TODO: https://github.com/electron/electron/issues/25469
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

// This must match the package name in package.json
app.setAppUserModelId('com.thegoddessinari.hamsket');

app.userAgentFallback = app.userAgentFallback
	.replace(`Electron/${process.versions.electron}`, ``)
	.replace(`Hamsket/${app.getVersion()}`, ``);

// Menu
const appMenu = require('./menu')(config);

// Configure AutoLaunch
const appLauncher = new AutoLaunch({
	name: 'Hamsket',
	isHidden: config.get('start_minimized')
});
appLauncher
	.isEnabled()
	.then((isEnabled) => {
		if (config.get('auto_launch') && !isEnabled) {
			appLauncher.enable();
		} else if (!config.get('auto_launch') && isEnabled) {
			appLauncher.disable();
		}
		return;
	})
	.catch((err) => {
		console.log(err);
	});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let isQuitting = false;

function createWindow () {
	// Create the browser window using the state information
	mainWindow = new BrowserWindow({
		 title: 'Hamsket'
		,icon: nativeImage.createFromPath(path.join(app.getAppPath(), '/resources/Icon.' + (process.platform === 'linux' ? 'png' : 'ico')))
		,backgroundColor: '#FFF'
		,x: config.get('x')
		,y: config.get('y')
		,width: config.get('width')
		,height: config.get('height')
		,alwaysOnTop: config.get('always_on_top')
		,autoHideMenuBar: config.get('hide_menu_bar')
		,skipTaskbar: config.get('window_display_behavior') === 'show_trayIcon'
		,show: !config.get('start_minimized')
		,acceptFirstMouse: true
		,webPreferences: {
			partition: 'persist:hamsket',
			nodeIntegration: true,
			webviewTag: true,
			contextIsolation: false,
		}
	});

	require("@electron/remote/main").enable(mainWindow.webContents);

	if ( !config.get('start_minimized') && config.get('maximized') ) mainWindow.maximize();
	if (config.get('start_minimized')){
		if (config.get('window_display_behavior') == 'show_taskbar') {
			mainWindow.webContents.once('did-finish-load', function(e) {
				mainWindow.minimize();
				});
		}
		else {
			mainWindow.webContents.once('did-finish-load', function(e) {
				mainWindow.hide();
				});
		}
	}

	// Check if the window its outside of the view (ex: multi monitor setup)
	const { positionOnScreen } = require('./utils/positionOnScreen');
	const inBounds = positionOnScreen([config.get('x'), config.get('y')]);
	if ( inBounds ) {
		mainWindow.setPosition(config.get('x'), config.get('y'));
	} else {
		mainWindow.center();
	}

	process.setMaxListeners(10000);

	// and load the index.html of the app.
	mainWindow.loadURL('file://' + __dirname + '/../index.html');

	Menu.setApplicationMenu(appMenu);

	tray.create(mainWindow, config);

	if ( fs.existsSync(path.resolve(path.dirname(process.execPath), '..', 'Update.exe')) && process.argv.indexOf('--without-update') === -1 ) updater.initialize(mainWindow);

	// Open links in default browser
	mainWindow.webContents.on('new-window', function(e, url, frameName, disposition, options) {
		const protocol = require('url').parse(url).protocol;
		switch ( disposition ) {
			case 'new-window': {
				e.preventDefault();
				const win = new BrowserWindow(options);
				win.once('ready-to-show', () => win.show());
				win.loadURL(url);
				e.newGuest = win;
				break;
			}
			case 'foreground-tab': {
				if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
					e.preventDefault();
					shell.openExternal(url);
				}
				break;
			}
			default:
				break;
		}
	});

	mainWindow.webContents.on('will-navigate', function(event, url) {
		event.preventDefault();
	});

	// BrowserWindow events
	mainWindow.on('page-title-updated', (e, title) => updateBadge(title));
	mainWindow.on('maximize', function(e) { config.set('maximized', true); });
	mainWindow.on('unmaximize', function(e) { config.set('maximized', false); });
	mainWindow.on('resize', function(e) { if (!mainWindow.isMaximized()) config.set(mainWindow.getBounds()); });
	mainWindow.on('move', function(e) { if (!mainWindow.isMaximized()) config.set(mainWindow.getBounds()); });
	mainWindow.on('app-command', (e, cmd) => {
		// Navigate the window back when the user hits their mouse back button
		if ( cmd === 'browser-backward' ) mainWindow.webContents.executeJavaScript('if(Ext.cq1("app-main")) Ext.cq1("app-main").getActiveTab().goBack();');
		// Navigate the window forward when the user hits their mouse forward button
		if ( cmd === 'browser-forward' ) mainWindow.webContents.executeJavaScript('if(Ext.cq1("app-main")) Ext.cq1("app-main").getActiveTab().goForward();');
	});

	// Emitted when the window is closed.
	mainWindow.on('close', function(e) {
		if ( !isQuitting ) {
			e.preventDefault();

			switch (process.platform) {
				case 'darwin':
					app.hide();
					break;
				default:
					switch (config.get('window_close_behavior')) {
						case 'keep_in_tray':
							mainWindow.hide();
							break;
						case 'keep_in_tray_and_taskbar':
							mainWindow.minimize();
							break;
						case 'quit':
							app.quit();
							break;
					}
					break;
			}
		}
	});
	mainWindow.on('closed', function(e) {
		mainWindow = null;
	});
	mainWindow.once('focus', () => mainWindow.flashFrame(false));
}

let mainMasterPasswordWindow;
function createMasterPasswordWindow() {
	mainMasterPasswordWindow = new BrowserWindow({
		 backgroundColor: '#0675A0'
		,frame: false
		,webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}

	});
	require("@electron/remote/main").enable(mainMasterPasswordWindow.webContents);

	mainMasterPasswordWindow.loadURL('file://' + __dirname + '/../masterpassword.html');
	mainMasterPasswordWindow.on('close', function() { mainMasterPasswordWindow = null; });
}

function updateBadge(title) {
	title = title.split(" - ")[0]; //Discard service name if present, could also contain digits
	let messageCount = title.match(/\d+/g) ? parseInt(title.match(/\d+/g).join("")) : 0;
	messageCount = isNaN(messageCount) ? 0 : messageCount;
	
	tray.setBadge(messageCount, config.get('systemtray_indicator'));

	if (process.platform === 'win32') { // Windows
		if (messageCount === 0) {
			mainWindow.setOverlayIcon(null, "");
			return;
		}

		mainWindow.webContents.send('setBadge', messageCount);
	} else { // macOS & Linux
		app.badgeCount = messageCount;
	}

	if ( messageCount > 0 && !mainWindow.isFocused() && !config.get('dont_disturb') && config.get('flash_frame') ) mainWindow.flashFrame(true);
}

ipcMain.on('setBadge', function(event, messageCount, value) {
	const img = nativeImage.createFromDataURL(value);
	mainWindow.setOverlayIcon(img, messageCount.toString());
});

ipcMain.on('getConfig', function(event, arg) {
	event.returnValue = config.store;
});

ipcMain.on('setConfig', function(event, values) {
	config.set(values);

	// hide_menu_bar
	mainWindow.setAutoHideMenuBar(values.hide_menu_bar);
	if ( !values.hide_menu_bar ) mainWindow.setMenuBarVisibility(true);
	// always_on_top
	mainWindow.setAlwaysOnTop(values.always_on_top);
	// auto_launch
	if (values.auto_launch) {
		appLauncher.enable();
	} else {
		appLauncher.disable();
	}
	// systemtray_indicator
	updateBadge(mainWindow.getTitle());

	mainWindow.webContents.executeJavaScript('(function(a){if(a)a.controller.initialize(a)})(Ext.cq1("app-main"))');

	switch ( values.window_display_behavior ) {
		case 'show_taskbar':
			mainWindow.setSkipTaskbar(false);
			tray.destroy();
			break;
		case 'show_trayIcon':
			mainWindow.setSkipTaskbar(true);
			tray.create(mainWindow, config);
			break;
		case 'taskbar_tray':
			mainWindow.setSkipTaskbar(false);
			tray.create(mainWindow, config);
			break;
		default:
			break;
	}
});

ipcMain.on('validateMasterPassword', function(event, pass) {
	if ( config.get('master_password') === require('crypto').createHash('md5').update(pass).digest('hex') ) {
		createWindow();
		mainMasterPasswordWindow.close();
		event.returnValue = true;
	}
	event.returnValue = false;
});

// Handle Service Notifications
ipcMain.on('setServiceNotifications', function(event, partition, op) {
	if (partition) {
		session.fromPartition(partition).setPermissionRequestHandler(function(webContents, permission, callback) {
			if (permission === 'notifications') return callback(op);
			callback(true);
		});
	}
});

ipcMain.on('setDontDisturb', function(event, arg) {
	config.set('dont_disturb', arg);
});

// Reload app
ipcMain.on('reloadApp', function(event) {
	mainWindow.reload();
});

// Relaunch app
ipcMain.on('relaunchApp', function(event) {
	app.relaunch();
	app.quit(0);
});

const haveLock = app.requestSingleInstanceLock();
app.on('second-instance', (commandLine, workingDirectory) => {
	// Someone tried to run a second instance, we should focus our window.
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
		mainWindow.show();
		mainWindow.setSkipTaskbar(false);
		if (app.dock && app.dock.show) app.dock.show();
	}
});

if (!haveLock) {
	app.quit();
}

const allowPopUp = [
	'=?print=true', // esta ultima checkea como anda imprimir un pedf desde gmail, si no va bie sacala
	'accounts.google.com/AccountChooser',
	'accounts.google.com/o/oauth2',
	'api.moo.do',
	'app.mixmax.com/_oauth/google',
	'app.slack.com/files/import/dropbox',
	'app.slack.com/files/import/gdrive',
	'app.slack.com/free-willy/',
	'auth.missiveapp.com',
	'dropbox.com/profile_services/start_auth_flow',
	'facebook.com/v3.1/dialog/oauth?',
	'facebook.com/v3.2/dialog/oauth?',
	'feedly.com/v3/auth/',
	'figma.com/start_google_sso',
	'hangouts.google.com/webchat/u/0/frame',
	'identity.linuxfoundation.org/cas/login',
	'mail.google.com/mail',
	'manychat.com/fb?popup',
	'messenger.com/videocall',
	'notion.so/googlepopupredirect',
	'officeapps.live.com',
	'spikenow.com/s/account',
	'zoom.us/office365',
];

app.on('web-contents-created', (webContentsCreatedEvent, contents) => {
	if (contents.getType() !== 'webview') return;
	// Block some Deep links to prevent that open its app (Ex: Slack)
	contents.on(
		'will-navigate',
		(event, url) => url.slice(0, 8) === 'slack://' && event.preventDefault()
	);
	// New Window handler
	contents.on(
		'new-window',
		(
			event,
			url,
			frameName,
			disposition,
			options,
			additionalFeatures,
			referrer,
			postBody
		) => {
			// If the url is about:blank we allow the window and handle it in 'did-create-window'
			if (['about:blank', 'about:blank#blocked'].includes(url)) {
				event.preventDefault();
				Object.assign(options, {
					show: false,
				});
				const win = new BrowserWindow(options);
				win.center();
				let once = false;
				win.webContents.on('will-navigate', (e, nextURL) => {
					if (once) return;
					if (['about:blank', 'about:blank#blocked'].includes(nextURL)) return;
					once = true;
					let allow = false;
					for (const url of allowPopUp) {
						if (nextURL.includes(url)) {
							allow = true;
							break;
						}
					}
					// If the url is in aboutBlankOnlyWindow we handle this as a popup window
					if (allow) return win.show();
					shell.openExternal(nextURL);
					win.close();
				});
				event.newGuest = win;
				return;
			}
			// We check if url is in the allowPopUpLoginURLs or allowForegroundTabURLs in Firebase to open a as a popup,
			// if it is not we send this to the app
			let allow = false;
			for (const allowed of allowPopUp) {
				if (url.includes(allowed)) {
					allow = true;
					break;
				}
			}
			if (allow) return;
			shell.openExternal(url);
			event.preventDefault();
		}
	);
	contents.on('did-create-window', (win, details) => {
		// Here we center the new window.
		win.center();
		// The following code is for handling the about:blank cases only.
		if (!['about:blank', 'about:blank#blocked'].includes(details.url)) return;
		let once = false;
		win.webContents.on('will-navigate', (e, nextURL) => {
			if (once) return;
			if (['about:blank', 'about:blank#blocked'].includes(nextURL)) return;
			once = true;
			let allow = false;
			for (const url of allowPopUp) {
				if (nextURL.includes(url)) {
					allow = true;
					break;
				}
			}
			// If the url is in aboutBlankOnlyWindow we handle this as a popup window
			if (allow) return win.show();
			shell.openExternal(url);
			win.close();
		});
	});
});

// Code for downloading images as temporal files
// Credit: Ghetto Skype (https://github.com/stanfieldr/ghetto-skype)
let imageCache = {};
ipcMain.on('image:download', function(event, url, partition) {
	const tmp = require('tmp');
	const mime = require('mime');
	let file = imageCache[`${url}`];
	if (file) {
		if (file.complete) {
			shell.openItem(file.path);
		}

		// Pending downloads intentionally do not proceed
		return;
	}

	let tmpWindow = new BrowserWindow({
		 show: false
		,webPreferences: {
			partition: partition
		}
	});

	tmpWindow.webContents.session.once('will-download', (event, downloadItem) => {
		imageCache[`${url}`] = file = {
			 path: tmp.tmpNameSync() + '.' + mime.getExtension(downloadItem.getMimeType())
			,complete: false
		};

		downloadItem.setSavePath(file.path);
		downloadItem.once('done', () => {
			tmpWindow.destroy();
			tmpWindow = null;
			shell.openItem(file.path);
			file.complete = true;
		});
	});

	tmpWindow.webContents.downloadURL(url);
});

// Hangouts
ipcMain.on('image:popup', function(event, url, partition) {
	let tmpWindow = new BrowserWindow({
		 width: mainWindow.getBounds().width
		,height: mainWindow.getBounds().height
		,parent: mainWindow
		,icon: nativeImage.createFromPath(path.join(app.getAppPath(), '/resources/Icon.' + (process.platform === 'linux' ? 'png' : 'ico')))
		,backgroundColor: '#FFF'
		,autoHideMenuBar: true
		,skipTaskbar: true
		,webPreferences: {
			partition: partition
		}
	});

	tmpWindow.maximize();

	tmpWindow.loadURL(url);
});

ipcMain.on('toggleWin', function(event, alwaysShow) {
	if ( !mainWindow.isMinimized() && mainWindow.isMaximized() && mainWindow.isVisible() ) { // Maximized
		if (!alwaysShow) {
			mainWindow.close();
		} else {
			mainWindow.show();
		} 
	} else if ( mainWindow.isMinimized() && !mainWindow.isMaximized() && !mainWindow.isVisible() ) { // Minimized
		mainWindow.restore();
	} else if ( !mainWindow.isMinimized() && !mainWindow.isMaximized() && mainWindow.isVisible() ) { // Windowed mode
		if (!alwaysShow) {
			mainWindow.close();
		 } else {
			mainWindow.show();
		 }
	} else if ( mainWindow.isMinimized() && !mainWindow.isMaximized() && mainWindow.isVisible() ) { // Closed to taskbar
		mainWindow.restore();
	} else if ( !mainWindow.isMinimized() && mainWindow.isMaximized() && !mainWindow.isVisible() ) { // Closed maximized to tray
		mainWindow.show();
	} else if ( !mainWindow.isMinimized() && !mainWindow.isMaximized() && !mainWindow.isVisible() ) { // Closed windowed to tray
		mainWindow.show();
	} else if ( mainWindow.isMinimized() && !mainWindow.isMaximized() && !mainWindow.isVisible() ) { // Closed minimized to tray
		mainWindow.restore();
	} else {
		mainWindow.show();
	}
});

// Proxy
if ( config.get('proxy') ) {
	app.commandLine.appendSwitch('proxy-server', config.get('proxyHost')+':'+config.get('proxyPort'));
	app.on('login', (event, webContents, request, authInfo, callback) => {
		if(!authInfo.isProxy)
			return;

		event.preventDefault();
		callback(config.get('proxyLogin'), config.get('proxyPassword'));
	});
}

// Disable GPU Acceleration for Linux
// to prevent White Page bug
// https://github.com/electron/electron/issues/6139
// https://github.com/saenzramiro/hamsket/issues/181
if ( config.get('disable_gpu') ) app.disableHardwareAcceleration();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
	require('@electron/remote/main').initialize();
	if (config.get('master_password')) {
		createMasterPasswordWindow();
	} else {
		createWindow();
	}
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// Only macOS: On OS X it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
app.on('activate', function () {
	if (mainWindow === null && mainMasterPasswordWindow === null ) {
		if (config.get('master_password')) {
			createMasterPasswordWindow();
		} else {
			createWindow();
		}
	}

	if ( mainWindow !== null ) mainWindow.show();
});

app.on('before-quit', function () {
	isQuitting = true;
});

// Prevent the ability to create webview with nodeIntegration.
app.on('web-contents-created', (event, contents) => {
	require("@electron/remote/main").enable(contents);
	const contextMenuWebContentsDispose = contextMenu({
		window: contents,
		showCopyImageAddress: true,
		showSaveImage: false,
		showSaveImageAs: true,
	});

	contents.session.webRequest.onBeforeSendHeaders(
		{
			urls: [
				'https://accounts.google.com/',
				'https://accounts.google.com/*'
			]
		},
		(details, callback) => {
			details.requestHeaders['User-Agent'] =
				'Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0';
			callback({ requestHeaders: details.requestHeaders });
		}
	);

    contents.on('will-attach-webview', (event, webPreferences, params) => {
		// Always prevent node integration
		webPreferences.nodeIntegration = false;

	});
	contents.on('destroyed', function() {
		contextMenuWebContentsDispose();
	})
});
