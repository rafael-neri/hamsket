const path = require('path');
const {app, nativeImage, Menu, MenuItem, Tray} = require('electron');
const {isMac, isLinux} = require('./utils/processEnvironment');
// Module to create tray icon

let appIcon = null;

exports.create = function(win, config) {
	if (isMac || appIcon || config.get('window_display_behavior') === 'show_taskbar' ) return;

	const locale = require(path.join(app.getAppPath(), '/resources/languages/'+config.get('locale')));
	const iconName = isLinux || isMac ? 'IconTray.png' : 'Icon.ico';
	const iconPath = path.join(app.getAppPath(), `/resources/${iconName}`);
	const icon = nativeImage.createFromPath(iconPath);

	const contextMenu = Menu.buildFromTemplate([
		{
			label: locale['tray[0]'],
			click() {
				win.webContents.executeJavaScript('ipc.send("toggleWin", false);');
			}
		},
		{
			type: 'separator'
		},
		{
			label: locale['tray[1]'],
			click() {
				app.quit();
			}
		}
	]);

	appIcon = new Tray(icon);
	appIcon.setToolTip('Hamsket');
	appIcon.setContextMenu(contextMenu);

	switch (process.platform) {
		case 'darwin':
			break;
		case 'linux':
		case 'freebsd':
		case 'sunos':
			// Double click is not supported and Click its only supported when app indicator is not used.
			// Read more here (Platform limitations): https://github.com/electron/electron/blob/master/docs/api/tray.md
			appIcon.on('click', function() {
				win.webContents.executeJavaScript('ipc.send("toggleWin", true);');
			});
			break;
		case 'win32':
			appIcon.on('double-click', function() {
				win.webContents.executeJavaScript('ipc.send("toggleWin", true);');
			});
			break;
		default:
			break;
	}
};

exports.destroy = function() {
	if (appIcon) appIcon.destroy();
	appIcon = null;
};

exports.setBadge = function(messageCount, showUnreadTray) {
	if (isMac || !appIcon) return;

	let iconName;
	if (isLinux) {
		iconName = messageCount > 0 && showUnreadTray ? 'IconTrayUnread.png' : 'IconTray.png';
	} else {
		iconName = messageCount > 0 && showUnreadTray ? 'IconTrayUnread.ico' : 'Icon.ico';
	}

	const iconPath = path.join(app.getAppPath(), `/resources/${iconName}`);
	const icon = nativeImage.createFromPath(iconPath);
	appIcon.setImage(icon);
};
