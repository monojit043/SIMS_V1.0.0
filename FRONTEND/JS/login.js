const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("password-toggle");

passwordToggle.addEventListener("click", () => {
  const nowShowing = passwordInput.type === "password";
  passwordInput.type = nowShowing ? "text" : "password";
  passwordToggle.classList.toggle("password-toggle-visible", nowShowing);
  passwordToggle.title = nowShowing ? "Hide password" : "Show password";
  passwordToggle.setAttribute("aria-label", nowShowing ? "Hide password" : "Show password");
});

document.getElementById("login-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");
  const submitButton = event.target.querySelector(".login-button");

  if (!username || !password) {
    errorMessage.textContent = "Please enter both username and password.";
    errorMessage.hidden = false;
    return;
  }

  errorMessage.hidden = true;
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || !payload.success) {
      throw new Error((payload && payload.message) || "Invalid username or password.");
    }

    simsSetAuth(payload.data.token, payload.data.user);
    window.location.href = "JOB-FORM.HTML";
  } catch (error) {
    errorMessage.textContent =
      error.message === "Failed to fetch"
        ? "Could not reach the server. Make sure the backend is running."
        : error.message || "Could not log in. Please try again.";
    errorMessage.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});
