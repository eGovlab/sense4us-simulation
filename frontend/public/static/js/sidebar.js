(function() {
    "use strict";

    window.sense4us = window.sense4us || {}; 

    var tweening = {
        easeInQuad: function(t, b, c, d) {
            t /= d;
            return c * t * t + b;
        },

        easeOutCirc: function(t, b, c, d) {
            t /= d;
            t--;
            return c * Math.sqrt(1 - t*t) + b;
        }
    };

    function Tween(tween, width, duration, callback, onEnd) {
        if(!tweening[tween])
            throw new Error("Trying tweening with non existent tween");

        var tweenFunc = tweening[tween];
        var FPS = 1000 / 60;

        var startTime  = Date.now();
        var value      = 0;

        this.stopTween = false;
        var that       = this;

        var recursive = function() {
            if(that.stopTween) {
                that.isDone = true;
                return;
            }

            var timeSinceStart = Date.now() - startTime;
            callback(tweenFunc(timeSinceStart, 0, width, duration));

            if(timeSinceStart > duration) {
                that.isDone = true;
                callback(width);
                onEnd(width);
                return;
            }

            setTimeout(recursive, FPS);
        };

        recursive();
    }

    Tween.prototype = {
        stop: function() {
            this.stopTween = true;
        }
    };

    function easeOutCirc(width, duration, callback, onEnd) {
        return new Tween("easeOutCirc", width, duration, callback, onEnd);
    }

    function Element(){}
    Element.prototype = {
        appendTo: function(container) {
            container.appendChild(this.root);
        },

        appendChild: function(container) {
            if(container.root)
                return this.root.appendChild(container.root);

            this.root.appendChild(container);
        },

        createFoldButton: function() {
            if(!this.buttons)
                this.buttons = [];

            var b = new FoldButton();
            this.buttons.push(b);

            return b;
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
        },

        setWidth: function(width) {
            if(typeof width === "string")
                this.root.style.width = width;

            else if(typeof width === "number")
                this.root.style.width = width + "px";

            this.width = parseInt(width);
        },

        getWidth: function() {
            return this.width;
        },

        setLeft: function(left) {
            if(typeof left === "string")
                this.root.style.left = left;

            else if(typeof left === "number")
                this.root.style.left = left + "px";

            this.left = parseInt(left);
        },

        getLeft: function() {
            return this.left;
        }
    };

    function Button() {
        this.events = {};
        this.root = document.createElement("div");

        this.root.style.width  = "100%";
        this.root.style.height = "100%";

        this.root.style.cursor = "pointer";
    }

    Button.prototype = {
        setLabel: function(label) {
            this.label = label;
            this.root.innerHTML = label;
        },

        getLabel: function() {
            return this.label;
        },

        addEventListener: function(evt, cb) {
            if(!this.events[evt])
                this.events[evt] = [];

            this.events[evt].push(cb);
            this.root.addEventListener(evt, cb);
        },

        removeEventListener: function(evt, cb) {
            var index = this.events[evt].indexOf(cb);
            if(index === -1)
                return;

            this.events[evt].splice(index, 1);
            this.root.removeEventListener(evt, cb);
        },

        removeAllEventListeners: function() {
            if(!this.events)
                return;

            Object.keys(this.events).forEach(function(evt) {
                var cb = this.events[evt];
                this.removeEventListener(evt, cb);
            }, this);
        },
        __proto__: Element.prototype
    };

    function MenuChild() {
        this.root = document.createElement("div");

        this.root.style.width    = "0px";
        this.root.style.overflow = "hidden";
        this.items = [];
    }

    MenuChild.prototype = {
        addItem: function(item) {
            this.items.push(item);
            this.appendChild(item);
        },

        __proto__: Element.prototype
    };

    function Menu() {
        this.root = document.createElement("div");

        this.root.style.width    = "inherit";
        this.root.style.position = "absolute";

        this.header = new FoldButton();
        this.appendChild(this.header);

        this.header.root.style["background-color"] = "#202020";
        this.header.root.style.color               = "#fff";
        this.header.root.style.padding             = "8px 0px";
        this.header.root.style["text-align"]       = "center";
        this.header.root.style.position            = "relative";

        this.child                       = new MenuChild();

        this.root.style.position         = "relative";

        this.header.unfoldWidth(this.child, 200);
    }

    Menu.prototype = {
        setHeader: function(header) {
            this.header.setLabel(header);
        },

        setChildTop: function(top) {
            this.child.root.style.top = top;
        },

        __proto__: Element.prototype
    };

    function FoldButton() {
        this.events = {};
        this.root = document.createElement("div");

        this.root.style.width  = "100%";
        this.root.style.height = "100%";

        this.root.style.cursor = "pointer";
    }

    FoldButton.prototype = {
        unfoldWidth: function(unfold, width) {
            this.unfold      = unfold;
            this.unfoldWidth = width;

            this.unfold.root.style.position = "relative";
            this.unfold.setWidth(0);

            /*this.root.style.position = "relative";
            this.setWidth(this.unfoldWidth);*/

            this.folded = true;

            var that = this;
            this.addEventListener("click", function() {
                if(that.currentTween)
                    that.currentTween.stop();

                var destination  = that.unfoldWidth,
                    cb,
                    duration     = 500,
                    currentWidth = that.unfold.getWidth();

                if(!that.folded) {
                    destination = currentWidth;

                    duration = duration * (destination / that.unfoldWidth);

                    console.log("Destination", destination)

                    cb = function(left) {
                        that.setLeft(currentWidth - left);
                        that.unfold.setWidth(currentWidth - left);
                    };
                } else {
                    cb = function(left) {
                        that.setLeft(left);
                        that.unfold.setWidth(left);
                    };
                }

                that.folded       = !that.folded;
                that.currentTween = easeOutCirc(destination, duration, cb);
            });
        },

        unfold: function(unfold, width, onEnd) {
            this.unfold      = unfold;
            this.unfoldWidth = width;

            this.unfold.root.style.position = "relative";
            this.unfold.setLeft(0);

            this.root.style.position = "relative";
            this.setLeft(0);

            this.folded = true;

            var that = this;
            this.addEventListener("click", function() {
                if(that.currentTween)
                    that.currentTween.stop();

                var destination = that.unfoldWidth,
                    cb,
                    duration    = 500;

                if(!that.folded) {
                    destination = width - (width - that.unfold.getLeft());
                    console.log("Destination", destination, that.unfold.getLeft());

                    duration = duration * (destination / that.unfoldWidth);

                    cb = function(left) {
                        that.unfold.setLeft(destination - left);
                    };
                } else {
                    cb = function(left) {
                        that.unfold.setLeft(left);
                    };
                }

                that.folded       = !that.folded;
                that.currentTween = easeOutCirc(destination, duration, cb, onEnd);
            });
        },

        __proto__: Button.prototype
    }

    function MenuContainer(width) {
        this.menus = [];

        this.root = document.createElement("div");
        this.setWidth(width || 200);

        this.root.style.position            = "absolute";
        this.root.style["background-color"] = "#433";

        this.root.style.height              = "100%";

        this.hiddenLayer = document.createElement("div");
        this.root.appendChild(this.hiddenLayer);

        this.hiddenLayer.style.height   = "100%";
        this.hiddenLayer.style.width    = "inherit";
        this.hiddenLayer.style.position = "absolute";
        this.hiddenLayer.style.top      = "0";
        this.hiddenLayer.style.left     = this.width + "px";
        this.hiddenLayer.style.overflow = "hidden";

        this.menuLayer = document.createElement("div");
        this.root.appendChild(this.menuLayer);

        this.menuLayer.style.height   = "100%";
        this.menuLayer.style.width    = "inherit";
        this.menuLayer.style.position = "absolute";
        this.menuLayer.style.top      = "0";
        //this.menuLayer.style.overflow = "hidden";
    }

    MenuContainer.prototype = {
        addMenu: function(menu) {
            if(!menu instanceof Menu)
                throw new Error("Parameter given is not of Menu instance.");

            this.menus.push(menu);
            this.menuLayer.appendChild(menu.root);
            this.hiddenLayer.appendChild(menu.child.root);
        },

        /*setWidth: function(width) {
            Element.prototype.setWidth.call(this, width);
        },*/

        __proto__: Element.prototype
    };

    function Sidebar() {
        this.root  = document.createElement("div");

        this.root.style.height   = "100%";
        this.root.style.display  = "block";
        this.root.style.position = "relative";

        this.setWidth(200);

        this.menuContainer = new MenuContainer(200);
        //this.menuContainer.setWidth(200);

        this.menuContainer.appendTo(this.root);

        this.foldButton = this.createFoldButton();
        this.foldButton.appendTo(this);

        this.foldButton.unfoldWidth(this.menuContainer, 200);

        this.foldButton.root.style["background-color"] = "#202020";
        this.foldButton.root.style.width  = "20px";
        this.foldButton.root.style.height = "20px";

        this.foldButton.root.style.position = "absolute";
        this.foldButton.root.style.top      = "0";
    }

    Sidebar.prototype = {
        addMenu: function(menu) {
            this.menuContainer.addMenu(menu);
        },

        __proto__: Element.prototype
    };

    function Item() {

    }

    Item.prototype = {
        setType: function(){},
        __proto__: Element.prototype 
    };

    function Input() {
        this.root  = document.createElement("div");

        this.label = document.createElement("div");
        this.input = document.createElement("input");

        this.appendChild(this.label);
        this.appendChild(this.input);
    }

    Input.prototype = {
        setLabel: function(label) {
            this.label.innerHTML = label;
        },

        __proto__: Item.prototype
    };

    window.sense4us.Sidebar = Sidebar;
    window.sense4us.Menu    = Menu;
    window.sense4us.Item    = Item;
    window.sense4us.Input   = Input;
}());