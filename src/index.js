const syntaxJSX = require("@babel/plugin-syntax-jsx").default;
const JSXAppendChildVistor = require('./vistor');

class JSXAppendChild {
    constructor(opts = {}) {
        this.opts = opts;
        this.visitor = new JSXAppendChildVistor(this.opts);
        this.plugin = {
            inherits: syntaxJSX,
            visitor: this.visitor.visitor,
        }
    }
}

module.exports = opts => new JSXAppendChild(opts).plugin;
module.exports['defalut'] = module.exports;
module.exports['JSXAppendChild'] = JSXAppendChild;
