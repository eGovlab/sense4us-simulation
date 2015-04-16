# Sense4us Simulation

## When developing
1. ```$ npm start```
This will run npm install and then start the application, it will also browserify + uglify the client side javascript
2. ```$ npm watch```
This will run watcherify on the public javascripts, which means the javascript will be re-compiled whenever main.js or a file included in main.js is edited. It will compile using browserify in debug mode, which means you get a sourcemap in the bundle.js, which means chrome debugging will show you the errors in separate files instead of in the bundle.js.

## When deploying
1. Setup some cool server or something
2. $ npm start
	This will run npm install and then start the application, it will also browserify + uglify the client side javascript
	1. $ npm browserify
		This will run browserify on the public javascript, and then uglify it. This is needed if you have changed the client side javascript but don't want to restart the server.

## To generate the code documentation:
1. Install YUIDoc (http://yui.github.io/yuidoc/)
	1. For the lazy: $ npm install -g yuidocjs
2. Go to the root of the project and execute cmdline: "yuidoc ."

## Made by:
Jona Ekenberg, Robin Swenson & Anton Haughey
@ eGovlab - http://www.egovlab.eu