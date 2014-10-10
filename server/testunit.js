module.exports = function()
{
	var ex = require("./exception.js");
	ex = ex("testunit");

	var added_tests = {};

	var add_test = function(identifier, callback)
	{
		if(typeof identifier !== "string")
			ex.throw("Identifier is not a string", "add_test");

		if(typeof callback !== "function")
			ex.throw("Callback is not a function", "add_test");

		if(added_tests[identifier] !== undefined)
			ex.throw("Identifier already contains a callback.", "add_test");

		added_tests[identifier] = callback;
	}

	var testing = function(objects, tests, return_failure, exceptions)
	{
		if(return_failure !== undefined && typeof return_failure !== "boolean")
			ex.throw("Expected boolean", "testing(p3)");

		tests.forEach(function(element)
		{
			if(added_tests[element] === undefined)
			{
				ex.throw("Test " + element + " does not exist.", "testing");
			}
		});

		var invalid = [];
		objects.forEach(function(object)
		{
			tests.forEach(function(test)
			{
				var n = added_tests[test](object);
				if(typeof n === "boolean" || typeof n === "object")
				{
					if(return_failure !== "undefined" && (n === false || typeof n === "object"))
						invalid.push(["Test " + test + " failed.", n, object]);
					else if(exceptions)
						ex.throw("Test " + test + " failed.", "testing");
					else
						return false;
				}
				else
					ex.throw("Test " + test + " returned a strange data type.", "testing");
			});
		});

		if(return_failure === true)
			return invalid;

		return true;
	}

	add_test("is_string", function(object)
	{
		if(typeof object !== "string")
			return false;

		return true;
	});

	add_test("is_boolean", function(object)
	{
		if(typeof object !== "boolean")
			return false;

		return true;
	});

	add_test("is_true", function(object)
	{
		if(!object)
			return false;

		return true;
	});

	add_test("is_module", function(object)
	{
		try
		{
			var n = require("./"+object);
		}
		catch(err)
		{
			return false;
		}

		return true;
	});

	add_test("is_false", function(object)
	{
		if(object)
			return false;

		return true;
	});

	add_test("is_object", function(object)
	{
		if(typeof object !== "object")
			return false;

		return true;
	});

	add_test("is_function", function(object)
	{
		if(typeof object !== "function")
			return false;

		return true;
	});

	add_test("in_array", function(object)
	{
		if(object.length !== 2)
			return false;

		if(object[0].indexOf(object[1]) === -1)
			return false;

		return true;
	});

	add_test("not_in_array", function(object)
	{
		if(object.length !== 2)
			return false;

		if(object[0].indexOf(object[1]) !== -1)
			return false;

		return true;
	});

	add_test("is_empty", function(object)
	{
		if(object.length > 0)
			return false;

		return true;
	});

	add_test("is_not_empty", function(object)
	{
		if(object.length === 0)
			return false;

		return true;
	});

	add_test("is_null", function()
	{
		if(object !== null)
			return false;

		return true;	
	});

	add_test("is_not_null", function(object)
	{
		if(object === null)
			return false;

		return true;
	});

	add_test("is_not_undefined", function(object)
	{
		if(object === undefined)
			return false;

		return true;
	});

	var that = {
		add_test: function(identifier, callback)
		{
			add_test(identifier, callback);
		},

		get_errors: function(array_of_tests)
		{
			var errors = [];
			array_of_tests.forEach(function(element)
			{
				if(typeof element !== "object" || element.length !== 2)
					ex.throw("Given array of objects and tests is of wrong syntax.", "get_errors");

				var n = testing(element[0], element[1], true);
				if(n.length > 0)
					errors = errors.concat(n);
			});

			return errors;
		},

		test_with_exceptions: function()
		{

		},

		test_objects: function(objects, tests)
		{
			return testing(objects, tests)
		}
	};

	return that;
}