'use strict';

function validateDomain(domain) {
    var check = domain.match(/^(http[s]?):\/\/([a-zA-Z0-9\.]+)\/?.*$|^(http[s]?):\/\/([a-zA-Z0-9\.]+):(\d+)\/?.*$/);

    if(check === null) {
        console.error(domain);
        throw new Error('Domain of invalid structure!');
    }

    return domain;
}

function sendData(domain, path, jsonData, callback, method) {
    if(typeof domain !== 'string') {
        throw new Error('sendData got invalid type for domain or port!');
    }

    if(jsonData && typeof jsonData === 'function') {
        if(callback && typeof callback === 'string') {
            method = callback;
        }

        callback = jsonData;
        jsonData = null;
    }

    if(jsonData) {
        if(typeof jsonData !== 'object') {
            throw new Error('Expected JS object as jsonData.');
        }

        jsonData = JSON.stringify(jsonData, null, 4);
    }

    var httpRequest = new XMLHttpRequest(),
        requestPath;

    validateDomain(domain);

    if (!httpRequest) {
        console.error('Giving up :( Cannot create an XMLHTTP instance');
        return false;
    }

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
            try {
                if(httpRequest.status === 0) {
                    throw new Error('Connection refused.');
                }

                var rt    = JSON.parse(httpRequest.responseText);
                rt.status = httpRequest.status;

                try {
                    if(callback) {
                        callback(rt);
                    } else {
                        console.warn('No callback was sent with the query against ' + path);
                    }
                } catch(err) {
                    console.warn(httpRequest);
                    callback(rt, err);
                }
                
                
            } catch(err) {
                console.warn(httpRequest);
                callback(undefined, err);
            }
        }
    };

    if (!method) {
        if (jsonData && typeof jsonData !== 'function') {
            method = 'POST';
        } else {
            method = 'GET';
        }
    }

    if(domain.charAt(domain.length - 1) === '/') {
        domain = domain.slice(0, domain.length - 1);
    }

    if(path.charAt(0) !== '/') {
        path = '/' + path;
    }

    httpRequest.open(method, domain + path);
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    if (jsonData && typeof jsonData !== 'function') {
        httpRequest.send(jsonData);
    } else {
        httpRequest.send();
    }
}

module.exports = sendData;
