require("../../build/global.js");
const {
    add_completion_callback,
    assert_array_equals,
    assert_equals,
    assert_false,
    assert_not_equals,
    assert_throws,
    assert_true,
    async_test,
    createdb,
    createdb_for_multiple_tests,
    fail,
    format_value,
    indexeddb_test,
    setup,
    test,
} = require("../support-node.js");

const document = {};
const window = global;



function load_iframe(src, sandbox) {
  return new Promise(resolve => {
    const iframe = document.createElement('iframe');
    iframe.onload = () => { resolve(iframe); };
    if (sandbox)
      iframe.sandbox = sandbox;
    iframe.srcdoc = src;
    iframe.style.display = 'none';
    document.documentElement.appendChild(iframe);
  });
}

function wait_for_message(iframe) {
  return new Promise(resolve => {
    self.addEventListener('message', function listener(e) {
      if (e.source === iframe.contentWindow) {
        resolve(e.data);
        self.removeEventListener('message', listener);
      }
    });
  });
}

const script =
  '<script>' +
  '  window.onmessage = () => {' +
  '    try {' +
  '      indexedDB.deleteDatabase("opaque-origin-test");' +
  '      const r = indexedDB.open("opaque-origin-test");' +
  '      r.onupgradeneeded = () => { r.transaction.abort(); };' +
  '      window.parent.postMessage({result: "no exception"}, "*");' +
  '    } catch (ex) {' +
  '      window.parent.postMessage({result: ex.name}, "*");' +
  '    };' +
  '  };' +
  '<\/script>';

promise_test(t => {
  return load_iframe(script)
    .then(iframe => {
      iframe.contentWindow.postMessage({}, '*');
      return wait_for_message(iframe);
    })
    .then(message => {
      assert_equals(message.result, 'no exception',
                    'IDBFactory.open() should not throw');
    });
}, 'IDBFactory.open() in non-sandboxed iframe should not throw');

promise_test(t => {
  return load_iframe(script, 'allow-scripts')
    .then(iframe => {
      iframe.contentWindow.postMessage({}, '*');
      return wait_for_message(iframe);
    })
    .then(message => {
      assert_equals(message.result, 'SecurityError',
                    'Exception should be SecurityError');
    });
}, 'IDBFactory.open() in sandboxed iframe should throw SecurityError');
