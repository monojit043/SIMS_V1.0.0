(function () {
  const nameEl = document.getElementById("page-header-user-name");
  const logoutButton = document.getElementById("logout-button");
  if (!nameEl || !logoutButton) return;

  const user = typeof simsGetAuthUser === "function" ? simsGetAuthUser() : null;
  nameEl.textContent = user ? user.name || user.username || "" : "";

  logoutButton.addEventListener("click", async () => {
    if (typeof simsClearAuth === "function") simsClearAuth();
    // one shared sign-on cookie: signing out of SIMS signs out of ePULSE / MRCS / SSMS / IPMCS too
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    window.location.href = "INDEX.HTML";
  });
})();
