'use strict';

var Element  = require('./element.js'),
    Foldable = require('./foldable.js'),
    Colors   = require('./colors.js'),
    Tween    = require('./tween.js'),
    Button   = require('./button.js'),
    Menu     = require('./menu.js');

var easeOutCirc = Tween.easeOutCirc;

function Sidebar(width, offset) {
    this.maxWidth = width;
    this.foldable = new Menu(width);
    this.root     = document.createElement('div'); 
    this.appendChild(this.foldable);

    this.unfolded = 0;

    this.setHeight('100%');
    this.root.style.position = 'relative';

    this.foldable.setBackground(Colors.sidebarBackground);
    this.foldable.setHeight('inherit');

    this.foldable.root.style.overflow = 'hidden';

    this.children = [];

    this.foldButton = new Button();
    this.appendChild(this.foldButton);

    this.foldButton.setHeight(Colors.sidebarFoldButtonSize);
    this.foldButton.setWidth(Colors.sidebarFoldButtonSize);
    this.foldButton.setBackground(Colors.sidebarFoldButtonBackground);

    this.foldButton.root.style.position = 'absolute';
    this.foldButton.root.style.top      = offset ? offset + 'px' : '0';
    this.foldButton.root.style.color    = Colors.sidebarFoldButtonFontColor;
    this.foldButton.root.style['text-align'] = 'center';
    this.foldButton.root.style['padding-top'] = Colors.sidebarFoldButtonPaddingtop + 'px';

    var listIcon = new Element('span');
    listIcon.root.className = 'glyphicon glyphicon-plus';

    this.foldButton.appendChild(listIcon);

    var that = this;
    this.foldButton.click(function() {
        if(that.foldable.folded) {
            listIcon.root.className = 'glyphicon glyphicon-minus';
        } else {
            listIcon.root.className = 'glyphicon glyphicon-plus';
        }

        that.invert();
    });
}

Sidebar.prototype = {
    addButton: function(icon, callback) {
        var button = new Button();

        button.root.style.display = 'inline-block';
        button.setHeight(this.foldable.buttonHeight);
        button.setWidth(this.foldable.buttonHeight);
        button.root.style['text-align'] = 'center';

        button.root.style['padding-top'] = Colors.menuButtonPaddingTop + 'px';

        var span = new Element('span');
        span.root.className = 'glyphicon glyphicon-'+icon;

        span.root.style['font-size'] = Colors.menuButtonIconSize;

        button.appendChild(span);

        this.foldable.addButton(button);

        return button;
    },

    addItem: function(item) {
        this.foldable.addItem(item);
        item.label.setWidth(this.maxWidth);
    },

    show: function() {
        if(this.currentTween) {
            this.currentTween.stop();
        }

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
        if(this.currentTween) {
            this.currentTween.stop();
        }

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
        if(this.foldable.folded) {
            this.show();
        } else {
            this.hide();
        }
    },

    __proto__: Foldable.prototype
};

module.exports = Sidebar;