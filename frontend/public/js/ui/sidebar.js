"use strict";

var selectedMenu = require("./../selected_menu"),
    menuBuilder  = require("./../menu_builder");

function Sidebar(sidebarData, loadedModel) {
    this.container = menuBuilder.div("menu");
    this.data = sidebarData;

    this.loadedModel = loadedModel;

    this.lists     = [];
    this.buttons   = [];
    this.dropdowns = [];
    this.sliders   = [];
    this.inputs    = [];
}

Sidebar.prototype = {
    createList: function(data) {
        var that = this;
        var label = menuBuilder.label(data.header);
        if(data.images) {
            var list = selectedMenu.createAvatarButtons("avatar", null, function(key, value) {
                data.callback(that.loadedModel, {name: key}, {avatar: value});
            }, data.images);

            this.container.appendChild(label);
            this.container.appendChild(list);
        }
    },

    createButton: function(data) {
        var that = this;
        var button = menuBuilder.button(data.header, function() {
            data.callback(that.loadedModel);
        });

        this.container.appendChild(button);
    },

    createDropdown: function(data) {
        var label    = menuBuilder.label(data.header);
        var that     = this;
        var dropdown = menuBuilder.select(data.header, function(val, evt) {
            data.callback(that.loadedModel, this.value);
        });

        var defaultIndex = data.setDefault(this.loadedModel, data.values);
        data.values.forEach(function(value, index) {
            //console.log(defaultValue, value);
            var option = menuBuilder.option(value, value);
            if(defaultIndex === index) {
                option.selected = "selected";
            }

            dropdown.appendChild(option);
        });

        this.container.appendChild(dropdown);
    },

    createSlider: function(data) {
        var that = this;

        var range        = data.range(this.loadedModel);
        var defaultValue = data.defaultValue(this.loadedModel);

        var onSlide = function(value) {
            if(data.onSlide) {
                data.onSlide(that.loadedModel, value);
            }
        };

        var callback = function(val) {
            data.callback(that.loadedModel, val);
        };

        var slider = menuBuilder.slider(defaultValue, range[0], range[1], callback, onSlide);

        this.container.appendChild(menuBuilder.label(data.header));
        this.container.appendChild(slider);
    },

    createInput: function(data) {
        var that = this;

        var defaultValue = data.defaultValue(this.loadedModel);
        var onChange     = data.onChange;

        var label = menuBuilder.label(data.header);
        var input = menuBuilder.input("not-used", defaultValue, function(input, iteration) {
            onChange(that.loadedModel, iteration);
        });

        this.container.appendChild(label);
        this.container.appendChild(input);
    },

    createMenu: function(loadedModel) {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.data.forEach(function(data) {
            switch(data.type.toUpperCase()) {
                case "LIST":
                    this.lists.push(data);
                    this.createList(data);
                    break;

                case "BUTTON":
                    this.buttons.push(data);
                    this.createButton(data);
                    break;
                    
                case "DROPDOWN":
                    this.dropdowns.push(data);
                    this.createDropdown(data);
                    break;
                    
                case "SLIDER":
                    this.sliders.push(data);
                    this.createSlider(data);
                    break;
                case "INPUT":
                    this.inputs.push(data);
                    this.createInput(data);
            }
            
        }, this);
    },
};

module.exports = Sidebar;