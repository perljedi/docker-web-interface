var json = JSON;

window.stable_stringify = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};


function createUUID() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}


function ReconnectingWebSocket(url, protocols) {
		protocols = protocols || [];
	    
		// These can be altered by calling code.
		this.debug = false;
		this.reconnectInterval = 1000;
		this.timeoutInterval = 2000;
	    
		var self = this;
		var ws;
		var forcedClose = false;
		var timedOut = false;
		
		this.url = url;
		this.protocols = protocols;
		this.readyState = WebSocket.CONNECTING;
		this.URL = url; // Public API
	    
		this.onopen = function(event) {
		};
	    
		this.onclose = function(event) {
		};
	    
		this.onconnecting = function(event) {
		};
	    
		this.onmessage = function(event) {
		};
	    
		this.onerror = function(event) {
		};
	    
		function connect(reconnectAttempt) {
		    ws = new WebSocket(url, protocols);
		    
		    self.onconnecting();
		    if (self.debug || ReconnectingWebSocket.debugAll) {
			console.debug('ReconnectingWebSocket', 'attempt-connect', url);
		    }
		    
		    var localWs = ws;
		    var timeout = setTimeout(function() {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'connection-timeout', url);
			}
			timedOut = true;
			localWs.close();
			timedOut = false;
		    }, self.timeoutInterval);
		    
		    ws.onopen = function(event) {
			clearTimeout(timeout);
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'onopen', url);
			}
			self.readyState = WebSocket.OPEN;
			reconnectAttempt = false;
			self.onopen(event);
		    };
		    
		    ws.onclose = function(event) {
			clearTimeout(timeout);
			ws = null;
			if (forcedClose) {
			    self.readyState = WebSocket.CLOSED;
			    self.onclose(event);
			} else {
			    self.readyState = WebSocket.CONNECTING;
			    self.onconnecting();
			    if (!reconnectAttempt && !timedOut) {
				if (self.debug || ReconnectingWebSocket.debugAll) {
				    console.debug('ReconnectingWebSocket', 'onclose', url);
				}
				self.onclose(event);
			    }
			    setTimeout(function() {
				connect(true);
			    }, self.reconnectInterval);
			}
		    };
		    ws.onmessage = function(event) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'onmessage', url, event.data);
			}
			    self.onmessage(event);
		    };
		    ws.onerror = function(event) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'onerror', url, event);
			}
			self.onerror(event);
		    };
		}
		connect(url);
	    
		this.send = function(data) {
		    if (ws) {
			if (self.debug || ReconnectingWebSocket.debugAll) {
			    console.debug('ReconnectingWebSocket', 'send', url, data);
			}
			return ws.send(data);
		    } else {
			throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
		    }
		};
	    
		this.close = function() {
		    forcedClose = true;
		    if (ws) {
			ws.close();
		    }
		};
	    
		/**
		 * Additional public API method to refresh the connection if still open (close, re-open).
		 * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
		 */
		this.refresh = function() {
		    if (ws) {
			ws.close();
		    }
		};
	    }
	    
	    /**
	     * Setting this to true is the equivalent of setting all instances of ReconnectingWebSocket.debug to true.
	     */
	    ReconnectingWebSocket.debugAll = false;