(function () {
  const nameEl = document.getElementById("page-header-user-name");
  const logoutButton = document.getElementById("logout-button");
  if (!nameEl || !logoutButton) return;

  const user = typeof simsGetAuthUser === "function" ? simsGetAuthUser() : null;
  nameEl.textContent = user ? user.name || user.username || "" : "";

  logoutButton.addEventListener("click", () => {
    if (typeof simsClearAuth === "function") simsClearAuth();
    window.location.href = "INDEX.HTML";
  });
})();
