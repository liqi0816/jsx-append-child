const t = require('babel-types');

class JSXAppendChildBuilder {
    constructor(opts = {}) {
        this.opts = opts;
        this.opts.variableDeclarationKind = this.opts.variableDeclarationKind || 'const';
        this.opts.documentNamespace = this.opts.documentNamespace || 'document';
        this.opts.createElementName = this.opts.createElementName || 'createElement';
        this.opts.createDocumentFragmentName = this.opts.createDocumentFragmentName || 'createDocumentFragment';
    }

    createElementIdentifier() {
        return t.memberExpression(
            t.identifier(this.opts.documentNamespace),
            t.identifier(this.opts.createElementName),
        );
    }

    createDocumentFragmentIdentifier() {
        return t.memberExpression(
            t.identifier(this.opts.documentNamespace),
            t.identifier(this.opts.createDocumentFragmentName),
        );
    }

    arrowFunctionClosure(statements) {
        return t.callExpression(t.arrowFunctionExpression([], t.blockStatement(statements)), []);
    }

    blockExpressionStatement(expression) {
        return t.blockStatement([t.expressionStatement(expression)]);
    }

    constCreateElement(id, tagName) {
        return t.variableDeclaration(this.opts.variableDeclarationKind, [
            t.variableDeclarator(
                t.identifier(id),
                t.callExpression(this.createElementIdentifier(), [t.stringLiteral(tagName)]),
            )
        ]);
    }

    constCreateFragment(id) {
        return t.variableDeclaration(this.opts.variableDeclarationKind, [
            t.variableDeclarator(
                t.identifier(id),
                t.callExpression(this.createDocumentFragmentIdentifier(), []),
            )
        ]);
    }

    assign(id, expression) {
        return t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.identifier(id),
                expression
            )
        );
    }

    assignMember(id, member, expression) {
        return t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(
                    t.identifier(id),
                    t.identifier(member)
                ),
                expression
            )
        );
    }

    assignMemberMember(id, member, member2, expression) {
        return t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(
                    t.memberExpression(
                        t.identifier(id),
                        t.identifier(member)
                    ),
                    t.identifier(member2)
                ),
                expression
            )
        );
    }

    returnId(id) {
        return t.returnStatement(
            t.identifier(id)
        );
    }

    appendId(id, id2) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('append')
                ),
                [t.identifier(id2)]
            )
        );
    }

    assignTextContentExpression(id, expression) {
        return t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('textContent')
                ),
                expression
            )
        );
    }

    assignTextContentTemplateLiteral(id, quasis, expressions) {
        return t.expressionStatement(
            t.assignmentExpression(
                '=',
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('textContent')
                ),
                t.templateLiteral(quasis, expressions)
            )
        );
    }

    appendExpression(id, expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('append')
                ),
                [expression]
            )
        );
    }

    addEventListener(id, event, expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('addEventListener')
                ),
                [t.stringLiteral(event), expression]
            )
        );
    }

    objectAssign(id, ...expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier('Object'),
                    t.identifier('assign')
                ),
                [t.identifier(id), ...expression]
            )
        );
    }

    objectAssignMember(id, member, ...expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier('Object'),
                    t.identifier('assign')
                ),
                [t.memberExpression(
                    t.identifier(id),
                    t.identifier(member)
                ), ...expression]
            )
        );
    }

    isObjectConditional(value, consequent, alternate) {
        return t.conditionalExpression(
            t.logicalExpression(
                '&&',
                value,
                t.binaryExpression(
                    '===',
                    t.unaryExpression('typeof', value),
                    t.stringLiteral('object')
                )
            ),
            consequent, alternate
        )
    }

    callReference(id, expression) {
        return t.expressionStatement(
            t.callExpression(
                expression,
                [t.identifier(id)]
            )
        );
    }

    arrayJoinSpace(expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    expression,
                    t.identifier('join')
                ),
                [t.stringLiteral(' ')]
            )
        );
    }

    arrayForEachAddEventListener(id, event, expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    expression,
                    t.identifier('forEach')
                ),
                [t.arrowFunctionExpression(
                    [t.identifier(`${id}_cb`)],
                    t.callExpression(
                        t.memberExpression(
                            t.identifier(id),
                            t.identifier('addEventListener')
                        ),
                        [t.stringLiteral(event), t.identifier(`${id}_cb`)]
                    )
                )]
            )
        )
    }

    appendSpread(id, expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('append')
                ),
                [t.spreadElement(expression)]
            )
        );
    }

    setAttribute(id, attribute, expression) {
        return t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    t.identifier(id),
                    t.identifier('setAttribute')
                ),
                [t.stringLiteral(attribute), expression]
            )
        )
    }
}

module.exports = JSXAppendChildBuilder;
module.exports['default'] = module.exports;