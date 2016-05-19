(function() {
    "use strict";

    window.sense4us = window.sense4us || {};

    var lightBlack                  = "#303040",
        lightPink                   = "#f7b8dd",
        lightPurple                 = "#c7b7f7",
        palePurple                  = "#AA6EEB",
        darkPurple                  = "#b197ba",
        darkerPurple                = "#A3779D",
        lightBlue                   = "#b7caf7",
        paleBlue                    = "#7C6CE6",
        blue                        = "#3643A3",
        darkTeal                    = "#446A96",
        darkerTeal                  = "#395585",
        darkererTeal                = "#314973",
        darkerererTeal              = "#2A3D66",
        tealFont                    = "#D7F1F7",
        almostBlue                  = "#3F2191",
        lightOrange                 = "#D99B4A",

        white                       = "#fafafa";

    var sidebarBackground           = darkerTeal,

        sidebarFoldButtonSize       = "30px",
        sidebarFoldButtonFontColor  = tealFont,
        sidebarFoldButtonBackground = darkTeal,
        sidebarFoldButtonPaddingtop = 5,

        menuButtonHeight            = 30,
        menuButtonIconSize          = "1.2em",
        menuButtonFontColor         = tealFont,
        menuButtonBackground        = darkTeal,
        menuButtonPaddingTop        = 5,

        menuItemFontSize            = "12px",
        menuItemFontColor           = tealFont,
        menuItemBackground          = darkerTeal,
        menuItemActiveBackground    = darkererTeal,

        itemFontSize                = "12px",
        itemFontColor               = tealFont,
        itemBackground              = darkererTeal,

        inputBackground             = darkerererTeal,
        inputFontColor              = tealFont;

    var buttonBackground = inputBackground,
        buttonFontColor  = inputFontColor;

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
                if(onEnd) {
                    onEnd();
                }
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

    function Element(type) {
        this.root = document.createElement(type || "div");
    }

    Element.prototype = {
        appendTo: function(container) {
            if(container instanceof Element)           
                return container.appendChild(this);

            container.appendChild(this.root);
        },

        setLabel: function(label) {
            this.root.innerHTML = label;
        },

        appendChild: function(container) {
            if(!this.children)
                this.children = [];

            if(container instanceof Element)
                this.children.push(container)

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
            return this.root.offsetWidth || this.width || 0;
        },

        setHeight: function(height) {
            if(typeof height === "string") {
                this.root.style.height = height;
            } else if(typeof height === "number") {
                this.root.style.height = height + "px";
                this.height = parseInt(height);
            }
        },

        getHeight: function() {
            return this.root.offsetHeight || this.height || 0;
        },

        setBackground: function(background) {
            this.root.style["background-color"] = background;
            this.background = background;
        },

        getBackground: function() {
            return this.background;
        },

        setLeft: function(left) {
            if(typeof left === "string")
                this.root.style.left = left;

            else if(typeof left === "number")
                this.root.style.left = left + "px";

            this.left = parseInt(left);
        },

        getLeft: function() {
            return this.left || 0;
        },

        setTop: function(top) {
            if(typeof top === "string")
                this.root.style.top = top;

            else if(typeof top === "number")
                this.root.style.top = top + "px";

            this.top = parseInt(top);
        },

        getTop: function() {
            return this.top || 0;
        },

        destroy: function() {
            if(this.removeEvents) {
                this.removeEvents()
            }

            this.root.parentElement.removeChild(this.root);
        }
    };

    function Foldable(width, positional) {
        if(!width)
            throw new Error("Creating foldable without width.");

        if(typeof width !== "number")
            throw new Error("Width given must be a number.");

        this.root = document.createElement("div");

        if(positional)
            this.setWidth(width);
        else
            this.setWidth(0);

        this.folded        = true;
        this.foldableWidth = width;
        this.children      = [];
    }

    Foldable.prototype = {
        fold: function(onDone) {
            this.children.forEach(function(child) {
                if(child instanceof Foldable)
                    child.unfold();
            });

            if(this.currentTween)
                this.currentTween.stop();

            var currentWidth = this.getWidth();
            var destination  = currentWidth;

            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(width) {
                that.setWidth(currentWidth - width);
            }, onDone);

            this.folded = true;
        },

        unfold: function(onDone) {
            this.children.forEach(function(child) {
                if(child instanceof Foldable)
                    child.unfold();
            });

            if(this.currentTween)
                this.currentTween.stop();

            var currentWidth = this.getWidth();
            var destination  = this.foldableWidth - currentWidth;

            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(width) {
                that.setWidth(currentWidth + width);
            }, onDone);
            this.folded = false;
        },

        positionalFold: function() {
            this.children.forEach(function(child) {
                if(child instanceof Foldable)
                    child.fold();
            });

            if(this.currentTween)
                this.currentTween.stop();

            var currentLeft = this.getLeft();
            var destination = currentLeft;

            if(destination === 0) {
                this.folded = true;
                return;
            }

            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(left) {
                that.setLeft(currentLeft - left);
            });

            this.folded = true;
        },

        positionalUnfold: function() {
            this.children.forEach(function(child) {
                if(child instanceof Foldable)
                    child.unfold();
            });

            if(this.currentTween)
                this.currentTween.stop();

            var currentLeft = this.getLeft();
            var destination = this.foldableWidth - currentLeft;

            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(left) {
                that.setLeft(currentLeft + left);
            });

            this.folded = false;
        },

        positionalInvert: function() {
            if(this.folded)
                this.positionalUnfold();
            else
                this.positionalFold();
        },

        invert: function(onDone) {
            if(this.folded)
                this.unfold(onDone);
            else
                this.fold(onDone);
        },

        __proto__: Element.prototype
    };

    function Button() {
        this.root = document.createElement("div");
        this.root.style.cursor = "pointer";
        this.clicks = [];
    }

    Button.prototype = {
        click: function(callback) {
            this.clicks.push(callback);
            this.root.addEventListener("click", callback);
        },

        removeClick: function(callback) {
            var index = this.clicks.indexOf(callback);
            this.clicks.splice(index, 1);

            this.root.removeEventListener("click", callback);
        },

        removeEvents: function() {
            this.clicks.forEach(function(callback) {
                this.root.removeEventListener("click", callback);
            }, this);

            this.clicks = [];
        },

        replaceClick: function(callback, newCallback) {
            var index = this.clicks.indexOf(callback);
            if(index !== -1) {
                this.root.removeEventListener("click", this.clicks[index]);
                this.clicks[index] = newCallback;
            } else {
                this.clicks.push(newCallback);
            }

            this.root.addEventListener("click", newCallback);
        },

        __proto__: Element.prototype
    };

    function Menu(width) {
        this.menuItems = [];
        this.items     = [];
        this.buttons   = [];

        this.buttonHeight = menuButtonHeight;

        this.buttonLayer = new Element();
        this.buttonLayer.setHeight(this.buttonHeight);
        this.buttonLayer.root.style.color = menuButtonFontColor;
        this.buttonLayer.setBackground(menuButtonBackground);
        this.buttonLayer.root.style.padding = "0px 4px";

        this.menuLayer = new Element();
        this.itemLayer = new Element();

        this.menuLayer.root.style.position = "relative";

        this.itemLayer.root.style.position = "absolute";
        //this.itemLayer.setLeft(width);
        this.itemLayer.root.style.top      = "0";
        this.itemLayer.setHeight("100%");

        Foldable.call(this, width);

        this.appendChild(this.itemLayer);
        //this.appendChild(this.separator);
        this.appendChild(this.buttonLayer);
        this.appendChild(this.menuLayer);

        this.activeMenuItem;
        var that = this;

        this.clicks = [];
        Button.prototype.click.call(this, function(evt) {
            var menuItem = evt.target.owner || evt.target.parentOwner;
            if(!menuItem) {
                return;
            }

            if(menuItem === that.activeMenuItem) {
                that.activeMenuItem.setBackground(menuItemBackground);
                that.activeMenuItem.child.invert();
                that.activeMenuItem = false;
                return;
            }

            if(that.activeMenuItem) {
                that.activeMenuItem.setBackground(menuItemBackground);
                return that.activeMenuItem.child.invert(function() {
                    menuItem.setBackground(menuItemActiveBackground);
                    menuItem.child.invert();

                    that.activeMenuItem = menuItem;
                });
            }

            menuItem.setBackground(menuItemActiveBackground);
            menuItem.child.invert();

            that.activeMenuItem = menuItem;
        });
    }

    Menu.prototype = {
        addButton: function(button) {
            this.buttons.push(button);
            this.buttonLayer.appendChild(button);
        },

        addItem: function(item) {
            item.setWidth(this.getWidth());

            //item.setTop(this.menuItems.length * 35 + 20);

            this.menuLayer.appendChild(item);
            this.itemLayer.appendChild(item.child);

            this.menuItems.push(item);

            item.child.setTop(this.buttonHeight);

            this.items.push(item.child);
        },

        unfold: function() {
            if(this.activeMenuItem) {
                this.activeMenuItem.child.invert();
            }
            /*this.children.forEach(function(child) {
                if(child instanceof Foldable)
                    child.fold();
            });*/

            if(this.currentTween)
                this.currentTween.stop();

            var currentWidth = this.getWidth(); 
            var destination  = this.foldableWidth - currentWidth;

            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(width) {
                /*that.menuItems.forEach(function(item) {
                    item.setWidth(currentWidth + width);
                    item.setLeft(currentWidth + width);
                });*/

                that.setWidth(currentWidth + width);
            });

            this.folded = false;
        },

        fold: function() {
            if(this.activeMenuItem) {
                this.activeMenuItem.child.invert();
            }
            /*this.children.forEach(function(child) {
                if(child instanceof Foldable)
                    child.fold();
            });*/

            if(this.currentTween)
                this.currentTween.stop();

            var currentWidth = this.getWidth(); 
            var destination  = currentWidth;

            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(width) {
                /*that.menuItems.forEach(function(item) {
                    item.setWidth(currentWidth - width);
                    item.setLeft(currentWidth - width);
                });*/

                that.setWidth(currentWidth - width);
            });

            this.folded = true;
        },

        setWidth: function(width) {
            this.menuItems.forEach(function(item) {
                item.setWidth(width);
            });

            //this.separator.setWidth(width);
            Menu.prototype.__proto__.setWidth.call(this, width);
            this.itemLayer.setLeft(width);
        },

        __proto__: Foldable.prototype
    }

    function Input() {
        this.changes = [];
        this.inputs  = [];

        Element.call(this);

        this.input    = new Element("input");
        this.label    = new Element("div");

        this.inputDiv = new Element("div");
        this.inputDiv.appendChild(this.input);

        this.input.setWidth("100%");
        this.input.root.style.border = "none";
        this.input.setBackground(inputBackground);
        this.input.root.style.color = inputFontColor;
        this.input.root.style["text-align"] = "center";
        this.label.root.style["margin-bottom"] = "8px";

        var that = this;
        this.onChange(function() {
            that.input.root.blur()
        });

        this.appendChild(this.label);
        this.appendChild(this.inputDiv);
    }

    Input.prototype = {
        setLabel: function(label) {
            this.label.root.innerHTML = label;
        },

        setValue: function(value) {
            this.input.root.value = value;
        },

        onChange: function(callback) {
            this.changes.push(callback);
            this.input.root.addEventListener("change", callback);
        },

        onInput: function(callback) {
            this.inputs.push(callback);
            this.input.root.addEventListener("input", callback);
        },

        replaceChange: function(callback, newCallback) {
            var index = changes.indexOf(callback);
            this.input.root.removeEventListener("change", changes[index]);
            this.input.root.addEventListener("change", newCallback);

            changes[index] = newCallback;
        },

        replaceInput: function(callback, newCallback) {
            var index = inputs.indexOf(callback);
            this.input.root.removeEventListener("input", inputs[index]);
            this.input.root.addEventListener("input", newCallback);

            inputs[index] = newCallback;
        },

        removeEvents: function() {
            this.inputs.forEach(function(callback) {
                this.input.root.removeEventListener("input", callback);
            }, this);

            this.changes.forEach(function(callback) {
                this.input.root.removeEventListener("change", callback);
            }, this);
        },

        __proto__: Element.prototype
    }

    function Slider(min, max) {
        Input.call(this);
        this.input.root.setAttribute("type", "range");
        this.input.root.style.display = "inline-block";

        this.lowestValue  = min || 0;
        this.highestValue = max || 10;

        this.input.root.setAttribute("min", this.lowestValue);
        this.input.root.setAttribute("max", this.highestValue);
        this.input.setWidth("60%");

        this.minValueDiv = new Element("div");
        this.maxValueDiv = new Element("div");

        this.minValueDiv.root.style.display = "inline-block";
        this.maxValueDiv.root.style.display = "inline-block";

        this.minValueDiv.root.style["margin-top"] = "2px";
        this.maxValueDiv.root.style["margin-top"] = "2px";

        this.minValueDiv.root.style.float = "left"
        this.maxValueDiv.root.style.float = "right"

        this.minValueDiv.setWidth("20%");
        this.maxValueDiv.setWidth("20%");

        this.minValueDiv.setLabel(this.lowestValue);
        this.maxValueDiv.setLabel(this.highestValue);

        this.setValue(this.lowestValue + 2);
        var that = this;

        this.onInput(function(evt) {
            that.minValueDiv.setLabel(that.input.root.value);
        });

        this.inputDiv.root.insertBefore(this.minValueDiv.root, this.inputDiv.root.firstChild);
        this.inputDiv.appendChild(this.maxValueDiv);

        var clear = new Element("div");
        clear.root.style.clear = "both";

        this.inputDiv.appendChild(clear);
    }

    Slider.prototype = {
        setValue: function(value) {
            if(typeof value !== "number")
                throw new Error("Value given is not a number");

            Input.prototype.setValue.call(this, value);
            this.minValueDiv.setLabel(value);
        },

        __proto__: Input.prototype
    };

    function IconGroup(label) {
        Element.call(this, "div");
        this.groupLabel = new Element("div");
        this.groupLabel.setLabel(label);

        this.groupLabel.root.style.margin = "16px 0px";

        this.groupLabel.root.style["text-align"] = "center";
        this.groupLabel.root.style["font-weight"] = "700";

        this.iconContainer = new Element("div");
        this.iconContainer.root.style["text-align"] = "center";

        this.appendChild(this.groupLabel);
        this.appendChild(this.iconContainer);

        this.icons = [];
    }

    IconGroup.prototype = {
        addIcon: function(img) {
            var imageButton    = new Button();
            var imageContainer = new Element("div");

            imageButton.appendChild(imageContainer);

            var image = new Element("img");
            if(img) {
                image.root.src = img;
            } else {
                image.setBackground(buttonBackground);
            }

            imageContainer.appendChild(image);

            imageButton.setWidth(50);
            imageButton.setHeight(50);

            imageButton.root.style.display = "inline-block";

            image.setWidth(50);
            image.setHeight(50);
            image.root.style.border = "none";

            imageButton.root.style.margin = "6px 6px";

            this.icons.push(imageButton);

            this.iconContainer.appendChild(imageButton);

            return imageButton;
        },

        setLabel: function(label) {
            this.groupLabel.setLabel(label);
        },

        __proto__: Element.prototype
    }

    function MenuItem(width) {
        Foldable.call(this, width, true);

        this.setBackground(menuItemBackground);

        this.maxWidth = width;

        this.root.style["text-align"] = "center";
        this.root.style.color         = menuItemFontColor;
        this.root.style.padding       = "16px 0px";

        //this.root.style.margin        = "4px 0px";

        this.root.owner = this;

        this.root.style.cursor        = "pointer";
        //this.root.style.position      = "absolute";

        this.root.style.overflow      = "hidden";

        this.child = new Foldable(width);
        this.child.root.style.position = "absolute";
        this.child.setBackground(itemBackground);
        this.child.root.style.color = itemFontColor;

        this.child.root.style["overflow-x"]  = "hidden";
        this.child.root.style["overflow-y"]  = "auto";
        this.child.root.style["white-space"] = "nowrap";
        this.child.root.style["font-size"]   = itemFontSize;

        this.child.root.style["max-height"] = "80%";

        this.label = new Element();
        this.label.root.style["white-space"] = "normal";
        this.label.root.parentOwner = this;
        this.label.root.style["font-weight"] = "700";
        this.label.root.style["font-size"]   = menuItemFontSize;

        this.appendChild(this.label);

        this.items = [];
    }

    MenuItem.prototype = {
        addSeparator: function(height) {
            var separator = new Element("div");

            this.items.push(separator);

            separator.setHeight(height);

            this.child.appendChild(separator);

            return separator;
        },

        addIconGroup: function(label) {
            var group = new IconGroup(label);

            this.items.push(group);
            this.child.appendChild(group);

            group.root.style["white-space"] = "normal";
            group.setWidth(this.maxWidth);

            return group;
        },

        addButton: function(label, callback) {
            if(typeof label === "function") {
                callback = label;
                label = false;
            }

            var button = new Button();
            if(label) {
                button.setLabel(label);
            }

            button.click(callback);

            button.root.style.padding = "8px 0px";

            button.setBackground(buttonBackground);
            button.root.style.color = buttonFontColor;
            button.root.style["text-align"] = "center";

            button.root.style["white-space"] = "normal";
            button.setWidth(this.maxWidth);

            this.child.appendChild(button);

            return button;
        },

        addInput: function(label) {
            var input = new Input();

            if(label) {
                input.setLabel(label);
            }

            input.root.style["white-space"] = "normal";
            input.setWidth(this.maxWidth);

            input.root.style.padding = "16px 16px";
            input.root.style["text-align"] = "center";

            this.items.push(input);
            this.child.appendChild(input);

            return input;
        },

        addSlider: function(label, min, max) {
            if(typeof label === "number") {
                max = min;
                min = label;
                label = false;
            }

            var input = new Slider(min, max);
            if(label) {
                input.setLabel(label);
            }

            input.root.style["white-space"] = "normal";
            input.setWidth(this.maxWidth);

            input.root.style.padding = "16px 16px";
            input.root.style["text-align"] = "center";

            this.items.push(input);
            this.child.appendChild(input);

            return input;
        },

        setLeft: function(width) {
            this.child.setWidth(width);
            //Foldable.prototype.setLeft.call(this, width);
        },

        setWidth: function(width) {
            if(this.child) {
                //this.child.setWidth(width);
            }

            Foldable.prototype.setWidth.call(this, width);
        },

        hide: function() {

        },

        setLabel: function(label) {
            this.label.root.innerHTML = label;
        },

        __proto__: Foldable.prototype
    };

    function Sidebar(width, offset) {
        this.maxWidth = width;
        this.foldable = new Menu(width);
        this.root     = document.createElement("div"); 
        this.appendChild(this.foldable);

        this.unfolded = 0;

        this.setHeight("100%");
        this.root.style.position = "relative";

        this.foldable.setBackground(sidebarBackground);
        this.foldable.setHeight("inherit");

        this.foldable.root.style.overflow = "hidden";

        this.children = [];

        this.foldButton = new Button();
        this.appendChild(this.foldButton);

        this.foldButton.setHeight(sidebarFoldButtonSize);
        this.foldButton.setWidth(sidebarFoldButtonSize);
        this.foldButton.setBackground(sidebarFoldButtonBackground);

        this.foldButton.root.style.position = "absolute";
        this.foldButton.root.style.top      = offset ? offset + "px" : "0";
        this.foldButton.root.style.color    = sidebarFoldButtonFontColor;
        this.foldButton.root.style["text-align"] = "center";
        this.foldButton.root.style["padding-top"] = sidebarFoldButtonPaddingtop + "px";

        var listIcon = new Element("span");
        listIcon.root.className = "glyphicon glyphicon-plus";

        this.foldButton.appendChild(listIcon);

        var that = this;
        this.foldButton.click(function() {
            if(that.foldable.folded)
                listIcon.root.className = "glyphicon glyphicon-minus";
            else 
                listIcon.root.className = "glyphicon glyphicon-plus";

            that.invert();
        });
    }

    Sidebar.prototype = {
        addButton: function(icon, callback) {
            var button = new Button();

            button.root.style.display = "inline-block";
            button.setHeight(this.foldable.buttonHeight);
            button.setWidth(this.foldable.buttonHeight);
            button.root.style["text-align"] = "center";

            button.root.style["padding-top"] = menuButtonPaddingTop + "px";

            var span = new Element("span");
            span.root.className = "glyphicon glyphicon-"+icon;

            span.root.style["font-size"] = menuButtonIconSize;

            button.appendChild(span);

            this.foldable.addButton(button);

            return button;
        },

        addItem: function(item) {
            this.foldable.addItem(item);
            item.label.setWidth(this.maxWidth);
        },

        show: function() {
            if(this.currentTween)
                this.currentTween.stop();

            var currentWidth = this.foldable.getWidth(); 
            var destination  = this.foldable.foldableWidth - currentWidth;

            this.foldable.invert();
            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(width) {
                that.foldButton.setLeft(currentWidth + width);
            });

            //this.foldable.folded = false;
        },

        hide: function() {
            if(this.currentTween)
                this.currentTween.stop();

            var currentWidth = this.foldable.getWidth();
            var destination  = currentWidth;

            this.foldable.invert();
            var that = this;
            this.currentTween = easeOutCirc(destination, 250, function(width) {
                //that.foldable.setWidth(currentWidth  - width, true);
                that.foldButton.setLeft(currentWidth - width);
            });

            //this.foldable.folded = true;
        },

        invert: function() {
            if(this.foldable.folded)
                this.show();
            else
                this.hide();
        },

        __proto__: Foldable.prototype
    };

    window.sense4us.Sidebar = Sidebar;
    window.sense4us.MenuItem = MenuItem;
}());