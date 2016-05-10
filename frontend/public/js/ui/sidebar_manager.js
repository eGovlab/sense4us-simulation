'use strict';

var menuBuilder = require('./../menu_builder');
var selectedMenu = require('./../selected_menu');
var SelectedMenu = selectedMenu.SelectedMenu;

var Sidebar = require('./sidebar');

function SidebarManager(container) {
    this.sidebars        = [];
    this.sidebarElements = [];

    this.container = container;

    this.sidebarContainer      = menuBuilder.div('menu');
    this.selectedMenuContainer = menuBuilder.div('menu');

    this.container.appendChild(this.sidebarContainer);
    this.container.appendChild(this.selectedMenuContainer);

    this.currentSidebar;
    this.selectedMenu;

    this.selectedData = [];
    this.selected     = {};
}

SidebarManager.prototype = {
    addSidebar: function(sidebar, loadedModel) {
        if(this.gotSidebar(sidebar)) {
            if(this.currentSidebar === sidebar) {
                this.currentSidebar.refresh(loadedModel);
                return;
            }

            this.setSidebar(sidebar, loadedModel);
            return;
        }

        this.sidebars.push(sidebar);
        this.sidebarElements.push(new Sidebar(sidebar, loadedModel));

        this.setSidebar(sidebar, loadedModel);
    },

    setSidebar: function(sidebar, loadedModel) {
        var element = this.gotSidebar(sidebar);
        if(!element) {
            return;
        }

        this.currentSidebar = element;
        this.currentSidebar.createMenu(loadedModel);

        while(this.sidebarContainer.firstChild) {
            this.sidebarContainer.removeChild(this.sidebarContainer.firstChild);
        }

        this.sidebarContainer.appendChild(this.currentSidebar.container);
    },

    gotSidebar: function(sidebar) {
        var index = this.sidebars.indexOf(sidebar);
        return index !== -1 ? this.sidebarElements[index] : false;
    },

    setEnvironment: function(environment) {
        this.environment = environment;
    },

    setLoadedModel: function(loadedModel) {
        this.loadedModel = loadedModel;
    },

    linkModellingFilter: ['type', 'threshold', 'coefficient', 'timelag'],
    linkSimulateFilter:  ['type', 'threshold', 'coefficient', 'timelag'],

    dataModellingFilter: ['timeTable', 'name', 'description'],
    dataSimulateFilter:  ['timeTable'],

    modelModellingFilter: ['name'],
    modelSimulateFilter:  ['maxIterations'],

    getLinkFilter: function() {
        switch(this.environment) {
            case 'modelling':
                return SidebarManager.prototype.linkModellingFilter;
            case 'simulate':
                return SidebarManager.prototype.linkSimulateFilter;
        }
        
    },

    getModelFilter: function() {
        switch(this.environment) {
            case 'modelling':
                return SidebarManager.prototype.modelModellingFilter;
            case 'simulate':
                return SidebarManager.prototype.modelSimulateFilter;
        }
    },

    getDataFilter: function() {
        switch(this.environment) {
            case 'modelling':
                return SidebarManager.prototype.dataModellingFilter;
            case 'simulate':
                return SidebarManager.prototype.dataSimulateFilter;
        }
    },

    getFilter: function(data) {
        if(data.objectId === 'link') {
            return this.getLinkFilter();
        }

        if(data.objectId === 'nodeData' || data.objectId === 'nodeGui') {
            return this.getDataFilter();
        }

        if(data.objectId === 'modelSettings') {
            return this.getModelFilter();
        }

        console.error(data);
        throw new Error('Unrecognized objectId given to getFilter.');
    },

    setSelectedMenu: function() {
        var selectedData       = [],
            previouslySelected = [],
            notSelected        = [],
            stillSelected      = [];

        for(var i = 0; i < arguments.length; i++) {
            var data = arguments[i];
            selectedData.push(data);
        }

        previouslySelected = this.selectedData.filter(function(data) {
            if(selectedData.indexOf(data) === -1) {
                return true;
            }

            stillSelected.push(data);
            return false;
        }, this);

        notSelected = selectedData.filter(function(data) {
            if(stillSelected.indexOf(data) !== -1) {
                return false;
            }

            return true;
        });

        previouslySelected.forEach(function(data) {
            var selectedMenu = this.selected[data.id];

            selectedMenu.removeData(data);
            if(selectedMenu.data.length === 0) {
                delete this.selected[data.id];
            }
        }, this);

        notSelected.forEach(function(data) {
            if(data === undefined) {
                console.log('Current:',        selectedData);
                console.log('Prev:',           previouslySelected);
                console.log('Still selected:', stillSelected);
                console.log('New:',            notSelected);
                console.log('Menus:',          this.selected);
                throw new Error('What the');
            }

            var selectedMenu = this.selected[data.id];
            if(!selectedMenu) {
                this.selected[data.id] = new SelectedMenu(this.loadedModel);
                selectedMenu = this.selected[data.id];
                this.selectedMenuContainer.appendChild(selectedMenu.container);
            }

            selectedMenu.addData(this.getFilter(data), data);
        }, this);

        var updated = [];
        stillSelected.forEach(function(data) {
            if(updated.indexOf(data.id) !== -1) {
                return;
            }

            var selectedMenu = this.selected[data.id];

            selectedMenu.loopData(function(dataObj) {
                dataObj.updateFilter(this.getFilter(dataObj.data));
            }, this);

            updated.push(data.id);
        }, this);

        this.selectedData = selectedData;
    }
};

module.exports = SidebarManager;