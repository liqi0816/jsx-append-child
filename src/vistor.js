const assert = require('assert');
const t = require('@babel/types');
const JSXAppendChildBuilder = require('./builder');
const propDict = require('./prop-dict');
const attrPropDict = require('./attr-prop-dict');

class JSXAppendChildVistor {
    constructor(opts = {}) {
        this.opts = opts;
        this.opts.prefix = this.opts.prefix || '';

        this.builder = new JSXAppendChildBuilder(this.opts);

        this.visitor = {};
        this.visitor['JSXElement'] = { enter: this.enter.bind(this) };

        this.elementVisitor = {};
        this.elementVisitor['JSXElement'] = { enter: this.elementEnter.bind(this), exit: this.elementExit.bind(this) };
    }

    /***
     * Top most JSXElement => an expression or possibly many statements
     */

    enter(path, file) {
        // 1. param must be a top most JSXElement or JSXFragment
        assert(path.parent.type !== 'JSXElement' && path.parent.type !== 'JSXFragment');

        // 2. mark this JSXElement as finished
        path.skip();

        // 3. build correct scope

        // 3.1 parent is return statement 
        //     => end of scope
        //     => can do whatever thing
        //     => anchor in this return
        if (path.parent.type === 'ReturnStatement' && path.parent.argument === path.node) {
            // 3.1.1 transpile openingElement
            path.node.jsxac = this.transpileOpeningElement(path, file);
            const { id, statements } = path.node.jsxac;

            // 3.1.2 transpile each child on their own
            path.traverse(this.elementVisitor, file);

            // 3.1.3 transpile children
            statements.push(...this.transpileChildren(path));

            // 3.1.4 substitude return statement
            path.parentPath.replaceWith(t.inherits(
                this.builder.returnId(id),
                path.parent
            ));

            // 3.1.5 inject statements
            statements.forEach(e => e.start = e.end = undefined);
            path.parentPath.insertBefore(statements);
        }

        // 3.2 parent is simple one-to-one variable declarator 
        //     => substitude variable declarator
        //     => one declarator
        //     => no JSXElement child
        //     => anchor in this block
        else if (path.parent.type === 'VariableDeclarator'
            && path.parent.id.type === 'Identifier'
            && path.parentPath.parent.declarations.length === 1
            && path.node.children.every(e => e.type !== 'JSXElement' && e.type !== 'JSXFragment')) {
            // 3.2.1 extract parent declarator
            const id = path.parent.id.name;
            path.node.jsxac = { id };

            // 3.2.2 transpile openingElement
            path.node.jsxac = this.transpileOpeningElement(path, file);
            const { statements } = path.node.jsxac;

            // 3.2.3 transpile children
            statements.push(...this.transpileChildren(path));

            // 3.2.4 substitude declarator
            path.parentPath.replaceWith(t.inherits(
                t.variableDeclarator(
                    statements[0].declarations[0].id,
                    statements[0].declarations[0].init
                ),
                path.parent
            ));
            statements.shift();

            // 3.2.5 inject statements
            statements.forEach(e => e.start = e.end = undefined);
            path.parentPath.parentPath.insertAfter(statements);
        }

        // 3.3 parent is complex variable declarator 
        //     => squash outtest variable declarator
        //     => everything else in another scope
        //     => anchor in a block if possible
        else if (path.parent.type === 'VariableDeclarator'
            && path.parent.id.type === 'Identifier'
            && this.builder.opts['variableDeclarationKind'] !== 'var') {
            // 3.3.1 extract parent declarator
            const kind = path.parentPath.parent.kind;
            const id = path.parent.id.name;
            path.node.jsxac = { id };

            // 3.3.2 create a block scope
            const [blockPath] = path.parentPath.parentPath.insertBefore(t.inherits(
                this.builder.blockExpressionStatement(path.node), path.node
            ));
            path.parentPath.remove();
            path = blockPath.get('body')[0].get('expression');

            // 3.3.3 transpile openingElement
            path.node.jsxac = this.transpileOpeningElement(path, file);
            const { statements } = path.node.jsxac;

            // 3.3.4 transpile each child on their own
            path.traverse(this.elementVisitor, file);

            // 3.3.5 transpile children
            statements.push(...this.transpileChildren(path));

            // 3.3.6 squash and inject declaration
            statements.forEach(e => e.start = e.end = undefined);
            statements[0].kind = kind;
            blockPath.insertBefore(statements.shift());

            // 3.3.6 inject the rest of statements
            path.parentPath.replaceWithMultiple(statements);
        }

        // 3.4 parent is simple arrow function expression 
        //     => end of scope
        //     => can do whatever thing
        //     => anchor in arrow function body expression
        if (path.parent.type === 'ArrowFunctionExpression' && path.parent.body === path.node) {
            // 3.4.1 transpile openingElement
            path.node.jsxac = this.transpileOpeningElement(path, file);
            const { id, statements } = path.node.jsxac;

            // 3.4.2 transpile each child on their own
            path.traverse(this.elementVisitor, file);

            // 3.4.3 transpile children
            statements.push(...this.transpileChildren(path));

            // 3.4.4 add return statement
            statements.push(t.inherits(
                this.builder.returnId(id),
                path.parent
            ));

            // 3.4.5 inject statements
            statements.forEach(e => e.start = e.end = undefined);
            path.replaceWith(t.blockStatement(statements));
        }

        // 3.5 otherwise
        //     => create another scope
        //     => should be an expression
        //     => anchor in a closure
        else {
            // 3.5.1 create a closure scope
            path.replaceWith(this.builder.arrowFunctionClosure([t.expressionStatement(path.node)]));
            path = path.get('callee').get('body').get('body')[0].get('expression');

            // 3.5.2 transpile openingElement
            path.node.jsxac = this.transpileOpeningElement(path, file);
            const { id, statements } = path.node.jsxac;

            // 3.5.3 transpile each child on their own
            path.traverse(this.elementVisitor, file);

            // 3.5.4 transpile children
            statements.push(...this.transpileChildren(path));

            // 3.5.5 build return statement
            statements.push(t.inherits(this.builder.returnId(id), path.node));

            // 3.5.6 inject statements
            statements.forEach(e => e.start = e.end = undefined);
            path.parentPath.replaceWithMultiple(statements);
        }
    }

    /***
     * JSXElement => openingElement + children
     * build time       (enter)        (exit)
     */

    elementEnter(path, file) {
        path.node.jsxac = this.transpileOpeningElement(path, file);
    }

    elementExit(path, file) {
        path.node.jsxac.statements.push(...this.transpileChildren(path, file));
    }

    transpileOpeningElement(path, file) {
        const statements = [];

        const openingElement = path.get('openingElement');

        // 1. param must be a JSXOpeningElement
        assert(openingElement.node.type === 'JSXOpeningElement');

        // 2.1 React.Fragment => fragment
        if (openingElement.node.name.type === 'JSXMemberExpression') {
            if (openingElement.node.name.property.name.match(/fragment/i)) {
                openingElement.node.name.property.name = 'fragment';
                openingElement.get('name').replaceWith(openingElement.node.name.property);
            }
            else {
                throw new Error('jsx-append-child plugin does not support React Classes except React.Fragment (alias of <fragment />)\nPlease use the full version of React');
            }
        }

        // 2.2 extract tagName
        assert(openingElement.node.name.type === 'JSXIdentifier')
        const tagName = openingElement.node.name.name;

        // 3.1 extract predefined id if it exists
        const idPredefinedValue = path.node.jsxac && path.node.jsxac.id;

        // 3.2 extract static attribute id if it exists
        const idAttr = openingElement.node.attributes.find(
            e => e.type === 'JSXAttribute' && e.name.name === 'id' && e.value.type === 'StringLiteral'
        );
        const idAttrValue = idAttr && idAttr.value.value;

        // 3.3 find a good `const ${id}`
        const id = idPredefinedValue || this.generatePrefixedUid(openingElement.scope, idAttrValue || tagName);

        // 3.4.1 fragment => `const ${id} = document.createDocumentFragment()`
        if (tagName === 'fragment') {
            statements.push(
                t.inherits(this.builder.constCreateFragment(id, file), openingElement.node.name)
            );
        }
        // 3.4.2 otherwise => `const ${id} = document.createElement(${tagName})`
        else {
            statements.push(
                t.inherits(this.builder.constCreateElement(id, tagName, file), openingElement.node.name)
            );
        }
        openingElement.scope.getProgramParent().references[id] = true;

        // 4. extract and transpile attributes
        for (const attr of openingElement.node.attributes) {

            // 4.1 JSXAttribute => more sophisticated scheme
            if (attr.type === 'JSXAttribute') {
                const name = attrPropDict[attr.name.name] || Object.keys(propDict[tagName] || {}).find(e => e.toLowerCase() === attr.name.name) || attr.name.name;
                const value = attr.value ? attr.value.expression ? attr.value.expression : attr.value : t.stringLiteral('');

                // 4.1.1 transpile `on${event}` handlers
                if (name.startsWith('on')) {
                    const event = name.slice(2).toLowerCase();

                    // 4.1.1.1 ArrayExpression => addEventListener
                    if (value.type === 'ArrayExpression') {
                        statements.push(
                            t.inherits(this.builder.arrayForEachAddEventListener(id, event, value), attr)
                        );
                    }

                    // 4.1.1.2 React-like onClick => addEventListener
                    else if (name[2].charCodeAt() > 64 && name[2].charCodeAt() < 91) {
                        statements.push(
                            t.inherits(this.builder.addEventListener(id, event, value), attr)
                        );
                    }

                    // 4.1.1.3 otherwise => simply assign
                    else {
                        statements.push(
                            t.inherits(this.builder.assignMember(id, name, value), attr)
                        );
                    }
                }

                // 4.1.2 transpile style
                else if (name === 'style') {

                    // 4.1.2.1 ObjectExpression
                    if (value.type === 'ObjectExpression') {

                        // 4.1.2.1.1 plain-text JSON => destruction
                        if (value.properties.every(e => e.type === 'ObjectProperty')) {
                            value.properties.forEach(({ key: { name: key }, value }) => {
                                statements.push(
                                    t.inherits(this.builder.assignMemberMember(id, name, key, value), attr)
                                );
                            });
                        }

                        // 4.1.2.1.2 SpreadElement => Object.assign
                        else {
                            statements.push(
                                t.inherits(this.builder.objectAssignMember(id, name, value), attr)
                            );
                        }
                    }

                    // 4.1.2.2 otherwise => simply assign
                    else {
                        statements.push(
                            t.inherits(this.builder.assignMember(id, name, value), attr)
                        );
                    }
                }

                // 4.1.2 transpile React-ref
                else if (name === 'ref') {
                    statements.push(
                        t.inherits(this.builder.callReference(id, value), attr)
                    );
                }

                // 4.1.3 transpile className and classList
                else if (name === 'className' || name === 'classList') {

                    // 4.1.3.1 ArrayExpression => join(' ')
                    if (value.type === 'ArrayExpression') {
                        statements.push(
                            t.inherits(this.builder.assignMember(
                                id, name,
                                this.builder.arrayJoinSpace(value).expression
                            ), attr)
                        );
                    }

                    // 4.1.3.2 otherwise => simply assign
                    else {
                        statements.push(
                            t.inherits(this.builder.assignMember(id, name, value), attr)
                        );
                    }
                }

                // 4.1.4 transpile dom properties
                else if (propDict[tagName] && propDict[tagName][name]) {
                    statements.push(
                        t.inherits(this.builder.assignMember(id, name, value), attr)
                    );
                }

                // 4.1.5 otherwise => setAttribute
                else {
                    statements.push(
                        t.inherits(this.builder.setAttribute(id, name, value), attr)
                    );
                }
            }

            // 4.2 JSXSpreadAttribute => Object.assign
            else if (attr.type === 'JSXSpreadAttribute') {
                statements.push(
                    t.inherits(this.builder.objectAssign(id, attr.argument), attr)
                );
            }
        }

        return { id, statements };
    }

    generatePrefixedUid(scope, name = 'temp') {
        name = t.toIdentifier(name);

        let uid;
        let i = 0;
        do {
            uid = `${this.opts.prefix || ''}${name}${i || ''}`;
            i++;
        } while (scope.hasLabel(uid) || scope.hasBinding(uid) || scope.hasGlobal(uid) || scope.hasReference(uid));

        return uid;
    }

    transpileChildren(path, file) {
        const statements = [];

        const { children } = path.node;
        const { id } = path.node.jsxac;

        // 1. node must have an id
        assert(id);

        // 2. nochildren => skip
        if (!children || !children.length) return statements;

        // 3. leaf node => textContent
        if (children.every(e => e.type === 'JSXText' || e.type === 'JSXExpressionContainer')) {

            // 3.1 single JSXTextNode => textContent = stringLiteral
            if (children.length === 1 && children[0].type === 'JSXText' && children[0].value.trim()) {
                const stringLiteral = t.inherits(
                    children[0].value.includes('\n') ?
                        t.templateLiteral([t.templateElement({ raw: children[0].value })], []) :
                        t.stringLiteral(children[0].value),
                    children[0]);
                statements.push(
                    t.inherits(this.builder.assignTextContentExpression(id, stringLiteral), path.node.closingElement)
                );
            }

            // 3.2 single JSXExpressionContainer => textContent = expression
            else if (children.length === 1 && children[0].type === 'JSXExpressionContainer') {
                const expression = t.inherits(children[0].expression, children[0])
                statements.push(
                    t.inherits(this.builder.assignTextContentExpression(id, expression), path.node.closingElement)
                );
            }

            // 3.3 otherwise => `quasi${expression}`
            else {
                const quasis = [];
                const expressions = [];

                // 3.3.1 the first element should be a quasi
                if (children.length && children[0].type !== 'JSXText') {
                    quasis.push(t.templateElement({ raw: '' }));
                }

                // 3.3.2 split quasis and expresions
                for (const child of children) {
                    if (child.type === 'JSXText') {
                        quasis.push(t.inherits(t.templateElement({ raw: child.value }), child));
                    }
                    else if (child.type === 'JSXExpressionContainer') {
                        expressions.push(child.expression);
                    }
                }

                // 3.3.3 the last element should be a quasi
                if (children.length && children[children.length - 1].type !== 'JSXText') {
                    quasis.push(t.templateElement({ raw: '' }));
                }

                // 3.3.4 build templateLiteral
                statements.push(
                    t.inherits(this.builder.assignTextContentTemplateLiteral(id, quasis, expressions), path.node.closingElement)
                );
            }
        }

        // 4. complex parent node => collect children
        else {
            for (const child of children) {

                // 4.1 JSXElement => flatten statements
                if (child.type === 'JSXElement') {
                    statements.push(...child.jsxac.statements);
                    statements.push(t.inherits(this.builder.appendId(id, child.jsxac.id), child));
                }

                // 4.2 JSXText => append
                else if (child.type === 'JSXText' && this.trimJSXText(child)) {
                    const stringLiteral = t.inherits(t.stringLiteral(this.trimJSXText(child)), child);
                    statements.push(
                        t.inherits(this.builder.appendExpression(id, stringLiteral), child)
                    );
                }

                // 4.3 JSXExpressionContainer => append
                else if (child.type === 'JSXExpressionContainer') {
                    statements.push(
                        t.inherits(this.builder.appendExpression(id, child.expression), child)
                    );
                }

                // 4.4 JSXSpreadChild => append
                else if (child.type === 'JSXSpreadChild') {
                    statements.push(
                        t.inherits(this.builder.appendSpread(id, child.expression), child)
                    );
                }
            }
        }

        return statements;
    }

    trimJSXText(node) {
        assert(node.type === 'JSXText');
        const { value } = node;

        return value
            .split(/\r\n|\n|\r/)
            .map((e, i, { length }) =>
                i === 0 ?
                    e.replace(/\s/g, ' ').trimRight() :
                    i === length - 1 ?
                        e.replace(/\s/g, ' ').trimLeft() :
                        e.replace(/\s/g, ' ').trim()
            )
            .filter(e => e)
            .join(' ');
    }
}

module.exports = JSXAppendChildVistor;
module.exports["default"] = module.exports;
