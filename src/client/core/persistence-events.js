function createPersistenceEvents() {
  const callbacks = {
    onDataChanged: function () {},
    onPlansSaved: function () {},
    onStorageError: function () {}
  };

  return {
    configure: function (nextCallbacks) {
      Object.assign(callbacks, nextCallbacks);
    },
    notifyDataChanged: function () {
      callbacks.onDataChanged();
    },
    notifyPlansSaved: function () {
      callbacks.onPlansSaved();
    },
    notifyStorageError: function () {
      callbacks.onStorageError();
    }
  };
}

export { createPersistenceEvents };
