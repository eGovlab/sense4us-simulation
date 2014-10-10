module.exports = function(c_name)
{
	if(typeof c_name !== "string")
		throw "exception, constructor(p1): Expected string.";

	var class_name = c_name;
	var that = {
		throw: function(string, funcname)
		{
			if(funcname !== undefined && typeof funcname === "string")
				throw class_name + ", " + funcname + ": " + string;

			throw class_name + ": " + string;
		}
	};

	return that;
}