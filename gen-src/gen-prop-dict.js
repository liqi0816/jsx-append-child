const { JSDOM } = require('jsdom');
const { window: { document } } = new JSDOM();

// go to node_modules/jsdom/lib/jsdom/living/helpers/create-element.js and add INTERFACE_TAG_MAPPING to exports 
const { INTERFACE_TAG_MAPPING } = require('jsdom/lib/jsdom/living/helpers/create-element.js');

const ret = {};
for (const namespace of Object.keys(INTERFACE_TAG_MAPPING)) {
    const interfaceNames = Object.keys(INTERFACE_TAG_MAPPING[namespace]);
    for (const interfaceName of interfaceNames) {
        const tagNames = INTERFACE_TAG_MAPPING[namespace][interfaceName];

        for (const tagName of tagNames) {
            if (!ret[tagName]) ret[tagName] = {};
            for (const prop in document.createElement(tagName)) {
                ret[tagName][prop] = 1;
            }
        }
    }
}
module.exports.dict = ret;

const fs = require('fs');
fs.writeFileSync(`${__dirname}/../src/prop-dict.json`, JSON.stringify(ret));
