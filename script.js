const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyw66vbzAq8vzub0VLBj1N6eIrimCS_5gG1hf-wTgCg1okWF26dJxN4mIpWOM9DnDf3Ug/exec";
let html5QrCode = null;

// deployment ID: AKfycbyw66vbzAq8vzub0VLBj1N6eIrimCS_5gG1hf-wTgCg1okWF26dJxN4mIpWOM9DnDf3Ug

window.onload = () => {
    startCamera();
    checkConnection();
};

async function checkConnection() {
    const status = document.getElementById('connection-status');
    try {
        // Simple ping to check if SCRIPT_URL is reachable
        await fetch(SCRIPT_URL);
        status.innerText = "● Live Sync Active";
        status.className = "status-online";
    } catch (e) {
        status.innerText = "● Offline / URL Error";
        status.className = "status-pending";
    }
}

async function startCamera() {
    html5QrCode = new Html5Qrcode("reader");
    try {
        await html5QrCode.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: 250 }, 
            onScanSuccess
        );
    } catch (err) {
        Swal.fire("Camera Error", "Check permissions/HTTPS", "error");
    }
}

// --- 1. SCAN DETECTED ---
async function onScanSuccess(decodedText) {
    try {
        const guest = JSON.parse(decodedText);
        
        // Validate JSON structure
        if (guest.invitation_code && guest.invitation_name) {
            html5QrCode.pause(true); // Pause camera to focus on the popup

            let audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play();
            
            // Step 1: Show Confirmation First
            showConfirmation(guest);
        }
    } catch (e) {
        // Not our QR code format, ignore and keep scanning
    }
}

// --- 2. CONFIRMATION POPUP ---
function showConfirmation(guest) {
    Swal.fire({
        title: 'Confirm Souvenir?',
        html: `
            <div style="text-align: left; background: #f8fafc; padding: 15px; border-radius: 10px;">
                <p><strong>Name:</strong> ${guest.invitation_name}</p>
                <p><strong>Code:</strong> ${guest.invitation_code}</p>
                <p><strong>Type:</strong> ${guest.invitation_type}</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4a90e2',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Give Souvenir',
        cancelButtonText: 'Cancel',
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            // Step 2: Only deduct if "Yes" is clicked
            deductFromGoogleSheet(guest);
        } else {
            // Re-activate camera if cancelled
            html5QrCode.resume();
        }
    });
}

// --- 3. THE ACTUAL DATABASE DEDUCTION ---
async function deductFromGoogleSheet(guest) {
    Swal.fire({
        title: 'Updating Sheet...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ invitation_code: guest.invitation_code })
        });
        const result = await response.text();

        if (result === "Success") {
            addToHistory(guest.invitation_name, guest.invitation_type);
            Swal.fire("Success!", "Souvenir recorded in Google Sheets.", "success")
                .then(() => html5QrCode.resume());
        } else {
            Swal.fire("Failed", "Already claimed or code not found.", "error")
                .then(() => html5QrCode.resume());
        }
    } catch (err) {
        Swal.fire("Network Error", "Could not reach Google Sheets.", "error")
            .then(() => html5QrCode.resume());
    }
}

function addToHistory(name, type) {
    const list = document.getElementById('history-list');
    const emptyMsg = list.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <span class="history-name">${name}</span>
        <span class="history-type">Type: ${type}</span>
        <span class="history-time">${now}</span>
    `;
    
    list.prepend(item); // Add newest to top
    if (list.children.length > 5) list.lastElementChild.remove(); // Keep only last 5
}