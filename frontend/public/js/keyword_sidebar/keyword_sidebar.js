'use strict';

var Immutable = require('Immutable');

function resizeListener() {

}

function hide(evt) {
    var element = this.nextElementSibling;
    while(element) {
        if(element.className !== 'keyword') {
            element = element.nextElementSibling;
            continue;
        }

        if(element.style.display === 'none') {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
        
        element = element.nextElementSibling;
    }
}

function unselect(evt) {
    evt.preventDefault();
}

function createCategoryElement() {
    var categoryElement = document.createElement('div');

    categoryElement.className = 'category';

    return categoryElement;
}

function createCategoryHeader(header) {
    var headerElement = document.createElement('div');

    headerElement.className = 'header';
    headerElement.innerHTML = header;
    headerElement.addEventListener('click', hide);
    headerElement.addEventListener('mousedown', unselect, false);

    return headerElement;
}

function createKeyword(keyword, importTo) {
    var keyElement = document.createElement('div');
    
    keyElement.className = 'keyword';

    var span   = createKeywordSpan(keyword),
        button = createImportButton(importTo);

    var separator = document.createElement('div');
    separator.style.clear = 'both';

    keyElement.appendChild(span);
    keyElement.appendChild(button);
    keyElement.appendChild(separator);
    
    return keyElement;
}

function createKeywordSpan(keyword) {
    var spanElement = document.createElement('div');

    spanElement.className = 'span';
    spanElement.innerHTML = keyword;

    return spanElement;
}

function createImportButton(importTo) {
    var buttonElement = document.createElement('div');

    buttonElement.className = 'import-button';

    var callback = function() {
        buttonElement.removeEventListener('click', callback);

        migrateButton(buttonElement, buttonElement.parentElement.parentElement, importTo);
        importTo.appendChild(buttonElement.parentElement);
    };

    buttonElement.addEventListener('click', callback);

    return buttonElement;
}

function migrateButton(button, importTo, importedFrom) {
    var callback = function() {
        button.removeEventListener('click', callback);

        migrateButton(button, importedFrom, importTo);
        importTo.appendChild(button.parentElement);
    };

    button.addEventListener('click', callback);
}

module.exports = {
    addStrings: function(element, list) {
        var categories = {},
            unsorted   = [];

        var imported = createCategoryElement(),
            importedHeader = createCategoryHeader('Imported');

        imported.appendChild(importedHeader);

        list.forEach(function(bundle) {
            if(Immutable.Map.isMap(bundle)) {
                if(!categories[bundle.get('header')]) {
                    categories[bundle.get('header')] = [];
                }

                bundle.get('keys').forEach(function(key) {
                    categories[bundle.get('header')].push(key);
                });
            } else {
                unsorted.push(bundle);
            }
        });

        Object.keys(categories).forEach(function(categoryName) {
            var category = categories[categoryName],
                categoryElement = createCategoryElement(),
                categoryHeader  = createCategoryHeader(categoryName);
            
            categoryElement.appendChild(categoryHeader);

            category.forEach(function(key) {
                categoryElement.appendChild(createKeyword(key, imported));
            });

            element.appendChild(categoryElement);
        });

        var unsortedElement = createCategoryElement(),
            unsortedHeader  = createCategoryHeader('Unsorted');

        unsortedElement.appendChild(unsortedHeader);
        unsorted.forEach(function(key) {
            var keyElement = createKeyword(key, imported);
            unsortedElement.appendChild(keyElement);
        });

        element.appendChild(unsortedElement);
        element.appendChild(imported);

        return element;
    }
};