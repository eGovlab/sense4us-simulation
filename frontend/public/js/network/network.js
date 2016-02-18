'use strict';

function validateDomain(domain) {
    var check = domain.match(/^(http[s]?):\/\/([a-zA-Z0-9\.]+)\/?.*$|^(http[s]?):\/\/([a-zA-Z0-9\.]+):(\d+)\/?.*$/);

    if(check === null) {
        console.log(domain);
        throw new Error('Domain of invalid structure!');
    }

    return domain;
}

function sendData(domain, port, path, jsonData, callback, method) {
    if(typeof domain !== 'string' || typeof port !== 'number') {
        throw new Error("sendData got invalid type for domain or port!");
    }

    if(jsonData && typeof jsonData === "function") {
        if(callback && typeof callback === "string") {
            method = callback;
        }

        callback = jsonData;
    }

    var httpRequest = new XMLHttpRequest(),
        requestPath;

    validateDomain(domain);

    if (!httpRequest) {
        console.log('Giving up :( Cannot create an XMLHTTP instance');
        return false;
    }

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
            try {
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
            } catch(err) {
                callback(undefined, err);
            }
        }
    };

    if (!method) {
        if (jsonData && typeof jsonData !== "function") {
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

    httpRequest.open(method, domain + ':' + port + path);
    httpRequest.setRequestHeader('Content-Type', 'application/json');
    if (jsonData && typeof jsonData !== 'function') {
        httpRequest.send(JSON.stringify(jsonData, null, 4));
    } else {
        httpRequest.send();
    }
}

/*function getData(domain, port, path, callback) {
    this.sendData(domain, port, path, false, callback, 'GET');
}

function postData(domain, port, path, jsonData, callback) {
    this.sendData(domain, port, path, jsonData, callback, 'POST');  
}

function putData(domain, port, path, jsonData, callback) {
    this.sendData(domain, port, path, jsonData, callback, 'PATCH');
}

function deleteData(domain, port, path, jsonData, callback) {
    this.sendData(domain, port, path, jsonData, callback, 'DELETE');
}*/

module.exports = sendData;