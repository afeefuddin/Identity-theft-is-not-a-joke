document.addEventListener("DOMContentLoaded", () => {
  const emailIp = document.getElementById("email");
  const phoneIp = document.getElementById("phone");
  const btn = document.getElementById("submit-btn");
  const copyBtn = document.getElementById("copy-btn");
  const curlCommand = document.getElementById("curl-command");

  copyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(curlCommand.value)
      .then(() => {
        alert("cURL command copied to clipboard!");
      })
      .catch((err) => {
        alert("Failed to copy: ", err);
      });
  });

  btn.addEventListener("click", () => {
    if (phoneIp.value === "" && emailIp.value === "") {
      alert("Enter email or phone number");
      return;
    }

    btn.classList.add("loading");
    btn.disabled = true;

    fetch("/api/identify", {
      method: "POST",
      body: JSON.stringify({
        email: emailIp.value,
        phoneNumber: phoneIp.value,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.status === 200) {
          emailIp.value = "";
          phoneIp.value = "";
          return "Success, go to contacts page to check contacts";
        } else {
          return response.body;
        }
      })
      .then((body) => {
        alert(body);
      })
      .catch((e) => {
        alert("Error: ", e);
      })
      .finally(() => {
        btn.classList.remove("loading");
        btn.disabled = false;
      });
  });
});
