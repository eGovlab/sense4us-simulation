function sendData(jsonData) {
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      console.log('Giving up :( Cannot create an XMLHTTP instance');
      return false;
    }

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
          if (httpRequest.status === 200) {
            console.log(httpRequest.responseText);
          } else {
            console.log('There was a problem with the request.');
          }
        }
    };

    httpRequest.open('POST', 'http://127.0.0.1:3001/derp');
    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	var params = generateParams(jsonData);
    httpRequest.send(params);
};

function generateParams(jsonData) {
	var params = null;
	
	for (var key in jsonData) {
		if (jsonData.hasOwnProperty(key)) {
			var value = jsonData[key];
			params = (params ? params + '&' : '') + key + '=' + encodeURIComponent(value);
		}
	}
	
	return params;
}

module.exports = sendData;