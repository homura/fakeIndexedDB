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
      record = { key: 1, property: "data" };

    var open_rq = createdb(t);
    open_rq.onupgradeneeded = function(e) {
        db = e.target.result;
        var objStore = db.createObjectStore("store", { keyPath: "key" });
        objStore.add(record);

        var rq = objStore.add(record);
        rq.onsuccess = fail(t, "success on adding duplicate record")

        rq.onerror = t.step_func(function(e) {
            assert_equals(e.target.error.name, "ConstraintError");
            assert_equals(rq.error.name, "ConstraintError");
            assert_equals(e.type, "error");

            e.preventDefault();
            e.stopPropagation();
        });
    };

    // Defer done, giving rq.onsuccess a chance to run
    open_rq.onsuccess = function(e) {
        t.done();
    }
