// Forwards an https link to the matching mana:// link, keeping the query as-is:
//   /add-repo/?url=…&name=…      → mana://add-repo?url=…&name=…
//   /install-source/?repo=…&id=… → mana://install-source?repo=…&id=…
(function () {
  var action = document.documentElement.dataset.action;
  var target = "mana://" + action + window.location.search;
  var button = document.getElementById("open");
  button.href = target;

  var params = new URLSearchParams(window.location.search);
  var repo = params.get(action === "install-source" ? "repo" : "url");
  var detail = document.getElementById("detail");
  if (!repo) {
    detail.textContent = "This link is missing its repository URL.";
    button.hidden = true;
    return;
  }
  if (action === "install-source" && params.get("id")) {
    detail.textContent = params.get("id") + " from " + repo;
  } else {
    detail.textContent = params.get("name") ? params.get("name") + " · " + repo : repo;
  }

  window.location.replace(target);
})();
