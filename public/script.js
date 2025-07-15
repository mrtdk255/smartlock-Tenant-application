// ====== تهيئة Firebase ======
const firebaseConfig = {
  databaseURL: "https://smartlockapp-e22e7-default-rtdb.firebaseio.com/"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ====== الترجمات ======
const translations = {
  ar: {
    enterBoth: "الرجاء إدخال رقم الصندوق ورمز الدخول.",
    codeVerified: "تم التحقق بنجاح!",
    codeInvalid: "رقم الصندوق أو الرمز غير صحيح.",
    retryAfter: "يمكنك المحاولة مرة أخرى بعد {{sec}} ثانية.",
    resetTitle: "إعادة تعيين رمز الدخول",
    boxLabel: "رقم الصندوق:",
    emailLabel: "البريد الإلكتروني:",
    confirmBtn: "إرسال",
    placeholderBox: "أدخل رقم الصندوق",
    placeholderEmail: "أدخل بريدك الإلكتروني",
    resetSuccess: "تم إرسال رمز الدخول بنجاح!",
    resetError: "يرجى إدخال البريد الإلكتروني ورقم الصندوق بشكل صحيح.",
    codeVerifyError: "حدث خطأ أثناء التحقق من الرمز.",
    sendingEmail: "📨 جارٍ إرسال البريد...",
    sendFail: "❌ فشل في إرسال البريد",
    codeExpired: "انتهت صلاحية الرمز، الرجاء طلب رمز جديد."
  },
  en: {
    enterBoth: "Please enter box number and access code.",
    codeVerified: "Verified successfully!",
    codeInvalid: "Box number or code is invalid.",
    retryAfter: "You can try again after {{sec}} seconds.",
    resetTitle: "Reset Access Code",
    boxLabel: "Box Number:",
    emailLabel: "Email:",
    confirmBtn: "Send",
    placeholderBox: "Enter box number",
    placeholderEmail: "Enter your email",
    resetSuccess: "Access code sent successfully!",
    resetError: "Please enter both box number and email.",
    codeVerifyError: "An error occurred while verifying the code.",
    sendingEmail: "📨 Sending email...",
    sendFail: "❌ Failed to send email",
    codeExpired: "The code has expired. Please request a new code."
  }
};

// ====== اللغة والاتجاه ======
let currentLanguage = localStorage.getItem("language") || "ar";

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document
    .querySelectorAll("[data-ar], [data-en], [data-ar-placeholder], [data-en-placeholder]")
    .forEach(el => {
      if (el.tagName === "INPUT") {
        const ph = el.getAttribute(`data-${lang}-placeholder`);
        if (ph) el.placeholder = ph;
      }
      const txt = el.getAttribute(`data-${lang}`);
      if (txt) el.textContent = txt;
    });
}

function initLanguageToggle() {
  document.querySelectorAll('.language-btn, .lang-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = currentLanguage === 'ar' ? 'en' : 'ar';
      setLanguage(next);
      updateToggleText();
      applyResetLang();
    });
  });
}

function updateToggleText() {
  document.querySelectorAll('.language-btn .lang-text, .lang-toggle').forEach(el => {
    el.textContent = currentLanguage === 'ar' ? 'EN' : 'AR';
  });
}

function applyResetLang() {
  const t = translations[currentLanguage];
  const map = {
    title: t.resetTitle,
    boxLabel: t.boxLabel,
    emailLabel: t.emailLabel,
    confirmResetButton: t.confirmBtn
  };
  Object.entries(map).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
  const ipMap = {
    boxNumberReset: t.placeholderBox,
    emailReset: t.placeholderEmail
  };
  Object.entries(ipMap).forEach(([id, ph]) => {
    const ip = document.getElementById(id);
    if (ip) ip.placeholder = ph;
  });
}

// ====== دالة الإشعار ======
function showNotification(keyOrMsg, type = "success", data = {}) {
  const t = translations[currentLanguage];
  let msg = t[keyOrMsg] || keyOrMsg;
  Object.keys(data).forEach(k => {
    msg = msg.replace(`{{${k}}}`, data[k]);
  });

  const n = document.createElement("div");
  n.className = `notification ${type}`;
  const icon = type === "success" ? "✅" : type === "info" ? "📨" : "❌";
  n.innerHTML = `<span class="notification-icon">${icon}</span><span>${msg}</span>`;

  const container = document.getElementById("notification-container");
  if (container) {
    container.appendChild(n);
  } else {
    document.body.appendChild(n);
  }

  setTimeout(() => n.classList.add("show"), 100);
  setTimeout(() => {
    n.classList.remove("show");
    setTimeout(() => n.remove(), 500);
  }, 3000);
}

// ====== عداد المحاولات ======
let failedAttempts = 0;

// ====== التحقق من الرمز (معدل لإضافة التحقق من الصلاحية) ======
function verifyAccessCode() {
  const box = document.getElementById("boxNumberCode").value.trim();
  const code = document.getElementById("code").value.trim();
  const msgEl = document.getElementById("codeMessage");

  if (!box || !code) {
    return showNotification("enterBoth", "error");
  }

  database.ref("accessCodes/" + code).once("value")
    .then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        if (val.boxNumber === box) {
          // تحقق من الصلاحية
          if (val.expiration) {
            const expDate = new Date(val.expiration);
            const now = new Date();
            if (now > expDate) {
              msgEl.textContent = translations[currentLanguage].codeExpired;
              return;
            }
          }
          // ✔️ كود صحيح وصلاحيته سارية أو بدون تاريخ صلاحية
          msgEl.textContent = translations[currentLanguage].codeVerified;
          document.getElementById("unlockButton").style.display = "block";
        } else {
          failedAttempts++;
          msgEl.textContent = translations[currentLanguage].codeInvalid;
          if (failedAttempts >= 2) {
            ["boxNumberCode", "code", "verifyCodeButton"].forEach(id => {
              document.getElementById(id).disabled = true;
            });
            document.getElementById("resetCodeButton").style.display = "block";
            const sec = 30;
            showNotification("retryAfter", "error", { sec });
            setTimeout(() => {
              failedAttempts = 0;
              ["boxNumberCode", "code", "verifyCodeButton"].forEach(id => {
                document.getElementById(id).disabled = false;
              });
              document.getElementById("resetCodeButton").style.display = "none";
            }, sec * 1000);
          }
        }
      } else {
        failedAttempts++;
        msgEl.textContent = translations[currentLanguage].codeInvalid;
        if (failedAttempts >= 2) {
          ["boxNumberCode", "code", "verifyCodeButton"].forEach(id => {
            document.getElementById(id).disabled = true;
          });
          document.getElementById("resetCodeButton").style.display = "block";
          const sec = 30;
          showNotification("retryAfter", "error", { sec });
          setTimeout(() => {
            failedAttempts = 0;
            ["boxNumberCode", "code", "verifyCodeButton"].forEach(id => {
              document.getElementById(id).disabled = false;
            });
            document.getElementById("resetCodeButton").style.display = "none";
          }, sec * 1000);
        }
      }
    })
    .catch(() => showNotification("codeVerifyError", "error"));
}

// ====== فتح القفل + حذف بعد دقيقة (فرونت فقط) ======
function unlockBox() {
  const box = document.getElementById("boxNumberCode").value.trim();

  if (!box) {
    return showNotification("enterBoth", "error");
  }

  const commandString = "unlock" + box;

  const unlockCommandData = {
    command: commandString,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };

  const ref = database.ref("unlockCommands").push();
  ref.set(unlockCommandData)
    .then(() => {
      showNotification(translations[currentLanguage].codeVerified, "success");
      document.getElementById("unlockButton").style.display = "none";

      // 🕒 حذف مؤقت من الفرونت بعد دقيقة
      setTimeout(() => {
        ref.remove()
          .then(() => console.log("🗑️ تم حذف unlock بعد دقيقة (من الفرونت)"))
          .catch(err => console.error("❌ فشل الحذف:", err.message));
      }, 60000);
    })
    .catch(() => {
      showNotification("codeVerifyError", "error");
    });
}

// ====== إعادة التعيين ======
function handleReset() {
  const email = document.getElementById("emailReset").value.trim();
  const boxNumber = document.getElementById("boxNumberReset").value.trim();

  if (!email || !boxNumber) {
    return showNotification("resetError", "error");
  }

  showNotification("sendingEmail", "info");

  fetch("/reset-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, boxNumber })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showNotification("resetSuccess", "success");
        document.getElementById("emailReset").value = "";
        document.getElementById("boxNumberReset").value = "";

        const manualBackBtn = document.createElement("button");
        manualBackBtn.className = "btn alt-btn";
        manualBackBtn.textContent = currentLanguage === "ar" ? "رجوع الآن" : "Go Back Now";
        manualBackBtn.style.marginTop = "15px";
        manualBackBtn.onclick = () => window.location.href = "/index.html";

        const container = document.getElementById("notification-container");
        container.appendChild(manualBackBtn);

        setTimeout(() => {
          window.location.href = "/index.html";
        }, 3000);
      } else {
        showNotification("sendFail", "error");
      }
    })
    .catch(() => {
      showNotification("sendFail", "error");
    });
}

// ====== تحميل الصفحة ======
document.addEventListener("DOMContentLoaded", () => {
  setLanguage(currentLanguage);
  initLanguageToggle();
  updateToggleText();

  const btnLogin = document.getElementById("btn-login");
  if (btnLogin) {
    btnLogin.addEventListener("click", () => location.href = "code_entry.html");
  }

  const form = document.getElementById("codeForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      verifyAccessCode();
    });
  }

  const resetBtn = document.getElementById("resetCodeButton");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => location.href = "reset_code.html");
  }

  const unlockBtn = document.getElementById("unlockButton");
  if (unlockBtn) {
    unlockBtn.addEventListener("click", unlockBox);
  }

  const confirmBtn = document.getElementById("confirmResetButton");
  if (confirmBtn) {
    applyResetLang();
    confirmBtn.addEventListener("click", handleReset);
  }

  const backBtn = document.getElementById("backToHome");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
});
