'use strict';

var Element = require('./element.js'),
    Colors  = require('./colors.js'),
    Button  = require('./button.js');

function IconGroup(label) {
    Element.call(this, 'div');
    this.groupLabel = new Element('div');
    this.groupLabel.setLabel(label);

    this.groupLabel.root.style.margin = '16px 0px';

    this.groupLabel.root.style['text-align'] = 'center';
    this.groupLabel.root.style['font-weight'] = '700';

    this.iconContainer = new Element('div');
    this.iconContainer.root.style['text-align'] = 'center';

    this.appendChild(this.groupLabel);
    this.appendChild(this.iconContainer);

    this.icons = [];
}

IconGroup.prototype = {
    addIcon: function(img) {
        var imageButton    = new Button();
        var imageContainer = new Element('div');

        imageButton.appendChild(imageContainer);

        var image = new Element('img');
        if(img) {
            image.root.src = img;
        } else {
            image.setBackground(Colors.buttonBackground);
        }

        imageContainer.appendChild(image);

        imageButton.setWidth(50);
        imageButton.setHeight(50);

        imageButton.root.style.display = 'inline-block';

        image.setWidth(50);
        image.setHeight(50);
        image.root.style.border = 'none';

        imageButton.root.style.margin = '6px 6px';

        this.icons.push(imageButton);

        this.iconContainer.appendChild(imageButton);

        return imageButton;
    },

    setLabel: function(label) {
        this.groupLabel.setLabel(label);
    },

    __proto__: Element.prototype
}

module.exports = IconGroup;