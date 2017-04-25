require("../../build/global");
const Event = require("../../build/lib/FakeEvent").default;
const {
    add_completion_callback,
    assert_array_equals,
    assert_equals,
    assert_false,
    assert_key_equals,
    assert_not_equals,
    assert_throws,
    assert_true,
    async_test,
    createdb,
    createdb_for_multiple_tests,
    fail,
    format_value,
    indexeddb_test,
    promise_test,
    setup,
    step_timeout,
    test,
} = require("../support-node");

const document = {};
const window = global;



// Convenience function for tests that only need to run code in onupgradeneeded.
function indexeddb_upgrade_only_test(upgrade_callback, description) {
  indexeddb_test(upgrade_callback, t => { t.done(); }, description);
}

// Key that throws during conversion.
function throwing_key(name) {
    var throws = [];
    throws.length = 1;
    Object.defineProperty(throws, '0', {get: function() {
        var err = new Error('throwing from getter');
        err.name = name;
        throw err;
    }, enumerable: true});
    return throws;
}

var valid_key = [];
var invalid_key = {};

// Calls method on receiver with the specified number of args (default 1)
// and asserts that the method fails appropriately (rethrowing if
// conversion throws, or DataError if not a valid key), and that
// the first argument is fully processed before the second argument
// (if appropriate).
function check_method(receiver, method, args) {
    args = args || 1;
    if (args < 2) {
        assert_throws({name:'getter'}, () => {
            receiver[method](throwing_key('getter'));
        }, 'key conversion with throwing getter should rethrow');

        assert_throws('DataError', () => {
            receiver[method](invalid_key);
        }, 'key conversion with invalid key should throw DataError');
    } else {
        assert_throws({name:'getter 1'}, () => {
            receiver[method](throwing_key('getter 1'), throwing_key('getter 2'));
        }, 'first key conversion with throwing getter should rethrow');

        assert_throws('DataError', () => {
            receiver[method](invalid_key, throwing_key('getter 2'));
        }, 'first key conversion with invalid key should throw DataError');

        assert_throws({name:'getter 2'}, () => {
            receiver[method](valid_key, throwing_key('getter 2'));
        }, 'second key conversion with throwing getter should rethrow');

        assert_throws('DataError', () => {
            receiver[method](valid_key, invalid_key);
        }, 'second key conversion with invalid key should throw DataError');
    }
}

// Static key comparison utility on IDBFactory.
test(t => {
    check_method(indexedDB, 'cmp', 2);
}, 'IDBFactory cmp() static with throwing/invalid keys');

// Continue methods on IDBCursor.
indexeddb_upgrade_only_test((t, db) => {
    var store = db.createObjectStore('store');
    store.put('a', 1).onerror = t.unreached_func('put should succeed');

    var request = store.openCursor();
    request.onerror = t.unreached_func('openCursor should succeed');
    request.onsuccess = t.step_func(() => {
        var cursor = request.result;
        assert_not_equals(cursor, null, 'cursor should find a value');
        check_method(cursor, 'continue');
    });
}, 'IDBCursor continue() method with throwing/invalid keys');

indexeddb_upgrade_only_test((t, db) => {
    var store = db.createObjectStore('store');
    var index = store.createIndex('index', 'prop');
    store.put({prop: 'a'}, 1).onerror = t.unreached_func('put should succeed');

    var request = index.openCursor();
    request.onerror = t.unreached_func('openCursor should succeed');
    request.onsuccess = t.step_func(() => {
        var cursor = request.result;
        assert_not_equals(cursor, null, 'cursor should find a value');

        check_method(cursor, 'continuePrimaryKey', 2);
    });
}, null, 'IDBCursor continuePrimaryKey() method with throwing/invalid keys');

// Mutation methods on IDBCursor.
indexeddb_upgrade_only_test((t, db) => {
    var store = db.createObjectStore('store', {keyPath: 'prop'});
    store.put({prop: 1}).onerror = t.unreached_func('put should succeed');

    var request = store.openCursor();
    request.onerror = t.unreached_func('openCursor should succeed');
    request.onsuccess = t.step_func(() => {
        var cursor = request.result;
        assert_not_equals(cursor, null, 'cursor should find a value');

        var value = {};
        value.prop = throwing_key('getter');
        assert_throws({name: 'getter'}, () => {
            cursor.update(value);
        }, 'throwing getter should rethrow during clone');

        // Throwing from the getter during key conversion is
        // not possible since (1) a clone is used, (2) only own
        // properties are cloned, and (3) only own properties
        // are used for key path evaluation.

        value.prop = invalid_key;
        assert_throws('DataError', () => {
            cursor.update(value);
        }, 'key conversion with invalid key should throw DataError');
    });
}, 'IDBCursor update() method with throwing/invalid keys');

// Static constructors on IDBKeyRange
['only', 'lowerBound', 'upperBound'].forEach(method => {
    test(t => {
        check_method(IDBKeyRange, method);
    }, 'IDBKeyRange ' + method + '() static with throwing/invalid keys');
});

test(t => {
    check_method(IDBKeyRange, 'bound', 2);
}, 'IDBKeyRange bound() static with throwing/invalid keys');

// Insertion methods on IDBObjectStore.
['add', 'put'].forEach(method => {
    indexeddb_upgrade_only_test((t, db) => {
        var out_of_line = db.createObjectStore('out-of-line keys');
        var in_line = db.createObjectStore('in-line keys', {keyPath: 'prop'});

        assert_throws({name:'getter'}, () => {
            out_of_line[method]('value', throwing_key('getter'));
        }, 'key conversion with throwing getter should rethrow');

        assert_throws('DataError', () => {
            out_of_line[method]('value', invalid_key);
        }, 'key conversion with invalid key should throw DataError');

        var value = {};
        value.prop = throwing_key('getter');
        assert_throws({name:'getter'}, () => {
            in_line[method](value);
        }, 'throwing getter should rethrow during clone');

        // Throwing from the getter during key conversion is
        // not possible since (1) a clone is used, (2) only own
        // properties are cloned, and (3) only own properties
        // are used for key path evaluation.

        value.prop = invalid_key;
        assert_throws('DataError', () => {
            in_line[method](value);
        }, 'key conversion with invalid key should throw DataError');
    }, `IDBObjectStore ${method}() method with throwing/invalid keys`);
});

// Generic (key-or-key-path) methods on IDBObjectStore.
[
    'delete', 'get', 'getKey', 'getAll', 'getAllKeys', 'count', 'openCursor',
    'openKeyCursor'
].forEach(method => {
    indexeddb_upgrade_only_test((t, db) => {
        var store = db.createObjectStore('store');

        check_method(store, method);
    }, `IDBObjectStore ${method}() method with throwing/invalid keys`);
});

// Generic (key-or-key-path) methods on IDBIndex.
[
    'get', 'getKey', 'getAll', 'getAllKeys', 'count', 'openCursor',
    'openKeyCursor'
].forEach(method => {
    indexeddb_upgrade_only_test((t, db) => {
        var store = db.createObjectStore('store');
        var index = store.createIndex('index', 'keyPath');

        check_method(index, method);
    }, `IDBIndex ${method}() method with throwing/invalid keys`);
});
