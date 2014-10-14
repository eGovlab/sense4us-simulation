var rest = require("./server/rest");

rest = rest();

//rest.init();
try
{
	rest.get_node(2, function(json)
	{
		console.log("Returned:", json);
	});
}
catch(err)
{
	console.log(err);
}