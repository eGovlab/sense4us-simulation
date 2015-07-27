'use strict';

function NetworkLayer() {
    if (!(this instanceof NetworkLayer)) {
        throw new Error('Calling NetworkLayer as a generic method.');
    }
}

NetworkLayer.prototype = {
    sendData: function(path, jsonData, callback, method, domain, port) {
        var httpRequest = new XMLHttpRequest();

        var requestPath;

        domain = this.breakOutDomain(path);
        if (typeof domain === 'string') {
            if (!this.requestString) {
                throw new Error('Gave entrypoint to sendData and no domain is set. Use .setDomain or give full domain to sendData.');
            }

            requestPath = this.requestString + domain;
        } else {
            var requestString = domain.protocol + '://' + domain.domain;
            if ((domain.protocol !== 'http' || domain.port !== 80) && (domain.protocol !== 'https' || domain.port !== 443)) {
                requestString += ':' + domain.port;
            }

            requestPath = requestString + domain.path;
        }

        if (!httpRequest) {
          console.log('Giving up :( Cannot create an XMLHTTP instance');
          return false;
        }

        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4) {
                var rt = JSON.parse(httpRequest.responseText);
                console.log(rt);
                
                if (httpRequest.status === 200) {
                    if (callback) {
                        callback(rt);
                    } else {
                        console.log('No callback was sent with the query against ' + path);
                    }

                } else {
                    callback(rt, {status: httpRequest.status});
                }
            }
        };

        if (!method) {
            if (jsonData) {
                method = 'POST';
            } else {
                method = 'GET';
            }
        }

        var protocol = this.protocol,
            domain   = this.domain,
            port     = this.port,
            path     = path;

        httpRequest.open(method, requestPath);
        httpRequest.setRequestHeader('Content-Type', 'application/json');
        //var params = this.generateParams(jsonData);
        if (jsonData) {
            httpRequest.send(JSON.stringify(jsonData, null, 4));
        } else {
            httpRequest.send();
        }
    },

    getData: function(path, callback, domain, port) {
        this.sendData(path, false, callback, 'GET', domain, port);
    },

    postData: function(path, jsonData, callback, domain, port) {
        this.sendData(path, jsonData, callback, 'POST', domain, port);  
    },

    putData: function(path, jsonData, callback, domain, port) {
        this.sendData(path, jsonData, callback, 'PATCH', domain, port);
    },

    deleteData: function(path, jsonData, callback, domain, port) {
        this.sendData(path, jsonData, callback, 'DELETE', domain, port);
    },

    breakOutDomain: function(givenDomain) {
        var pathCheck = givenDomain.match(/^(http[s]?)?(:\/\/)?[\w\.]*\/(.*)$/);
        if (pathCheck !== null) {
            pathCheck = pathCheck[3];
        } else {
            pathCheck = '';
        }

        var check = givenDomain.match(/^(http[s]?):\/\/([a-zA-Z0-9\.]+)\/?.*$|^(http[s]?):\/\/([a-zA-Z0-9\.]+):(\d+)\/?.*$|^([a-zA-Z0-9\.]+):(\d+)\/?.*$|^([a-zA-Z0-9\.]+)\/?.*$/);
        if (check === null && !pathCheck) {
            throw new Error('breakOutDomain couldn\'t match given domain: ' + givenDomain);
        } else if (check === null && pathCheck) {
            return pathCheck;
        }

        check = check.filter(function(ele, index) {
            if (index === 0) {
                return false;
            }

            return ele;
        });

        var protocol = 'http',
            domain   = 'localhost',
            port     = 80,
            path     = '/' + pathCheck;

        switch(check.length) {
            case 1:
                domain = check[0];
                break;
            case 2:
                check[0] = check[0].toLowerCase();
                if (['http', 'https'].indexOf(check[0]) > -1) {
                    protocol = check[0];
                    domain   = check[1];
                    if (protocol === 'https') {
                        port = 443;
                    }
                } else {
                    domain   = check[0];
                    port     = check[1];
                }
                break;
            case 3:
                protocol = check[0];
                domain   = check[1];
                port     = check[2];
                break;
        }

        return {
            protocol: protocol,
            domain:   domain,
            port:     port,
            path:     path
        };
    },

    setDomain: function(givenDomain) {
        var domain = this.breakOutDomain(givenDomain);

        var requestString = domain.protocol + '://' + domain.domain;
        if ((domain.protocol !== 'http' || domain.port !== 80) && (domain.protocol !== 'https' || domain.port !== 443)) {
            requestString += ':' + domain.port;
        }

        if (domain.path.charAt(domain.path.length - 1) !== '/') {
            domain.path = domain.path + '/';
        }

        requestString += domain.path;

        this.protocol      = domain.protocol;
        this.domain        = domain.domain;
        this.port          = domain.port;
        this.requestString = requestString;
    },

    generateParams: function(jsonData) {
        var params = null;
        for (var key in jsonData) {
            if (jsonData.hasOwnProperty(key)) {
                var value = jsonData[key];
                params = (params ? params + '&' : '') + key + '=' + encodeURIComponent(value);
            }
        }
        
        return params;
    }
};

module.exports = new NetworkLayer();