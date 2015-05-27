'use strict';

function SelectButton(header, callback) {
    if (!(this instanceof SelectButton)) {
        throw new Error('SelectButton called as a generic method.');
    }

    this.element  = document.createElement('button');
    this.header   = header;
    this.callback = callback;

    this.element.innerHTML = this.header;
    this.element.addEventListener('click', callback);
}

module.exports = SelectButton;