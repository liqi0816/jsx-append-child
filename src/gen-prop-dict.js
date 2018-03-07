// append to node_modules/jsdom/lib/jsdom/living/register-elements.js

const ret = {};
for (const ns of Object.keys(mappings)) {
    const interfaces = mappings[ns];

    for (const interfaceName of Object.keys(interfaces)) {
        const { file, tags } = interfaces[interfaceName];

        for (const tagName of tags) {
            if (!ret[tagName]) ret[tagName] = {};
            for (const prop in file.interface.prototype) {
                ret[tagName][prop] = 1;
            }
        }
    }
}
module.exports.dict = ret;

const fs = require('fs');
fs.writeFileSync('./prop-dict.json', JSON.stringify(ret));
