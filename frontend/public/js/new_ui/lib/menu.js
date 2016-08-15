'use strict';

var Element  = require('./element.js'),
    Foldable = require('./foldable.js'),
    Tween    = require('./tween.js'),
    Button   = require('./button.js'),
    Colors   = require('./colors.js');

var easeOutCirc = Tween.easeOutCirc;

function Menu(width) {
    this.menuItems = [];
    this.items     = [];
    this.buttons   = [];

    this.buttonHeight = Colors.menuButtonHeight;

    this.buttonLayer = new Element();
    this.buttonLayer.setHeight(this.buttonHeight);
    this.buttonLayer.root.style.color = Colors.menuButtonFontColor;
    this.buttonLayer.setBackground(Colors.menuButtonBackground);
    this.buttonLayer.root.style.padding = '0px 4px';

    this.menuLayer = new Element();
    this.itemLayer = new Element();

    this.menuLayer.root.style.position = 'relative';

    this.itemLayer.root.style.position = 'absolute';
    //this.itemLayer.setLeft(width);
    this.itemLayer.root.style.top      = '0';
    this.itemLayer.setHeight('100%');

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
            that.activeMenuItem.child.invert(function() {
                menuItem.setBackground(Colors.menuItemBackground);
            });

            that.activeMenuItem = false;
            return;
        }

        if(menuItem.refresh) {
            menuItem.refresh();
        }

        if(that.activeMenuItem) {
            return that.activeMenuItem.child.invert(function() {
                that.activeMenuItem.setBackground(Colors.menuItemBackground);
                
                menuItem.setBackground(Colors.menuItemActiveBackground);
                menuItem.child.invert();

                that.activeMenuItem = menuItem;
            });
        }

        menuItem.setBackground(Colors.menuItemActiveBackground);
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

        if(this.currentTween) {
            this.currentTween.stop();
        }

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

        if(this.currentTween) {
            this.currentTween.stop();
        }

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

module.exports = Menu;