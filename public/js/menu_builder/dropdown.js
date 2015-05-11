"use strict";

function Option() {
    if(!(this instanceof Option)) {
        throw new Error("Option accessed as generic method.");
    }

    this.element = document.createElement("div");
}

Option.prototype = {
    setValue: function(value) {
        this.value = value;
        this.element.setAttribute("data-value", value);
    },

    setText: function(text) {
        this.text = text;
        this.element.innerHTML = text;
    },

    setId: function(id) {
        this.id = id;
        this.element.setAttribute("data-id", id);
    }
};

function Dropdown(onselect, update) {
    if(!(this instanceof Dropdown)) {
        throw new Error("Dropdown accessed as generic method.");
    }

    this.element         = document.createElement("div");
    this.selectedElement = document.createElement("h4");
    this.container       = document.createElement("div");

    this.selectedElement.className = "s4u-dropdown-selected";
    this.container.className = "s4u-dropdown-container";
    this.container.style.display = "none";

    this.element.appendChild(this.selectedElement);
    this.element.appendChild(this.container);

    this.element.className = "s4u-dropdown";
    var that = this;
    this.element.addEventListener("click", function(e) {
        if(e.target.tagName.toLowerCase() === "h4") {
            that.toggle();
        } else {
            var option = that.options[e.target.getAttribute("data-id")];
            option.update = function(){that.update.call(that)};
            that.onselect.call(option);
            that.toggle();
        }
    });

    this.options  = [];
    this.occupied = {};
    this.selected = false;

    this.onselect = onselect;
    this.update   = update;

    this.update();
}

Dropdown.prototype = {
    addOption: function(value, text) {
        if(this.occupied[value]) {
            return;
        }

        var newOption = new Option();
        newOption.setValue(value);
        newOption.setText(text);

        newOption.setId(this.options.length);
        this.options.push(newOption);
        this.occupied[value] = true;
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
        if(id === undefined) {
            this.selected = this.options[this.options.length - 1];
            this.selectedElement.innerHTML = this.selected.text;
        } else if(typeof id === "number") {
            this.selected = this.options[id];
            this.selectedElement.innerHTML = this.selected.text;
        }
    },

    toggle: function() {
        if(this.container.style.display === "none") {
            this.container.style.display = "block";
        } else {
            this.container.style.display = "none";
        }
    }
};


module.exports = Dropdown;