"use strict";

var selectedMenu = require("./../selected_menu"),
    menuBuilder  = require("./../menu_builder");

function Sidebar(sidebarData) {
    this.container = menuBuilder.div("menu");
    this.data = sidebarData;
}

Sidebar.prototype = {
    createMenu: function(loadedModel) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.data.forEach(function(data) {
            switch(data) {
                case "LIST":
                    this.lists.push(data);
                    break;
            }
            var label = menuBuilder.label(data.header);
            if(data.type.toUpperCase() === "LIST" && data.images) {
                console.log(data);

                var list = selectedMenu.createAvatarButtons("avatar", null, function(key, value) {
                    data.callback(loadedModel, {name: key}, {avatar: value});
                }, data.images);
                this.container.appendChild(label);
                this.container.appendChild(list);
            }
        }, this);
    },
};

module.exports = Sidebar;