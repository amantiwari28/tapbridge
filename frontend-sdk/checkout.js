(function () {

  let activeSession = null;
  let interval = null;
  let modalOpen = false;

  window.TapBridge = {
    init: function () {

      console.log("INIT CALLED");

      const button = document.createElement("button");
      button.innerText = "Pay with TapBridge";

      Object.assign(button.style, {
        padding: "12px 24px",
        background: "#4CAF50",
        color: "white",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        borderRadius: "6px"
      });

      document.body.appendChild(button);

      button.onclick = async () => {

        if (modalOpen) return;

        button.disabled = true;
        button.innerText = "Processing...";

        try {
          // STEP 1
          const sessionRes = await fetch("http://127.0.0.1:8000/v1/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: 1000, currency: "INR" }),
          });

          const session = await sessionRes.json();
          const sessionId = session.session_id;

          activeSession = sessionId;

          // STEP 2
          const detectRes = await fetch(
            `http://127.0.0.1:8000/v1/sessions/${sessionId}/detect`,
            { method: "POST" }
          );

          const detect = await detectRes.json();

          // STEP 3
          if (detect.route === "QR") {
            showQR(sessionId, session.amount);
          } else {
            openUPI();
          }

        } catch (err) {
          console.error(err);
          alert("❌ Payment failed");
        }

        button.disabled = false;
        button.innerText = "Pay with TapBridge";
      };

      function showQR(sessionId, amount) {

        modalOpen = true;

        if (interval) clearInterval(interval);

        // OVERLAY
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backdropFilter: "blur(8px)",
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "9999"
        });

        // MODAL (PREMIUM)
        const modal = document.createElement("div");
        Object.assign(modal.style, {
          background: "linear-gradient(135deg, #ffffff, #f5f7fa)",
          padding: "30px",
          borderRadius: "20px",
          textAlign: "center",
          width: "340px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          fontFamily: "Segoe UI, sans-serif",
          position: "relative"
        });

        // CLOSE BUTTON
        const closeBtn = document.createElement("button");
        closeBtn.innerText = "✖";
        Object.assign(closeBtn.style, {
          position: "absolute",
          top: "10px",
          right: "15px",
          border: "none",
          background: "transparent",
          cursor: "pointer"
        });

        closeBtn.onclick = () => {
          clearInterval(interval);
          modalOpen = false;
          document.body.removeChild(overlay);
        };

        const title = document.createElement("h3");
        title.innerText = "Scan QR to Pay";

        const img = document.createElement("img");
        img.src = `http://127.0.0.1:8000/v1/sessions/${sessionId}/qr`;
        img.style.width = "200px";

        // AMOUNT (FIXED)
        const amountText = document.createElement("p");
        amountText.innerText = "Amount: ₹" + amount;
        amountText.style.fontWeight = "bold";

        const sessionInfo = document.createElement("p");
        sessionInfo.innerText = "Session: " + sessionId;
        sessionInfo.style.fontSize = "11px";
        sessionInfo.style.color = "gray";

        const statusText = document.createElement("p");
        statusText.innerText = "Waiting for payment...";
        statusText.style.fontWeight = "500";

        // LOADER
        const loader = document.createElement("div");
        Object.assign(loader.style, {
          border: "4px solid #eee",
          borderTop: "4px solid #4CAF50",
          borderRadius: "50%",
          width: "30px",
          height: "30px",
          margin: "15px auto",
          animation: "spin 1s linear infinite"
        });

        const btn = document.createElement("button");
        btn.innerText = "Simulate Payment";

        btn.onclick = async () => {
          await fetch("http://127.0.0.1:8000/webhook/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });

          statusText.innerText = "Processing...";
          btn.disabled = true;
        };

        modal.append(closeBtn, title, img, amountText, sessionInfo, loader, statusText, btn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // POLLING
        setTimeout(() => {

          interval = setInterval(async () => {
            try {
              const res = await fetch(
                `http://127.0.0.1:8000/v1/sessions/${sessionId}/status`
              );

              const data = await res.json();

              if (
                modalOpen &&
                sessionId === activeSession &&
                data &&
                data.status === "success"
              ) {

                clearInterval(interval);
                modalOpen = false;

                modal.innerHTML = `
                  <h2 style="color: green;">✅ Payment Successful</h2>
                  <p>Transaction completed</p>
                `;

                setTimeout(() => {
                  document.body.removeChild(overlay);
                }, 2000);
              }

            } catch (err) {
              console.error(err);
            }
          }, 3000);

        }, 2000);

        // TIMEOUT (FAILURE)
        setTimeout(() => {
          if (modalOpen) {
            clearInterval(interval);
            modalOpen = false;

            modal.innerHTML = `
              <h2 style="color: red;">❌ Payment Timeout</h2>
              <p>Please try again</p>
            `;
          }
        }, 30000);
      }

      function openUPI() {
        window.location.href =
          "upi://pay?pa=test@upi&pn=TapBridge&am=100&cu=INR";
      }
    },
  };

})();