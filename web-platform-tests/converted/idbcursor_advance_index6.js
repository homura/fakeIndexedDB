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


    var db,
        t = async_test(),
        records = [{ pKey: "primaryKey_0", iKey: "indexKey_0" },
                   { pKey: "primaryKey_1", iKey: "indexKey_1" }];

    var open_rq = createdb(t);
    open_rq.onupgradeneeded = function (event) {
        db = event.target.result;
        var objStore = db.createObjectStore("store", {keyPath : "pKey"});
        objStore.createIndex("index", "iKey");
        for (var i = 0; i < records.length; i++) {
            objStore.add(records[i]);
        }
        var rq = objStore.index("index").openCursor();
        rq.onsuccess = t.step_func(function(event) {
            var cursor = event.target.result;
            assert_true(cursor instanceof IDBCursor);

            assert_throws(new TypeError(), function() {
                cursor.advance(0);
            }, "Calling advance() with count argument 0 should throw TypeError.");

            t.done();
        });
    }
