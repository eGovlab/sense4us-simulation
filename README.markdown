# Sense4us Simulation

## Running dead server
1. ```cp config.json.template config.json```
2. ```vim config.json```
    Change relevant fields like:
        ROOT into your root directory.
        The SENSE4US property into whichever server you want to use.

## Compiling
1. ```grunt```
   To build the tool.
2. ```grunt watch```
   To build the tool on file change.

## If you want to run a server which serves the tool
1. ```node bin/init.js```

## To generate the code documentation
1. ```grunt jsdoc```
   Default target is docs.

## Made by
Jona Ekenberg, Robin Swenson & Anton Haughey
@ eGovlab - http://www.egovlab.eu
