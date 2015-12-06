(function () {
  const DB_NAME = 'library-application';
  const DB_VERSION = 1;
  const DB_STORE_NAME = 'publications';

  var db;

  function openDb() {
    var req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onsuccess = function (e) {
      db = this.result;
    };

    req.onerror = function (e) {
      displayActionFailure(this.error);
    };

    req.onupgradeneeded = function (e) {

      var store = e.currentTarget.result.createObjectStore(
        DB_STORE_NAME, { keyPath: 'id', autoIncrement: true }
      );

      store.createIndex('biblioid', 'biblioid', { unique: true });
      store.createIndex('title', 'title', { unique: false });
      store.createIndex('year', 'year', { unique: false });
    };
  }

  function getObjectStore(storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function clearObjectStore() {
    var store = getObjectStore(DB_STORE_NAME, 'readwrite');
    var req = store.clear();

    req.onsuccess = function(e) {
      displayActionSuccess("Store cleared");
      displayPubList(store);
    };

    req.onerror = function (e) {
      displayActionFailure(this.error);
    };
  }

  function displayPubList(store) {
    clearPublicationsList()
    
    if (typeof store == 'undefined') {
      store = getObjectStore(DB_STORE_NAME, 'readonly');
    }

    var req = store.count();

    req.onsuccess = function(e) {
      addPublicationsCountMessage(e.target.result)
    };

    req.onerror = function(e) {
      displayActionFailure(this.error);
    };

    req = store.openCursor();

    req.onsuccess = function(e) {
      var cursor = e.target.result;

      if (cursor) {
        req = store.get(cursor.key);

        req.onsuccess = function (e) {
          var value = e.target.result;
          addPublicationsListItem(cursor.key, value.biblioid, value.title, 
            value.year)
        };

        cursor.continue();
      }
    };
  }

  function clearPublicationsList() {
    var pubMessages = $('#publications-messages');
    var pubList = $('#publications-list');

    pubMessages.empty();
    pubList.empty();
  }

  function addPublicationsListItem(key, biblioid, title, year) {
    var pubList = $('#publications-list');

    var listItem = $('<li>' +
                     '[' + key + '] ' +
                     '(biblioid: ' + biblioid + ') ' +
                     title +
                     '</li>');

    if (year != null) {
      listItem.append(' - ' + year);
    }

    pubList.append(listItem);
  }

  function addPublicationsCountMessage(count) {
    var pubMessages = $('#publications-messages');
    pubMessages.append('<p>There are <strong>' + count +
      '</strong> record(s) in the object store.</p>');
  }

  function addPublication(biblioid, title, year) {
    var obj = { biblioid: biblioid, title: title, year: year };

    var store = getObjectStore(DB_STORE_NAME, 'readwrite');
    var req = store.add(obj);

    req.onsuccess = function (e) {
      displayActionSuccess();
      displayPubList(store);
    };

    req.onerror = function() {
      displayActionFailure(this.error);
    };
  }

  function deletePublicationByBib(biblioid) {
    var store = getObjectStore(DB_STORE_NAME, 'readwrite');
    var req = store.index('biblioid');

    req.get(biblioid).onsuccess = function(e) {
      if (typeof e.target.result == 'undefined') {
        displayActionFailure("No matching record found");
        return;
      }

      deletePublication(e.target.result.id, store);
    };

    req.onerror = function (e) {
      displayActionFailure(this.error);
    };
  }

  function deletePublication(key, store) {
    if (typeof store == 'undefined')
      store = getObjectStore(DB_STORE_NAME, 'readwrite');

    var req = store.get(key);

    req.onsuccess = function(e) {
      var record = e.target.result;

      if (typeof record == 'undefined') {
        displayActionFailure("No matching record found");
        return;
      }

      req = store.delete(key);

      req.onsuccess = function(e) {
        displayActionSuccess("Deletion successful");
        displayPubList(store);
      };

      req.onerror = function (e) {
        displayActionFailure(this.error);
      };
    };

    req.onerror = function (e) {
      displayActionFailure(this.error);
    };
  }

  function displayActionSuccess(msg) {
    msg = typeof msg != 'undefined' ? "Success: " + msg : "Success";
    $('#msg').html('<span class="action-success">' + msg + '</span>');
  }
  function displayActionFailure(msg) {
    msg = typeof msg != 'undefined' ? "Failure: " + msg : "Failure";
    $('#msg').html('<span class="action-failure">' + msg + '</span>');
  }
  function resetActionStatus() {
    $('#msg').empty();
  }

  function addEventListeners() {
    $('#register-form-reset').click(function(evt) {
      resetActionStatus();
    });

    $('#add-button').click(function(evt) {
      var title = $('#pub-title').val();
      var biblioid = $('#pub-biblioid').val();

      if (!title || !biblioid) {
        displayActionFailure("Required field(s) missing");
        return;
      }

      var year = $('#pub-year').val();
      if (year != '') {
        if (isNaN(year))  {
          displayActionFailure("Invalid year");
          return;
        }

        year = Number(year);
      } 
      else {
        year = null;
      }

      addPublication(biblioid, title, year);
    });

    $('#delete-button').click(function(evt) {
      var biblioid = $('#pub-biblioid-to-delete').val();
      var key = $('#key-to-delete').val();

      if (biblioid != '') {
        deletePublicationByBib(biblioid);
      } 
      else if (key != '') {
        if (isNaN(key))  {
          displayActionFailure("Invalid key");
          return;
        }

        key = Number(key);
        deletePublication(key);
      }
    });

    $('#clear-store-button').click(function(evt) {
      clearObjectStore();
    });

    $('#search-list-button').click(function(evt) {
      displayPubList();
    });
  }

  openDb();
  addEventListeners();

})();