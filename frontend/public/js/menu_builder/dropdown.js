'use strict';

function Option(parent) {
    if (!(this instanceof Option)) {
        throw new Error('Option accessed as generic method.');
    }

    this.element  = document.createElement('div');
    this.callback = null;
    this.parent   = parent;
}

Option.prototype = {
    setValue: function(value) {
        this.value = value;
        this.element.setAttribute('data-value', value);
    },

    setText: function(text) {
        this.text = text;
        this.element.innerHTML = text;
    },

    setId: function(id) {
        this.id = id;
        this.element.setAttribute('data-id', id);
    },

    setCallback: function(callback) {
        this.callback = callback;
    },

    select: function() {
        this.element.className = "s4u-dropdown-selected";
    },

    deselect: function() {
        this.element.className = "";
    }
};

function Dropdown(header, onselect, update) {
    if (!(this instanceof Dropdown)) {
        throw new Error('Dropdown accessed as generic method.');
    }

    this.element         = document.createElement('div');
    this.headerElement   = document.createElement('h4');
    this.container       = document.createElement('div');

    this.headerElement.className = 's4u-dropdown-header';
    this.container.className = 's4u-dropdown-container';
    this.container.style.display = 'none';

    this.element.appendChild(this.headerElement);
    this.element.appendChild(this.container);

    this.element.className = 's4u-dropdown';
    var that = this;
    this.element.addEventListener('mouseenter', function(e) {
        that.toggle();
    });

    this.element.addEventListener('click', function(e) {
        if (e.target.tagName.toLowerCase() !== 'h4') {
            var option = that.options[e.target.getAttribute('data-id')];
            option.update = function(){that.update.call(that)};
            that.onselect.call(option);
        }
    });

    this.element.addEventListener('mouseleave', function(e) {
        that.toggle();
    });

    this.header = header;
    this.headerElement.innerHTML = this.header;

    this.options  = [];
    this.occupied = {};
    this.selected = false;

    this.onselect = onselect;
    this.update   = update;

    this.update();
}

Dropdown.prototype = {
    addOption: function(value, text, callback) {
        if (this.occupied[value]) {
            return;
        }

        var newOption = new Option(this);
        newOption.setValue(value);
        newOption.setText(text);

        newOption.setId(this.options.length);

        if(callback && typeof callback === 'function') {
            newOption.setCallback(callback);
        }

        this.options.push(newOption);
        this.occupied[value] = this.options.length;
    },

    resetOptions: function() {
        this.occupied = {};
        this.options  = [];
    },

    refreshList: function() {
        while(this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.options.forEach(function(option) {
            this.container.appendChild(option.element);
        }, this);
    },

    select: function(id) {
        if (id === undefined) {
            if(this.selected) {
                this.selected.deselect();
            }
            
            this.selected = this.options[this.options.length - 1];
            this.selected.select();
            //this.headerElement.innerHTML = this.selected.text;
        } else if (typeof id === 'number') {
            if(this.selected) {
                this.selected.deselect();
            }

            this.selected = this.options[id];
            this.selected.select();
            //this.headerElement.innerHTML = this.selected.text;
        }
    },

    toggle: function() {
        if (this.container.style.display === 'none') {
            this.container.style.display = 'block';
            this.container.className += " s4u-dropdown-container-animation";
        } else {
            this.container.style.display = 'none';
            this.container.className = "s4u-dropdown-container";
        }
    },

    visible: function() {
        return this.container.style.display === 'block';
    }
};


module.exports = Dropdown;