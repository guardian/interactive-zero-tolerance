// Javascript that is inline. Should be used for anything that needs to be immediate
window.$ = require('./vendor/jquery.js');

var scroll = require('./modules/scroll.js');
var share = require('./modules/share.js');

scroll.init();
share.init();