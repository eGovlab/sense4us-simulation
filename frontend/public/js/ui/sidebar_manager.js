"use strict";

var menuBuilder = require("./../menu_builder");

function SidebarManager(container) {
    this.sidebars = [];

    this.container = container;

    this.sidebarContainer      = menuBuilder.div("menu");
    this.selectedMenuContainer = menuBuilder.div("menu");

    this.container.appendChild(this.sidebarContainer);
    this.container.appendChild(this.selectedMenuContainer);

    this.currentSidebar;
    this.selectedMenu;
}

SidebarManager.prototype = {
    addSidebar: function(sidebar, loadedModel) {
        if(this.gotSidebar(sidebar)) {
            if(this.currentSidebar === sidebar) {
                return;
            }

            this.setSidebar(sidebar);
            return;
        }

        this.sidebars.push(sidebar);
        this.setSidebar(sidebar, loadedModel);
    },

    setSidebar: function(sidebar, loadedModel) {
        if(!this.gotSidebar(sidebar)) {
            return;
        }

        this.currentSidebar = sidebar;
        sidebar.createMenu(loadedModel);

        while(this.sidebarContainer.firstChild) {
            this.sidebarContainer.removeChild(this.sidebarContainer.firstChild);
        }

        this.sidebarContainer.appendChild(this.currentSidebar.container);
    },

    setSelectedMenu: function(selected) {
        console.log(this.selected, selected);
        if(this.selected === selected) {
            return;
        }

        while(this.selectedMenuContainer.firstChild) {
            this.selectedMenuContainer.removeChild(this.selectedMenuContainer.firstChild);
        }

        this.selected = selected;
    },

    gotSidebar: function(sidebar) {
        var index = this.sidebars.indexOf(sidebar);
        return index !== -1 ? this.sidebars[index] : false;
    }
};

module.exports = SidebarManager;