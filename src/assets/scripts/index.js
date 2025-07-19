document.addEventListener("DOMContentLoaded", () => {
  const emailIp = document.getElementById("email");
  const phoneIp = document.getElementById("phone");
  const btn = document.getElementById("submit-btn");

  btn.addEventListener("click", () => {
    if (phoneIp.value === "" && emailIp.value === "") {
      alert("Enter email or phone number");
      return;
    }

    fetch("/api/identify", {
      method: "POST",
      body: JSON.stringify({
        email: emailIp.value,
        phoneNumber: phoneIp.value,
      }),
      headers: {
        "Content-Type": "application/json", // This is crucial
      },
    })
      .then((response) => {
        if (response.status === 200) {
          alert("Added, go to contacts page to check contacts");
        } else {
          alert("Error: ", response.body);
        }
      })
      .catch((e) => {
        alert("Error: ", e);
      });
  });
});
