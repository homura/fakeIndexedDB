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


var t = async_test(),
    open_rq = createdb(t);

open_rq.onupgradeneeded = function (e) {
    var db = e.target.result;
    db.createObjectStore("store");
    assert_throws("ConstraintError", function(){
        db.createObjectStore("store", {
            keyPath: "key1",
        });
    });
    t.done();
}
