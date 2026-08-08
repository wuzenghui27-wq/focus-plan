function registerServiceWorker() {
  if (!("serviceWorker" in window.navigator)) {
    return;
  }

  window.addEventListener("load", function () {
    window.navigator.serviceWorker.register("./service-worker.js")
      .then(function (registration) {
        return registration.update();
      })
      .catch(function (error) {
        console.warn("离线功能注册失败：", error);
      });
  });
}
export {
  registerServiceWorker
};
