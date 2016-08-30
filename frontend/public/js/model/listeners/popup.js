'use strict';

var newUI = require('./../../new_ui');

var Element = newUI.Element,
    Button  = newUI.Button;

function createPopup(config) {
    if(!config || typeof config !== 'object') {
        return false;
    }

    if((!config.description || typeof config.description !== 'string')
    && (!config.buttons || !config.buttons.forEach)) {
        return false;
    }

    var container = new Element('div');

    container.root.style.display  = 'flex';

    container.root.style.position = 'absolute';
    container.root.style.top      = '0px';
    container.root.style.left     = '0px';

    container.root.style['z-index'] = '4';

    container.setWidth('100%');
    container.setHeight('100%');

    container.setBackground('rgba(0,0,0,0.5)');

    var popup = new Element('div');

    popup.setBackground('#fafafa');
    popup.setWidth('300px');

    popup.root.style.display           = 'flex';
    popup.root.style['align-items']    = 'stretch';
    popup.root.style['flex-direction'] = 'column';

    popup.root.style.margin = 'auto';

    container.appendChild(popup);

    var content         = new Element('div');
    var buttonContainer = new Element('div');

    if(config.description) {
        content.setLabel(config.description);
        content.root.style.padding       = '14px';
        content.root.style.margin        = 'auto';
        content.root.style['text-align'] = 'center';
    }

    content.root.style.display                   = 'flex';
    buttonContainer.root.style.display           = 'flex';
    buttonContainer.root.style['align-items']    = 'stretch';
    buttonContainer.root.style['flex-direction'] = 'row';

    if(typeof config.buttons === 'function') {
        config.buttons = [config.buttons];
    }

    config.buttons.forEach(function(buttonData) {
        if(!buttonData.callback) {
            return;
        }

        if(!buttonData.label) {
            buttonData.label = '';
        }

        var button = new Button();
        button.setLabel(buttonData.label)
        button.click(function() {
            buttonData.callback(container);
        });

        if(buttonData.background) {
            button.setBackground(buttonData.background);
        }

        button.root.style.display      = 'flex';
        button.label.root.style.margin = 'auto';

        button.root.style.padding      = '14px';

        button.root.style['flex-grow'] = '1';

        buttonContainer.appendChild(button);
    });

    popup.appendChild(content);
    popup.appendChild(buttonContainer);

    return container;
}

module.exports = function(container, loadedModel) {
    container.style.position = 'relative';
    loadedModel.addListener('popup', function(config) {
        var popup = createPopup(config);

        // Given config was iinvalid and no popup should be created.
        if(popup === false) {
            console.error(config, 'given to popup event.');
            return;
        }

        container.insertBefore(popup.root, container.firstChild);
    });
};