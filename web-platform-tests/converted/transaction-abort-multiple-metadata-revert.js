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


'use strict';

promise_test(testCase => {
    let store = null, index = null;
    let migrationTransaction = null, migrationDatabase = null;
    return createDatabase(testCase, (database, transaction) => {
        createBooksStore(testCase, database);
    }).then(database => {
        database.close();
    }).then(() => migrateDatabase(testCase, 2, (database, transaction) => {
        store = createNotBooksStore(testCase, database);
        migrationDatabase = database;
        migrationTransaction = transaction;
        assert_array_equals(
            database.objectStoreNames, ['books', 'not_books'],
            'IDBDatabase.objectStoreNames should include a newly created ' +
            'store before the transaction is aborted');
        assert_array_equals(
            transaction.objectStoreNames, ['books', 'not_books'],
            'IDBTransaction.objectStoreNames should include a newly created ' +
            'store before the transaction is aborted');

        index = store.index('not_by_author');
        store.deleteIndex('not_by_author');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is marked for deletion, immediately after ' +
            'IDBObjectStore.deleteIndex() returns');
        assert_array_equals(
            store.indexNames, ['not_by_title'],
            'IDBObjectStore.indexNames should not include the deleted index ' +
            'immediately after IDBObjectStore.deleteIndex() returns');

        transaction.abort();
        assert_throws(
            'InvalidStateError', () => store.get('query'),
            'IDBObjectStore.get should throw InvalidStateError, indicating ' +
            'that the store is marked for deletion, immediately after ' +
            'IDBTransaction.abort() returns');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is still marked for deletion, immediately after ' +
            'IDBTransaction.abort() returns');
        assert_array_equals(
            transaction.objectStoreNames, ['books'],
            'IDBTransaction.objectStoreNames should stop including the newly ' +
            'created store immediately after IDBTransaction.abort() returns');
        assert_array_equals(
            database.objectStoreNames, ['books'],
            'IDBDatabase.objectStoreNames should stop including the newly ' +
            'created store immediately after IDBTransaction.abort() returns');
        assert_array_equals(
            store.indexNames, [],
            'IDBObjectStore.indexNames for the newly created store should be ' +
            'empty immediately after IDBTransaction.abort() returns');
    })).then(() => {
        assert_throws(
            'InvalidStateError', () => store.get('query'),
            'IDBObjectStore.get should throw InvalidStateError, indicating ' +
            'that the store is marked for deletion, after the transaction is ' +
            'aborted');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is still marked for deletion, after the transaction ' +
            'is aborted');
        assert_array_equals(
            migrationDatabase.objectStoreNames, ['books'],
            'IDBDatabase.objectStoreNames should stop including the newly ' +
            'created store after the transaction is aborted');
        assert_array_equals(
            migrationTransaction.objectStoreNames, ['books'],
            'IDBTransaction.objectStoreNames should stop including the newly ' +
            'created store after the transaction is aborted');
        assert_array_equals(
            store.indexNames, [],
            'IDBObjectStore.indexNames for the newly created store should be ' +
            'empty after the transaction is aborted');
    });
}, 'Deleted indexes in newly created stores are still marked as deleted ' +
    'after the transaction aborts');

promise_test(testCase => {
    let store = null, index = null;
    let migrationTransaction = null, migrationDatabase = null;
    return createDatabase(testCase, (database, transaction) => {
        createBooksStore(testCase, database);
        createNotBooksStore(testCase, database);
    }).then(database => {
        database.close();
    }).then(() => migrateDatabase(testCase, 2, (database, transaction) => {
        migrationDatabase = database;
        migrationTransaction = transaction;
        store = transaction.objectStore('not_books');
        index = store.index('not_by_author');
        store.deleteIndex('not_by_author');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is marked for deletion, immediately after ' +
            'IDBObjectStore.deleteIndex() returns');
        assert_array_equals(
            store.indexNames, ['not_by_title'],
            'IDBObjectStore.indexNames should not include the deleted index ' +
            'immediately after IDBObjectStore.deleteIndex() returns');

        database.deleteObjectStore('not_books');
        assert_throws(
            'InvalidStateError', () => store.get('query'),
            'IDBObjectStore.get should throw InvalidStateError, indicating ' +
            'that the store is marked for deletion, immediately after ' +
            'IDBDatabase.deleteObjectStore() returns');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is still marked for deletion, immediately after ' +
            'IDBObjectStore.deleteIndex() returns');
        assert_array_equals(
            transaction.objectStoreNames, ['books'],
            'IDBTransaction.objectStoreNames should stop including the ' +
            'deleted store immediately after IDBDatabase.deleteObjectStore() ' +
            'returns');
        assert_array_equals(
            database.objectStoreNames, ['books'],
            'IDBDatabase.objectStoreNames should stop including the newly ' +
            'created store immediately after IDBDatabase.deleteObjectStore() ' +
            'returns');
        assert_array_equals(
            store.indexNames, [],
            'IDBObjectStore.indexNames for the deleted store should be empty ' +
            'immediately after IDBDatabase.deleteObjectStore() returns');

        transaction.abort();
        assert_throws(
            'TransactionInactiveError', () => store.get('query'),
            'IDBObjectStore.get should throw TransactionInactiveError, ' +
            'indicating that the store is no longer marked for deletion, ' +
            'immediately after IDBTransaction.abort() returns');
        assert_throws(
            'TransactionInactiveError', () => index.get('query'),
            'IDBIndex.get should throw TransactionInactiveError, indicating ' +
            'that the index is no longer marked for deletion, immediately ' +
            'after IDBObjectStore.deleteIndex() returns');
        assert_array_equals(
            database.objectStoreNames, ['books', 'not_books'],
            'IDBDatabase.objectStoreNames should include the deleted store ' +
            'store immediately after IDBTransaction.abort() returns');
        assert_array_equals(
            transaction.objectStoreNames, ['books', 'not_books'],
            'IDBTransaction.objectStoreNames should include the deleted ' +
            'store immediately after IDBTransaction.abort() returns');
        assert_array_equals(
            store.indexNames, ['not_by_author', 'not_by_title'],
            'IDBObjectStore.indexNames for the deleted store should not be ' +
            'empty any more immediately after IDBTransaction.abort() returns');
    })).then(() => {
        assert_throws(
            'TransactionInactiveError', () => store.get('query'),
            'IDBObjectStore.get should throw TransactionInactiveError, ' +
            'indicating that the store is no longer marked for deletion, ' +
            'after the transaction is aborted');
        assert_throws(
            'TransactionInactiveError', () => index.get('query'),
            'IDBIndex.get should throw TransactionInactiveError, indicating ' +
            'that the index is no longer marked for deletion, after the ' +
            'transaction is aborted');
        assert_array_equals(
            migrationDatabase.objectStoreNames, ['books', 'not_books'],
            'IDBDatabase.objectStoreNames should include the previously ' +
            'deleted store after the transaction is aborted');
        assert_array_equals(
            migrationTransaction.objectStoreNames, ['books', 'not_books'],
            'IDBTransaction.objectStoreNames should include the previously ' +
            'deleted store after the transaction is aborted');
        assert_array_equals(
            store.indexNames, ['not_by_author', 'not_by_title'],
            'IDBObjectStore.indexNames for the deleted store should not be ' +
            'empty after the transaction is aborted');
    });
}, 'Deleted indexes in deleted stores are still marked as not-deleted after ' +
    'the transaction aborts');

promise_test(testCase => {
    let store = null, index = null;
    let migrationTransaction = null, migrationDatabase = null;
    return createDatabase(testCase, (database, transaction) => {
        createBooksStore(testCase, database);
    }).then(database => {
        database.close();
    }).then(() => migrateDatabase(testCase, 2, (database, transaction) => {
        store = createNotBooksStore(testCase, database);
        migrationDatabase = database;
        migrationTransaction = transaction;
        index = store.index('not_by_author');
        store.deleteIndex('not_by_author');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is marked for deletion, immediately after ' +
            'IDBObjectStore.deleteIndex() returns');
        assert_array_equals(
            store.indexNames, ['not_by_title'],
            'IDBObjectStore.indexNames should not include the deleted index ' +
            'immediately after IDBObjectStore.deleteIndex() returns');

        database.deleteObjectStore('not_books');
        assert_throws(
            'InvalidStateError', () => store.get('query'),
            'IDBObjectStore.get should throw InvalidStateError, indicating ' +
            'that the store is marked for deletion, immediately after ' +
            'IDBDatabase.deleteObjectStore() returns');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is still marked for deletion, immediately after ' +
            'IDBDatabase.deleteObjectStore() returns');
        assert_array_equals(
            transaction.objectStoreNames, ['books'],
            'IDBTransaction.objectStoreNames should stop including the ' +
            'deleted store immediately after IDBDatabase.deleteObjectStore() ' +
            'returns');
        assert_array_equals(
            database.objectStoreNames, ['books'],
            'IDBDatabase.objectStoreNames should stop including the newly ' +
            'created store immediately after IDBDatabase.deleteObjectStore() ' +
            'returns');
        assert_array_equals(
            store.indexNames, [],
            'IDBObjectStore.indexNames should be empty immediately after ' +
            'IDBDatabase.deleteObjectStore() returns');

        transaction.abort();
        assert_throws(
            'InvalidStateError', () => store.get('query'),
            'IDBObjectStore.get should throw InvalidStateError, indicating ' +
            'that the store is still marked for deletion, immediately after ' +
            'IDBTransaction.abort() returns');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is still marked for deletion, immediately after ' +
            'IDBTransaction.abort() returns');
        assert_array_equals(
            transaction.objectStoreNames, ['books'],
            'IDBTransaction.objectStoreNames should not include the newly ' +
            'created store immediately after IDBTransaction.abort() returns');
        assert_array_equals(
            database.objectStoreNames, ['books'],
            'IDBDatabase.objectStoreNames should not include the newly ' +
            'created store immediately after IDBTransaction.abort() returns');
        assert_array_equals(
            store.indexNames, [],
            'IDBObjectStore.indexNames should be empty immediately after ' +
            'IDBTransaction.abort() returns');
    })).then(() => {
        assert_throws(
            'InvalidStateError', () => store.get('query'),
            'IDBObjectStore.get should throw InvalidStateError, indicating ' +
            'that the store is still marked for deletion, after the ' +
            'transaction is aborted');
        assert_throws(
            'InvalidStateError', () => index.get('query'),
            'IDBIndex.get should throw InvalidStateError, indicating that ' +
            'the index is still marked for deletion, after the transaction ' +
            'is aborted');
        assert_array_equals(
            migrationDatabase.objectStoreNames, ['books'],
            'IDBDatabase.objectStoreNames should not include the newly ' +
            'created store after the transaction is aborted');
        assert_array_equals(
            migrationTransaction.objectStoreNames, ['books'],
            'IDBTransaction.objectStoreNames should not include the newly ' +
            'created store after the transaction is aborted');
        assert_array_equals(
            store.indexNames, [],
            'IDBObjectStore.indexNames should be empty after the transaction ' +
            'is aborted');
    });
}, 'Deleted indexes in created+deleted stores are still marked as deleted ' +
    'after their transaction aborts');

