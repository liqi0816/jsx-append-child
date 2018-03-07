# jsx-append-child
This Babel plugin allows you to turn JSX into standard DOM calls.

* General
  * comment friendly
  * sourcemap by Babel
  * document fragment
  * meaningful identifier
* Attributes
  * onlowercase for property listener
  * onUpperCase or [...callbacks] for addEventListener
  * style assignment destruction
  * React-ref attribute for callback(this)
  * className array assignment
  * WHATWG DOM properties
  * setAttribute as fallback
  * Object.assign spread attributes
* Children
  * textContent template literal assignment
  * createTextNode for complex structure
  * forEach spread child
* Injection
  * return statement substitution
  * one-to-one variable declarator substitution
  * scoped complex variable declarator

This plugin does only static analysis. It requires type hints to perform a more sophisticated transformation.
```javascript
<div style={object}></div>;
div.style = object;
/* vs */
<div style={{...object}}></div>;
Object.assign(div.style, {...object});

<div class={array}></div>;
div.className = array;
/* vs */
<div class={[...array]}></div>;
div.className = [...array].join(" ");

<div>{array}</div>
div.textContent = array;
/* vs */
<div>{...array}</div>
div1.append(...array);
```

## Usage
This plugin is currently at very alpha stage. Check the generated code before use in production.

### Via `.babelrc` (Recommended)
```javascript
{
  "plugins": [
    ["/install/path/src/index", {   // defaults
      "prefix":                     "",     // of identifiers
      "variableDeclarationKind":    "const",
      "documentNamespace":          "document",
      "createElementName":          "createElement",
      "createDocumentFragmentName": "createDocumentFragment",
      "createTextNodeName":         "createTextNode"
    }]
  ]
}
```

### Via Node API
```javascript
require('babel-core').transform(jsx, {
    plugins: [['/install/path/src/index', { prefix: '' }]],
    sourceMaps: 'inline'
});
```

## Example
### In
```javascript
function templateA() {
    let a = (<a href="example.com">{...array}</a>);
    var ret = (<fragment>
        <div>foo1</div>
        <div>foo2</div>
    </fragment>);
    return ret;
}
```

### Out
```javascript
function templateA() {
    let a = document.createElement("a");
    a.href = "example.com";
    a.append(...array);
    var ret = document.createDocumentFragment();
    {
        const div = document.createElement("div");
        div.textContent = "foo1";
        ret.append(div);
        const div1 = document.createElement("div");
        div1.textContent = "foo2";
        ret.append(div1);
    }
    return ret;
}
```

### In
```javascript
function templateB() {
    const ref_cb = e => console.log(e);
    /* this is a comment */
    return (<button 
        id="static_button_id"
        title="click me"
        class={["btn", ...others]}
        onClick={[...eventListeners]}
        onclick={propListener}
        ref={ref_cb}
        style={{display: 'none', backgroundColor: 'red'}}
        >button</button>);
}
```

### Out
```javascript
function templateB() {
    const ref_cb = e => console.log(e);
    /* this is a comment */
    const static_button_id = document.createElement("button");
    static_button_id.id = "static_button_id";
    static_button_id.title = "click me";
    static_button_id.className = ["btn", ...others].join(" ");
    [...eventListeners].forEach(static_button_id_cb => static_button_id.addEventListener("click", static_button_id_cb));
    static_button_id.onclick = propListener;
    ref_cb(static_button_id);
    static_button_id.style.display = 'none';
    static_button_id.style.backgroundColor = 'red';
    static_button_id.textContent = "button";
    return static_button_id;
}
```

### In
```javascript
function templateC() {
    return true ? (
    <div {...attrs}>
        non-leaf node will be trimmed
        <p>
        Lorem ipsum dolor 
        {sit} amet, {consectetur}
        adipiscing elit.
        </p>
    </div>
    ) : null;
}
```

### Out
```javascript
function templateC() {
    return true ? (() => {
        const div = document.createElement("div");
        Object.assign(div, attrs);
        div.append("non-leaf node will be trimmed");
        const p = document.createElement("p");
        p.textContent = `
        Lorem ipsum dolor 
        ${sit} amet, ${consectetur}
        adipiscing elit.
        `;
        div.append(p);
        return div;
    })() : null;
}
```
