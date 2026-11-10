// =======================================================
// Login Page JS - Direct Authentication (No 2FA/OTP)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  initParticles(30);        // Floating background particles
  initPasswordToggle();     // Show/Hide password
  initDirectLoginForm();    // Direct login form submit
});

// ===== Floating Particles =====
function initParticles(count = 30) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = 5 + Math.random() * 8;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}vw`;
    p.style.top = `${Math.random() * 100}vh`;
    p.style.opacity = 0.2 + Math.random() * 0.6;
    document.body.appendChild(p);
    particles.push({ el: p, speedX: Math.random() * 0.5, speedY: Math.random() * 0.3 });
  }

  function animate() {
    particles.forEach(p => {
      let top = parseFloat(p.el.style.top);
      let left = parseFloat(p.el.style.left);
      top -= p.speedY;
      left += Math.sin(Date.now() * 0.001) * p.speedX;
      if (top < -10) top = 100;
      if (left > 100) left = 0;
      p.el.style.top = top + 'vh';
      p.el.style.left = left + 'vw';
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// ===== Password Toggle =====
function initPasswordToggle() {
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");
  if (!togglePassword || !passwordInput) return;

  togglePassword.addEventListener("click", () => {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      togglePassword.textContent = "🙈";
    } else {
      passwordInput.type = "password";
      togglePassword.textContent = "👁️";
    }
  });
}

// ===== Direct Login Form Submit =====
function initDirectLoginForm() {
  const loginForm = document.getElementById("loginForm");
  const messageEl = document.getElementById("message");
  if (!loginForm || !messageEl) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    messageEl.textContent = "";
    showMessage("Authenticating credentials, please wait...", "orange");

    const username = e.target.username.value.trim();
    const passwordVal = e.target.password.value.trim();

    if (!username || !passwordVal) {
      showMessage("All fields are required!", "red");
      return;
    }

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: passwordVal })
      });

      const data = await res.json();

      if (!data.success) {
        showMessage(data.message || "Invalid username or password", "red");
        return;
      }

      // Direct Login Success -> Redirect straight to dashboard
      showMessage(data.message || "Login successful! Redirecting...", "#10B981");
      setTimeout(() => {
        window.location.href = data.redirectUrl || "/home";
      }, 400);

    } catch (err) {
      console.error("Login submission error:", err);
      showMessage("Server connection error occurred. Try again!", "red");
    }
  });

  function showMessage(msg, color) {
    messageEl.style.color = color;
    messageEl.textContent = msg;
  }
}
