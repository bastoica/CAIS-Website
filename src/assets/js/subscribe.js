(function () {
  document.querySelectorAll(".subscribe-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      var originalHTML = btn.innerHTML;
      var emailInput = form.querySelector('input[type="email"]');
      var email = emailInput.value.trim();

      if (!email) return;

      btn.disabled = true;
      btn.textContent = "Subscribing\u2026";

      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.data.ok) {
            // Replace form contents with success message
            form.innerHTML =
              '<p class="mb-0 text-success fw-semibold">' +
              '<i class="bi bi-check-circle me-2"></i>You\u2019re subscribed!</p>';
          } else {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            showError(form, result.data.error || "Something went wrong \u2014 please try again.");
          }
        })
        .catch(function () {
          // Network failure — fall back to native Buttondown submit
          btn.disabled = false;
          btn.innerHTML = originalHTML;
          form.submit();
        });
    });
  });

  function showError(form, message) {
    // Remove any existing error
    var existing = form.querySelector(".subscribe-error");
    if (existing) existing.remove();

    var el = document.createElement("div");
    el.className = "subscribe-error text-danger small mt-2";
    el.textContent = message;
    form.appendChild(el);

    // Auto-remove after 5 seconds
    setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 5000);
  }
})();
