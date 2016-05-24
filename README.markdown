# Sense4us Simulation

## First compilation rundown
1. ```npm install```
2. ```cp config.json.template config.json```
3. Change the ROOT property to your root dir.
4. ```grunt```

## Running dead server
1. ```vim config.json```
    Change the SENSE4US property into whichever server you want to use.
3. ```node bin/init.js```

## Compiling
1. ```grunt```
   To build the tool.
2. ```grunt watch```
   To build the tool on file change.

## To generate the code documentation
1. ```grunt jsdoc```
   Default target is docs.

## Made by
Jona Ekenberg, Robin Swenson & Anton Haughey
@ eGovlab - http://www.egovlab.eu
