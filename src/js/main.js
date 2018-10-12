// Javascript that is inline. Should be used for anything that needs to be immediate
window.$ = require('./vendor/jquery.js');

var scroll = require('./modules/scroll.js');
var share = require('./modules/share.js');
var toggle = require('./modules/toggle.js');

scroll.init();
share.init();
toggle.init();