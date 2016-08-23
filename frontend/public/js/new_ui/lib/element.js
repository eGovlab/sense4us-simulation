'use strict';

function Element(type) {
    this.root = document.createElement(type || 'div');
}

Element.prototype = {
    appendTo: function(container) {
        if(container instanceof Element) {
            return container.appendChild(this);
        }

        container.appendChild(this.root);
    },

    setLabel: function(label) {
        this.root.innerHTML = label;
    },

    getLabel: function() {
        return this.root.innerHTML;
    },

    appendChild: function(container) {
        if(!this.children) {
            this.children = [];
        }

        if(container instanceof Element) {
            this.children.push(container)
        }

        if(container.root) {
            return this.root.appendChild(container.root);
        }

        this.root.appendChild(container);
    },

    removeChild: function(child) {
        if(!this.children) {
            try {
                if(child.root) {
                    this.root.removeChild(child.root);
                } else {
                    this.root.removeChild(child)
                }
            } catch(err) {
                console.error(err);
            }

            return;
        }

        var index = this.children.indexOf(child);
        if(index === -1) {
            try {
                this.root.removeChild(child);
            } catch(err) {
                console.error(err);
            }

            return;
        }

        this.children.splice(index, 1);
        this.root.removeChild(child.root);
    },

    createFoldButton: function() {
        if(!this.buttons) {
            this.buttons = [];
        }

        var b = new FoldButton();
        this.buttons.push(b);

        return b;
    },

    createButton: function() {
        if(!this.buttons) {
            this.buttons = [];
        }

        var b = new Button();
        this.buttons.push(b);

        return b;
    },

    deleteAllButtons: function() {
        if(!this.buttons) {
            return;
        }

        this.buttons.forEach(function(button) {
            button.removeEventListener();
        });
    },

    setWidth: function(width) {
        if(typeof width === 'string') {
            this.root.style.width = width;
        } else if(typeof width === 'number') {
            this.root.style.width = width + 'px';
        }

        this.width = parseInt(width);
    },

    getWidth: function() {
        return this.root.offsetWidth || this.width || 0;
    },

    setHeight: function(height) {
        if(typeof height === 'string') {
            this.root.style.height = height;
        } else if(typeof height === 'number') {
            this.root.style.height = height + 'px';
            this.height = parseInt(height);
        }
    },

    getHeight: function() {
        return this.root.offsetHeight || this.height || 0;
    },

    setBackground: function(background) {
        this.root.style['background-color'] = background;
        this.background = background;
    },

    getBackground: function() {
        return this.background;
    },

    setLeft: function(left) {
        if(typeof left === 'string') {
            this.root.style.left = left;
        } else if(typeof left === 'number') {
            this.root.style.left = left + 'px';
        }

        this.left = parseInt(left);
    },

    getLeft: function() {
        return this.left || 0;
    },

    setTop: function(top) {
        if(typeof top === 'string') {
            this.root.style.top = top;
        } else if(typeof top === 'number') {
            this.root.style.top = top + 'px';
        }

        this.top = parseInt(top);
    },

    getTop: function() {
        return this.top || 0;
    },

    hide: function() {
        if(this.root.style.display !== 'none') {
            this.currentStyle = this.root.style.display;
        }

        this.root.style.display = 'none';
    },

    show: function() {
        this.root.style.display = this.currentStyle || 'block';
    },

    destroy: function() {
        if(this.removeEvents) {
            this.removeEvents();
        }

        if(this.children) {
            this.children.forEach(function(child) {
                child.destroy();
            });
        }

        if(this.root.parentElement) {
            this.root.parentElement.removeChild(this.root);
        }
    }
};

module.exports = Element;