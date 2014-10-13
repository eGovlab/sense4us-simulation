var rest = require("./server/rest");

rest = rest();

//rest.init();
try
{
	rest.request("GET", "/simulator/nodes/crud/2", function(json)
	{
		console.log(json);
	});
}
catch(err)
{
	console.log(err);
}