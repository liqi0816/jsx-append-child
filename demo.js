let jsx = `
function templateA() {
    let a = (<a href="example.com">{...array}</a>);
    var ret = (<fragment>
        <div>foo1</div>
        <div>foo2</div>
    </fragment>);
    return ret;
}

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
`;

const babel = require('@babel/core');

const { code, map } = babel.transform(jsx, {  plugins: ['./src/index'], sourceMaps: 'inline'});
console.log(code);
require('fs').writeFileSync('demo-out.js', code);
