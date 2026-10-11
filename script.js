// ======================================
// BLUECARE HOSPITAL - JAVASCRIPT
// ======================================

// Mobile navigation menu
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    });
});

// Footer year
document.getElementById("currentYear").textContent =
    new Date().getFullYear();

// Set minimum appointment date to today
const dateInput = document.getElementById("appointmentDate");

const today = new Date();
const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
].join("-");

dateInput.min = localToday;


// ======================================
// APPOINTMENT FORM
// ======================================

const appointmentForm = document.getElementById("appointmentForm");
const bookingMessage = document.getElementById("bookingMessage");
const bookingButton = document.getElementById("bookingButton");

function showBookingMessage(message, type) {
    bookingMessage.textContent = message;
    bookingMessage.className = "form-message " + type;
}

appointmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const patientName =
        document.getElementById("patientName").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const department =
        document.getElementById("department").value;

    const appointmentDate =
        document.getElementById("appointmentDate").value;

    if (!patientName || !phone || !department || !appointmentDate) {
        showBookingMessage(
            "Please complete all required fields.",
            "error"
        );
        return;
    }

    if (appointmentDate < localToday) {
        showBookingMessage(
            "Please select today or a future date.",
            "error"
        );
        return;
    }

    if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
        showBookingMessage(
            "Please enter a valid phone number.",
            "error"
        );
        return;
    }

    const bookingData = {
        patientName,
        phone,
        email,
        department,
        appointmentDate
    };

    bookingButton.disabled = true;
    bookingButton.textContent = "Submitting...";
    showBookingMessage("", "");

    try {
        /*
         * The server.js file must provide:
         * POST /api/appointments
         *
         * This sends the booking to your backend.
         */
        const response = await fetch("/api/appointments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bookingData)
        });

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "The server returned an unexpected response."
            );
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Appointment booking failed."
            );
        }

        showBookingMessage(
            "Appointment request submitted successfully! " +
            "Reference: " + (result.appointmentId ?? "Received") +
            ". Please wait for confirmation.",
            "success"
        );

        appointmentForm.reset();

    } catch (error) {
        console.error("Appointment error:", error);

        showBookingMessage(
            "Booking failed: " + error.message +
            " Please check that the Node.js server and MySQL are running.",
            "error"
        );
    } finally {
        bookingButton.disabled = false;
        bookingButton.textContent = "Book Appointment →";
    }
});


// ======================================
// QR CODE SCANNER
// ======================================

const startScannerButton = document.getElementById("startScanner");
const stopScannerButton = document.getElementById("stopScanner");
const scannerMessage = document.getElementById("scannerMessage");
const scanResult = document.getElementById("scanResult");
const scanText = document.getElementById("scanText");
const scanOpenLink = document.getElementById("scanOpenLink");
const copyScanButton = document.getElementById("copyScan");

let html5Scanner = null;
let scannerRunning = false;
let scanHandled = false;
let lastScanText = "";

function showScannerMessage(message, type = "") {
    scannerMessage.textContent = message;
    scannerMessage.className = "form-message " + type;
}

async function stopScanner() {
    if (html5Scanner && scannerRunning) {
        try {
            await html5Scanner.stop();
        } catch (error) {
            console.warn("Scanner stop:", error);
        }
    }

    scannerRunning = false;
    startScannerButton.disabled = false;
    stopScannerButton.disabled = true;
}

async function handleQrScan(decodedText) {
    if (scanHandled) return;

    scanHandled = true;
    lastScanText = decodedText;

    await stopScanner();

    scanText.textContent = decodedText;
    scanResult.hidden = false;

    // Only make normal HTTP/HTTPS links clickable.
    try {
        const parsedUrl = new URL(decodedText);

        if (parsedUrl.protocol === "https:" ||
            parsedUrl.protocol === "http:") {
            scanOpenLink.href = parsedUrl.href;
            scanOpenLink.hidden = false;
        } else {
            scanOpenLink.removeAttribute("href");
            scanOpenLink.hidden = true;
        }
    } catch {
        scanOpenLink.removeAttribute("href");
        scanOpenLink.hidden = true;
    }

    showScannerMessage("QR code scanned successfully.", "success");
}

startScannerButton.addEventListener("click", async () => {
    if (typeof Html5Qrcode === "undefined") {
        showScannerMessage(
            "Scanner library could not load. Check your internet connection.",
            "error"
        );
        return;
    }

    try {
        scanHandled = false;
        scanResult.hidden = true;

        if (!html5Scanner) {
            html5Scanner = new Html5Qrcode("qr-reader");
        }

        startScannerButton.disabled = true;

        showScannerMessage(
            "Starting camera... Please allow camera permission."
        );

        await html5Scanner.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 220, height: 220 }
            },
            handleQrScan,
            () => {
                // No QR code detected in this frame.
            }
        );

        scannerRunning = true;
        stopScannerButton.disabled = false;

        showScannerMessage(
            "Camera is running. Point it at a QR code."
        );

    } catch (error) {
        console.error("Scanner error:", error);

        scannerRunning = false;
        startScannerButton.disabled = false;
        stopScannerButton.disabled = true;

        showScannerMessage(
            "Could not open camera. Allow camera access and use HTTPS " +
            "or localhost. On a phone, an insecure local-network link " +
            "may not permit camera access.",
            "error"
        );
    }
});

stopScannerButton.addEventListener("click", async () => {
    await stopScanner();

    showScannerMessage("Scanner stopped.");
});

copyScanButton.addEventListener("click", async () => {
    if (!lastScanText) return;

    try {
        await navigator.clipboard.writeText(lastScanText);

        showScannerMessage(
            "Scanned result copied successfully.",
            "success"
        );
    } catch {
        showScannerMessage(
            "Copy is unavailable in this browser. Select the result text manually.",
            "error"
        );
    }
});


// ======================================
// WEBSITE QR CODE GENERATOR
// ======================================

const websiteUrlInput = document.getElementById("websiteUrl");
const generateQrButton = document.getElementById("generateQr");
const websiteQr = document.getElementById("websiteQr");
const qrDescription = document.getElementById("qrDescription");

generateQrButton.addEventListener("click", () => {
    const enteredUrl = websiteUrlInput.value.trim();

    if (!enteredUrl) {
        qrDescription.textContent =
            "Please enter your public website URL first.";
        websiteUrlInput.focus();
        return;
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(enteredUrl);
    } catch {
        qrDescription.textContent =
            "Please enter a valid URL, such as https://example.com.";
        return;
    }

    if (parsedUrl.protocol !== "https:" &&
        parsedUrl.protocol !== "http:") {
        qrDescription.textContent =
            "Please enter an HTTP or HTTPS website address.";
        return;
    }

    if (parsedUrl.hostname === "localhost" ||
        parsedUrl.hostname === "127.0.0.1") {
        qrDescription.textContent =
            "This is a local address. Host your website first, " +
            "then enter its public URL.";
        return;
    }

    // The QR image is generated by a third-party online service.
    const qrImageUrl =
        "https://api.qrserver.com/v1/create-qr-code/" +
        "?size=250x250&data=" +
        encodeURIComponent(parsedUrl.href);

    const image = document.createElement("img");

    image.src = qrImageUrl;
    image.alt = "QR code for the hospital website";
    image.loading = "lazy";

    image.addEventListener("load", () => {
        websiteQr.replaceChildren(image);

        qrDescription.textContent =
            "QR code generated for: " + parsedUrl.href;
    });

    image.addEventListener("error", () => {
        qrDescription.textContent =
            "Could not generate QR code. Check your internet connection.";
    });
});

console.log("BlueCare Hospital website JavaScript loaded.");