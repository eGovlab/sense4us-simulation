(function() {
    "use strict";

    window.sense4us = window.sense4us || {}; 

    function Element(){}
    Element.prototype = {
        appendTo: function(container) {
            container.appendChild(this.root);
        },

        appendChild: function(container) {
            this.root.appendChild(container);
        },

        createButton: function() {
            if(!this.buttons)
                this.buttons = [];

            var b = new Button();
            this.buttons.push(b);

            return b;
        },

        deleteAllButtons: function() {
            if(!this.buttons)
                return;

            this.buttons.forEach(function(button) {
                button.removeEventListener();
            });
        }
    };

    function Button() {
        this.root = document.createElement("div");

        this.root.style.width  = "100%";
        this.root.style.height = "100%";

        this.root.style.cursor = "pointer";
    }

    Button.prototype = {
        removeEventListener: function(){},
        __proto__: Element.prototype
    };

    function Menu() {
        this.root = document.createElement("div");
    }

    Menu.prototype = {
        __proto__: Element.prototype
    };

    function Sidebar() {
        this.root = document.createElement("div");
        this.tabs = [];

        this.root.style.height = "100%";
        this.root.style.display = "inline-block";


        this.menu = new Menu();

        this.menu.appendTo(this.root);
        this.menu.root.style.float  = "left";

        this.menu.root.style.width  = "200px";
        this.menu.root.style.height = "100%";
        this.menu.root.style["background-color"] = "#422";

        this.foldButton = this.createButton();
        this.foldButton.appendTo(this.root);

        this.foldButton.root.style["background-color"] = "#202020";
        this.foldButton.root.style.width  = "20px";
        this.foldButton.root.style.height = "20px";

        this.foldButton.root.style.float = "right";

        var clear = document.createElement("div");
        clear.style.clear = "both";
        this.root.appendChild(clear);
    }

    Sidebar.prototype = {
        __proto__: Element.prototype
    };

    window.sense4us.Sidebar = Sidebar;
}());