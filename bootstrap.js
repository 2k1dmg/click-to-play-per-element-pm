// Template based on Private Tab by Infocatcher
// https://addons.mozilla.org/firefox/addon/private-tab

//'use strict';

const WINDOW_LOADED = -1;
const WINDOW_CLOSED = -2;

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');

function install(params, reason) {
}
function uninstall(params, reason) {
}
function startup(params, reason) {
	clickToPlayPerElement.init(reason);
}
function shutdown(params, reason) {
	clickToPlayPerElement.destroy(reason);
}

let clickToPlayPerElement = {
	initialized: false,
	init: function(reason) {
		if(this.initialized)
			return;
		this.initialized = true;

		this.loadStyles();

		for(let window in this.windows)
			this.initWindow(window, reason);
		Services.ww.registerNotification(this);
	},
	destroy: function(reason) {
		if(!this.initialized)
			return;
		this.initialized = false;

		this.unloadStyles();

		for(let window in this.windows)
			this.destroyWindow(window, reason);
		Services.ww.unregisterNotification(this);
	},

	observe: function(subject, topic, data) {
		switch(topic) {
			case 'domwindowopened':
				subject.addEventListener('load', this, false);
				break;
			case 'domwindowclosed':
				this.destroyWindow(subject, WINDOW_CLOSED);
				break;
		}
	},
	handleEvent: function(event) {
		switch(event.type) {
			case 'load':              this.loadHandler(event);                  break;
		}
	},

	loadHandler: function(event) {
		let window = event.originalTarget.defaultView;
		window.removeEventListener('load', this, false);
		this.initWindow(window, WINDOW_LOADED);
	},
	windowClosingHandler: function(event) {
		let window = event.currentTarget;
		this.destroyWindowClosingHandler(window);
	},
	destroyWindowClosingHandler: function(window) {
		let {gPluginHandler} = window;

		if(gPluginHandler && gPluginHandler._overlayClickListener &&
				gPluginHandler._overlayClickListener.handleEvent) {

			let src = gPluginHandler._overlayClickListener.handleEvent.toString();
			if(src.indexOf('playPlugin') == -1)
				return;
			let res = src.replace(this.ctppe, this.noctppe);
			window.eval('gPluginHandler._overlayClickListener.handleEvent = ' + res);
		}
	},

	initWindow: function(window, reason) {
		if(reason == WINDOW_LOADED && !this.isTargetWindow(window)) {
			return;
		}
		let {gPluginHandler} = window;

		if(gPluginHandler && gPluginHandler._overlayClickListener &&
				gPluginHandler._overlayClickListener.handleEvent) {

			let src = gPluginHandler._overlayClickListener.handleEvent.toString();
			if(src.indexOf('playPlugin') != -1)
				return;
			let res = src.replace(this.noctppe, this.ctppe);
			window.eval('gPluginHandler._overlayClickListener.handleEvent = ' + res);
		}
	},
	destroyWindow: function(window, reason) {
		window.removeEventListener('load', this, false);
		if(reason == WINDOW_CLOSED && !this.isTargetWindow(window)) {
			return;
		}
		if(reason != WINDOW_CLOSED) {
			this.destroyWindowClosingHandler(window);
		}
	},

	get noctppe() {
		return 'gPluginHandler._showClickToPlayNotification(browser, plugin);';
	},
	get ctppe() {
		return [
			'if (gPluginHandler.canActivatePlugin(objLoadingContent)) {',
			'  objLoadingContent.playPlugin();',
			'} else {',
			'  gPluginHandler._showClickToPlayNotification(browser, plugin);',
			'}'
		].join('');
	},

	get windows() {
		let ws = Services.wm.getEnumerator('navigator:browser');
		while(ws.hasMoreElements()) {
			let window = ws.getNext();
			yield window;
		}
	},
	isTargetWindow: function(window) {
		let loc = window.location.href;
		return loc == 'chrome://browser/content/browser.xul';
	},

	_stylesLoaded: false,
	loadStyles: function() {
		if(this._stylesLoaded)
			return;
		this._stylesLoaded = true;
		let sss = this.sss;
		let cssURI = this.cssURI = this.makeCSSURI();
		if(!sss.sheetRegistered(cssURI, sss.USER_SHEET))
			sss.loadAndRegisterSheet(cssURI, sss.USER_SHEET);
	},
	unloadStyles: function() {
		if(!this._stylesLoaded)
			return;
		this._stylesLoaded = false;
		let sss = this.sss;
		if(sss.sheetRegistered(this.cssURI, sss.USER_SHEET))
			sss.unregisterSheet(this.cssURI, sss.USER_SHEET);
	},
	get sss() {
		delete this.sss;
		return this.sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
			.getService(Components.interfaces.nsIStyleSheetService);
	},
	makeCSSURI: function() {
		return Services.io.newURI("chrome://2k1dmgclicktoplayperelementpm/content/lightweight.css", null, null);
	}
};
