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
        padding: "16px 30px",
        background: "linear-gradient(135deg,#00ff99,#00ccff)",
        color: "black",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        borderRadius: "30px",
        fontWeight: "bold",
        boxShadow: "0 10px 30px rgba(0,255,150,0.4)",
        transition: "0.3s"
      });

      button.onmouseover = () => button.style.transform = "scale(1.05)";
      button.onmouseleave = () => button.style.transform = "scale(1)";

      document.body.appendChild(button);

      button.onclick = async () => {

        if (modalOpen) return;

        button.disabled = true;
        button.innerText = "Processing...";

        try {
          // CREATE SESSION
          const sessionRes = await fetch(`${BASE_URL}/v1/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: 499, currency: "INR" }),
          });

          const session = await sessionRes.json();
          if (!session.session_id) throw new Error("Session failed");

          const sessionId = session.session_id;
          activeSession = sessionId;

          // DETECT ROUTE
          const detectRes = await fetch(
            `${BASE_URL}/v1/sessions/${sessionId}/detect`,
            { method: "POST" }
          );

          const detect = await detectRes.json();

          if (detect.route === "QR") {
            showQR(sessionId, session.amount);
          } else {
            openUPI();
          }

        } catch (err) {
          console.error(err);
          alert("❌ Payment failed. Backend issue.");
        }

        button.disabled = false;
        button.innerText = "Pay with TapBridge";
      };

      // ===================== PREMIUM MODAL =====================
      function showQR(sessionId, amount) {

        modalOpen = true;
        if (interval) clearInterval(interval);

        const successSound = new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3");

        // OVERLAY
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(20px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: "9999"
        });

        // MODAL
        const modal = document.createElement("div");
        Object.assign(modal.style, {
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(30px)",
          borderRadius: "24px",
          padding: "30px",
          textAlign: "center",
          width: "320px",
          color: "white",
          boxShadow: "0 0 60px rgba(0,255,150,0.2)",
          animation: "fadeUp 0.4s ease"
        });

        // ANIMATION
        const style = document.createElement("style");
        style.innerHTML = `
          @keyframes fadeUp {
            from {opacity:0; transform:translateY(40px);}
            to {opacity:1; transform:translateY(0);}
          }
          @keyframes spin {
            0% {transform: rotate(0deg);}
            100% {transform: rotate(360deg);}
          }
        `;
        document.head.appendChild(style);

        const title = document.createElement("h3");
        title.innerText = "Scan to Pay";

        const img = document.createElement("img");
        img.src = `${BASE_URL}/v1/sessions/${sessionId}/qr`;
        img.style.width = "180px";
        img.style.margin = "20px 0";

        const amt = document.createElement("p");
        amt.innerText = "₹" + amount;
        amt.style.fontSize = "22px";
        amt.style.fontWeight = "600";

        const status = document.createElement("p");
        status.innerText = "Waiting for payment...";
        status.style.color = "#aaa";

        const loader = document.createElement("div");
        Object.assign(loader.style, {
          border: "3px solid #333",
          borderTop: "3px solid #00ff99",
          borderRadius: "50%",
          width: "30px",
          height: "30px",
          margin: "15px auto",
          animation: "spin 1s linear infinite"
        });

        // CONFETTI
        function showConfetti() {
          for (let i = 0; i < 40; i++) {
            const c = document.createElement("div");
            Object.assign(c.style, {
              position: "fixed",
              width: "8px",
              height: "8px",
              background: `hsl(${Math.random()*360},100%,50%)`,
              top: "50%",
              left: "50%",
              zIndex: "9999"
            });

            document.body.appendChild(c);

            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.random() * 300;

            c.animate([
              { transform: "translate(0,0)" },
              { transform: `translate(${Math.cos(angle)*radius}px, ${Math.sin(angle)*radius}px)` }
            ], {
              duration: 1000,
              easing: "ease-out"
            });

            setTimeout(() => c.remove(), 1000);
          }
        }

        const btn = document.createElement("button");
        btn.innerText = "Simulate Payment";
        Object.assign(btn.style, {
          marginTop: "15px",
          padding: "10px 20px",
          borderRadius: "20px",
          border: "none",
          background: "#00ff99",
          color: "black",
          cursor: "pointer"
        });

        btn.onclick = async () => {
          await fetch(`${BASE_URL}/webhook/payment`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ session_id: sessionId })
          });

          status.innerText = "Processing...";
          btn.disabled = true;
        };

        modal.append(title, img, amt, loader, status, btn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // POLLING
        interval = setInterval(async () => {
          try {
            const res = await fetch(`${BASE_URL}/v1/sessions/${sessionId}/status`);
            const data = await res.json();

            if (data.status === "success") {

              clearInterval(interval);
              successSound.play();
              showConfetti();

              modal.innerHTML = `
                <h2 style="color:#00ff99;">Payment Successful</h2>
                <p>Transaction Completed</p>
              `;

              setTimeout(() => {
                document.body.removeChild(overlay);
              }, 2500);
            }

          } catch (e) {
            console.error(e);
          }
        }, 2000);

        // TIMEOUT
        setTimeout(() => {
          if (modalOpen) {
            clearInterval(interval);
            modal.innerHTML = `
              <h2 style="color:red;">Payment Timeout</h2>
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