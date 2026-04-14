(function () {

  const BASE_URL = "https://tapbridge-backend.onrender.com";

  let activeSession = null;
  let interval = null;
  let modalOpen = false;

  window.TapBridge = {
    init: function () {

      console.log("TapBridge INIT");

      const button = document.createElement("button");
      button.innerText = "Pay with TapBridge";

      Object.assign(button.style, {
        padding: "14px 26px",
        background: "linear-gradient(135deg,#00ff99,#00ccff)",
        color: "black",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        borderRadius: "30px",
        fontWeight: "bold"
      });

      document.body.appendChild(button);

      button.onclick = async () => {

        if (modalOpen) return;

        button.disabled = true;
        button.innerText = "Processing...";

        try {
          // STEP 1: Create session
          const sessionRes = await fetch(`${BASE_URL}/v1/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: 1000, currency: "INR" }),
          });

          const session = await sessionRes.json();

          if (!session.session_id) throw new Error("Session failed");

          const sessionId = session.session_id;
          activeSession = sessionId;

          // STEP 2: Detect route
          const detectRes = await fetch(
            `${BASE_URL}/v1/sessions/${sessionId}/detect`,
            { method: "POST" }
          );

          const detect = await detectRes.json();

          // STEP 3: Show UI
          if (detect.route === "QR") {
            showQR(sessionId, session.amount);
          } else {
            openUPI();
          }

        } catch (err) {
          console.error(err);
          alert("❌ Payment failed. Backend not responding.");
        }

        button.disabled = false;
        button.innerText = "Pay with TapBridge";
      };

      // ===================== QR MODAL =====================
      function showQR(sessionId, amount) {

        modalOpen = true;
        if (interval) clearInterval(interval);

        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "9999"
        });

        const modal = document.createElement("div");
        Object.assign(modal.style, {
          background: "#fff",
          padding: "30px",
          borderRadius: "20px",
          textAlign: "center",
          width: "340px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          fontFamily: "Segoe UI",
          position: "relative"
        });

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
        img.src = `${BASE_URL}/v1/sessions/${sessionId}/qr`;
        img.style.width = "200px";

        const amountText = document.createElement("p");
        amountText.innerText = "Amount: ₹" + amount;
        amountText.style.fontWeight = "bold";

        const statusText = document.createElement("p");
        statusText.innerText = "Waiting for payment...";

        const loader = document.createElement("div");
        Object.assign(loader.style, {
          border: "4px solid #eee",
          borderTop: "4px solid #00cc66",
          borderRadius: "50%",
          width: "30px",
          height: "30px",
          margin: "15px auto",
          animation: "spin 1s linear infinite"
        });

        const btn = document.createElement("button");
        btn.innerText = "Simulate Payment";

        btn.onclick = async () => {
          await fetch(`${BASE_URL}/webhook/payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });

          statusText.innerText = "Processing...";
          btn.disabled = true;
        };

        modal.append(closeBtn, title, img, amountText, loader, statusText, btn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // ===================== POLLING =====================
        interval = setInterval(async () => {
          try {
            const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/status`);
            const data = await res.json();

            if (data.status === "success") {
              clearInterval(interval);
              modal.innerHTML = `
                <h2 style="color:green;">✅ Payment Successful</h2>
                <p>Transaction Completed</p>
              `;
              setTimeout(() => document.body.removeChild(overlay), 2000);
            }

          } catch (err) {
            console.error("Polling error", err);
          }
        }, 3000);

        // ===================== TIMEOUT =====================
        setTimeout(() => {
          if (modalOpen) {
            clearInterval(interval);
            modal.innerHTML = `
              <h2 style="color:red;">❌ Timeout</h2>
              <p>Please try again</p>
            `;
          }
        }, 30000);
      }

      // ===================== UPI FALLBACK =====================
      function openUPI() {
        window.location.href =
          "upi://pay?pa=test@upi&pn=TapBridge&am=100&cu=INR";
      }
    },
  };

})();