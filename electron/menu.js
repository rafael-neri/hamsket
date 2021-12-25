'use strict';
const os = require('os');
const {app, BrowserWindow, Menu, shell}  = require('electron');
const path = require('path');
const {isMac} = require('./utils/processEnvironment');
const appName = app.name;

function sendAction(action, ...args) {
	const win = BrowserWindow.getAllWindows()[0];

	if (isMac) {
		win.restore();
	}

	win.webContents.send(action, ...args);
}

module.exports = function(config) {
	const locale = require(path.join(app.getAppPath(), '/resources/languages/'+config.get('locale')));
	const helpSubmenu = [
		{
			label: `&Facebook`,
			click() {
				shell.openExternal('https://www.facebook.com/TheGoddessInari');
			}
		},
		{
			label: `&Twitter`,
			click() {
				shell.openExternal('https://www.twitter.com/TheGoddessInari');
			}
		},
		{
			label: `&GitHub`,
			click() {
				shell.openExternal('https://www.github.com/TheGoddessInari/hamsket');
			}
		},
		{
			type: 'separator'
		},
		{
			label: '&'+locale['menu.help[1]'],
			click() {
				const buildversion = require('fs').readFileSync( __dirname + '/../BUILDVERSION', 'utf8');
				const body = `
	<!-- Please describe here your issue and steps to reproduce it. -->



	<!-- DON'T REMOVE THE FOLLOWING LINES -->
	-
	> ${app.name} ${app.getVersion()}
	> Electron ${process.versions.electron}
	> ${process.platform} ${process.arch} ${os.release()}
	> ${buildversion}`;

				shell.openExternal(`https://github.com/TheGoddessInari/hamsket/issues/new?body=${encodeURIComponent(body)}`);
			}
		},
		{
			label: `&`+locale['menu.help[2]'],
			click() {
				shell.openExternal('https://gitter.im/TheGoddessInari/hamsket');
			}
		},
		{
			label: `&Tools`,
			submenu: [
				{
					label: `&Clear Cache`,
					click(item, win) {
						win.webContents.session.clearCache(function() {
							win.reload();
						});
					}
				},
				{
					label: `&Clear Local Storage`,
					click(item, win) {
						win.webContents.session.clearStorageData({
							storages: ['localstorage']
						}, function() {
							win.reload();
						});
					}
				}
			]
		},
		{
			type: 'separator'
		},
		/*{
			label: `&`+locale['menu.help[3]'],
			click() {
				shell.openExternal('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=WU75QWS7LH2CA');
			}
		}
		*/
	];

	let tpl = [
		{
			label: '&'+locale['menu.edit[0]'],
			submenu: [
				{
					 role: 'undo'
					,label: locale['menu.edit[1]']
				},
				{
					 role: 'redo'
					,label: locale['menu.edit[2]']
				},
				{
					type: 'separator'
				},
				{
					 role: 'cut'
					,label: locale['menu.edit[3]']
				},
				{
					 role: 'copy'
					,label: locale['menu.edit[4]']
				},
				{
					 role: 'paste'
					,label: locale['menu.edit[5]']
				},
				{
					role: 'pasteandmatchstyle'
				},
				{
					 role: 'selectall'
					,label: locale['menu.edit[6]']
				},
				{
					role: 'delete'
				}
			]
		},
		{
			label: '&'+locale['menu.view[0]'],
			submenu: [
				{
					label: '&'+locale['menu.view[1]'],
					accelerator: 'CmdOrCtrl+R',
					click(item, focusedWindow) {
						if (focusedWindow) focusedWindow.reload();
					}
				},
				{
					label: '&Reload current Service',
					accelerator: 'CmdOrCtrl+Shift+R',
					click() {
						sendAction('reloadCurrentService');
					}
				},
				{
					type: 'separator'
				},
				{
					role: 'zoomin',
					click() {
						sendAction('tabZoomIn');
					}
				},
				{
					role: 'zoomout',
					click() {
						sendAction('tabZoomOut');
					}
				},
				{
					role: 'resetzoom',
					click() {
						sendAction('tabResetZoom');
					}
				},
				{
					label: `&Commands`,
					visible: false,
					submenu: [
						{
							label: `Next Tab`,
							accelerator: 'Ctrl+Tab',
							click() {
								sendAction('tabFocusNext');
							}
						},
						{
							label: `Next Tab`,
							accelerator: 'CmdOrCtrl+PageDown',
							click() {
								sendAction('tabFocusNext');
							}
						},
						{
							label: `Previous Tab`,
							accelerator: 'Ctrl+Shift+Tab',
							click() {
								sendAction('tabFocusPrevious');
							}
						},
						{
							label: `Previous Tab`,
							accelerator: 'CmdOrCtrl+PageUp',
							click() {
								sendAction('tabFocusPrevious');
							}
						},
						{
							label: `Next Tab`,
							accelerator: 'Alt+Right',
							click() {
								sendAction('tabFocusNext');
							}
						},
						{
							label: `Previous Tab`,
							accelerator: 'Alt+Left',
							click() {
								sendAction('tabFocusPrevious');
							}
						},
						{
							label: `Next Tab`,
							accelerator: 'CmdOrCtrl+Shift+}',
							click() {
								sendAction('tabFocusNext');
							}
						},
						{
							label: `Previous Tab`,
							accelerator: 'CmdOrCtrl+Shift+{',
							click() {
								sendAction('tabFocusPrevious');
							}
						},
						{
							label: `Goto Tab 1`,
							accelerator: 'CmdOrCtrl+1',
							click() {
								sendAction('focusTab', 1);
							}
						},
						{
							label: `Goto Tab 2`,
							accelerator: 'CmdOrCtrl+2',
							click() {
								sendAction('focusTab', 2);
							}
						},
						{
							label: `Goto Tab 3`,
							accelerator: 'CmdOrCtrl+3',
							click() {
								sendAction('focusTab', 3);
							}
						},
						{
							label: `Goto Tab 4`,
							accelerator: 'CmdOrCtrl+4',
							click() {
								sendAction('focusTab', 4);
							}
						},
						{
							label: `Goto Tab 5`,
							accelerator: 'CmdOrCtrl+5',
							click() {
								sendAction('focusTab', 5);
							}
						},
						{
							label: `Goto Tab 6`,
							accelerator: 'CmdOrCtrl+6',
							click() {
								sendAction('focusTab', 6);
							}
						},
						{
							label: `Goto Tab 7`,
							accelerator: 'CmdOrCtrl+7',
							click() {
								sendAction('focusTab', 7);
							}
						},
						{
							label: `Goto Tab 8`,
							accelerator: 'CmdOrCtrl+8',
							click() {
								sendAction('focusTab', 8);
							}
						},
						{
							label: `Goto Tab 9`,
							accelerator: 'CmdOrCtrl+9',
							click() {
								sendAction('focusTab', 9);
							}
						},
						{
							label: `Do Not Disturb`,
							accelerator: 'Alt+F1',
							click() {
								sendAction('toggleDoNotDisturb');
							}
						},
						{
							label: `Lock Hamsket`,
							accelerator: 'Alt+F2',
							click() {
								sendAction('lockWindow');
							}
						},
						{
							label: `Go Home`,
							accelerator: 'CmdOrCtrl+,',
							click() {
								sendAction('focusTab', 0);
							}
						}
					]
				}
			]
		},
		{
			label: '&'+locale['menu.window[0]'],
			role: 'window',
			submenu: [
				{
					label: '&'+locale['menu.window[1]'],
					accelerator: 'CmdOrCtrl+M',
					role: 'minimize'
				},
				{
					label: '&'+locale['menu.window[2]'],
					accelerator: 'CmdOrCtrl+W',
					role: 'close'
				},
				{
					type: 'separator'
				},
				{
					 role: 'togglefullscreen'
					,label: locale['menu.view[2]']
				},
				{
					label: '&'+locale['menu.view[3]'],
					accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
					click(item, focusedWindow) {
						if (focusedWindow) focusedWindow.webContents.toggleDevTools();
					}
				}
			]
		},
		{
			label: '&'+locale['menu.help[4]'],
			role: 'help'
		}
	];

	if (isMac) {
		tpl.unshift({
			label: appName,
			submenu: [
				{
					label: locale['preferences[0]'],
					click() {
						sendAction('showPreferences');
					}
				},
				{
					label: locale['menu.help[5]'],
					visible: process.argv.indexOf('--without-update') === -1,
					click(item, win) {
						const webContents = win.webContents;
						const send = webContents.send.bind(win.webContents);
						send('autoUpdater:check-update');
					}
				},
				{
					label: locale['menu.help[6]'],
					click() {
						sendAction('showAbout');
					}
				},
				{
					type: 'separator'
				},
				{
					label: locale['menu.osx[0]'],
					role: 'services',
					submenu: []
				},
				{
					type: 'separator'
				},
				{
					label: locale['menu.osx[1]'],
					accelerator: 'Command+H',
					role: 'hide'
				},
				{
					label: locale['menu.osx[2]'],
					accelerator: 'Command+Alt+H',
					role: 'hideothers'
				},
				{
					label: locale['menu.osx[3]'],
					role: 'unhide'
				},
				{
					type: 'separator'
				},
				{
					label: locale['tray[1]'],
					accelerator: 'CmdOrCtrl+Q',
					click() {
						app.quit();
					}
				}
			]
		});
	} else {
		tpl.unshift({
			label: '&'+locale['menu.file[0]'],
			submenu: [
				{
					label: locale['preferences[0]'],
					click() {
						sendAction('showPreferences');
					}
				},
				{
					type: 'separator'
				},
				{
					label: locale['menu.file[1]'],
					accelerator: 'CmdOrCtrl+Shift+Q',
					click() {
						app.quit();
					}
				}
			]
		});
		helpSubmenu.push({
			type: 'separator'
		});
		helpSubmenu.push({
			label: `&`+locale['menu.help[5]'],
			visible: process.argv.indexOf('--without-update') === -1,
			click(item, win) {
				const webContents = win.webContents;
				const send = webContents.send.bind(win.webContents);
				send('autoUpdater:check-update');
			}
		});
		helpSubmenu.push({
			label: `&`+locale['menu.help[6]'],
			click() {
				sendAction('showAbout');
			}
		});
	}

	tpl[tpl.length - 1].submenu = helpSubmenu;

	return Menu.buildFromTemplate(tpl);
};
