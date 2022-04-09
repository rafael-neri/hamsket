/**
 * This file is loaded in the service web views to provide a Hamsket API.
 */

const { ipcRenderer } = require('electron');

/**
 * Make the Hamsket API available via a global "hamsket" variable.
 *
 * @type {{}}
 */
window.hamsket = {};

window.hamsket.locale = ipcRenderer.sendSync('getConfig').locale;

/**
 * Sets the unread count of the tab.
 *
 * @param {*} count	The unread count
 */
window.hamsket.setUnreadCount = function(count) {
	ipcRenderer.sendToHost(
		'hamsket.setUnreadCount',
		window.hamsket.parseIntOrZero(count)
	);
};

/**
 * Update the badge of the tab.
 * @param {*} direct
 * @param {*} indirect
 */
window.hamsket.updateBadge = function(direct, indirect = 0) {
	ipcRenderer.sendToHost(
		'hamsket.updateBadge',
		window.hamsket.parseIntOrZero(direct),
		window.hamsket.parseIntOrZero(indirect)
	);
};

/**
 * Clears the unread count.
 */
window.hamsket.clearUnreadCount = function() {
	ipcRenderer.sendToHost('hamsket.clearUnreadCount');
};

window.hamsket.parseIntOrZero = function (text) {
	if (text === undefined || text === null) {
		return 0;
	}

	// Parse number to integer
	// This will correct errors that recipes may introduce, e.g.
	// by sending a String instead of an integer
	const parsedNumber = Number.parseInt(text.toString(), 10);
	const adjustedNumber = Number.isNaN(parsedNumber) ? 0 : parsedNumber;
	// Handle negative value
	return Math.max(adjustedNumber, 0);
};

window.hamsket.isInViewport = function(node) {
    const rect = node.getBoundingClientRect();

    return rect.bottom > 0 &&
        rect.right > 0 &&
        rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
        rect.top < (window.innerHeight || document.documentElement.clientHeight);
};


/**
 * Override to add notification click event to display Hamsket window and activate service tab
 */
const NativeNotification = Notification;
Notification = function(title, options) {
	const notification = new NativeNotification(title, options);

	notification.addEventListener('click', function() {
		ipcRenderer.sendToHost('hamsket.showWindowAndActivateTab');
	});

	return notification;
};

Notification.prototype = NativeNotification.prototype;
Notification.permission = NativeNotification.permission;
Notification.requestPermission = NativeNotification.requestPermission.bind(Notification);

window.close = function() { location.href = location.origin; };

// Electron really screwed up here. atob and btoa are broken in recent versions, so override them.
window.atob = data => Buffer.from(data, "base64").toString("latin1");
window.btoa = data => Buffer.from(data, "latin1").toString("base64");
