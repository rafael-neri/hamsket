// This file contains utility functions/values derived from nodejs.process

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isWindows = process.platform === 'win32';

module.exports = {isMac, isLinux, isWindows};
