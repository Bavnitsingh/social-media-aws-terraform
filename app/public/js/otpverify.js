const otpInput    = document.getElementById('otp');
const resetLink   = document.getElementById('resetlink');
const timerDisplay= document.getElementById('timer');
const otpval = document.getElementById('showOtp')
// timer control variables
let countdownId;
let totalSeconds = 120;

//  TIMER 
function startTimer() {
    totalSeconds = 120;                 // fresh 2 min
    clearInterval(countdownId);         // stop any previous timer
    timerDisplay.textContent = '2:00';

    countdownId = setInterval(() => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        if (totalSeconds <= 0) {
            clearInterval(countdownId);
            timerDisplay.textContent = '0:00';
            alert('Time is up! Requesting a new OTP…');
            resendOtp();                // auto‑request a new one when it expires
        } else {
            totalSeconds--;
        }
    }, 1000);
}

const resendOtp = async (e) => {
    try {
        const response = await fetch('/resendotp');

        if (!response.ok) {
            const err = await response.json();
            alert(err.message || 'Could not generate new OTP');
            return;
        }

        const data = await response.json();   
console.log(data.otp)
        otpval.innerHTML = data.otp;
        otpInput.value = '';                  
        resetLink.style.display = 'none';     

        startTimer();

        alert('A new OTP has been sent. It is valid for 2 minutes.');

    } catch (e) {
        console.error('Error in resendOtp:', e);
        alert('Unexpected error while requesting a new OTP');
    }
};

async function checkOtp(code) {
    try {
        const response = await fetch('/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp: code })
        });

        const result = await response.json();

        if (response.ok) {
            clearInterval(countdownId);          // stop timer on success
            alert('Verification Successful!');
            resetLink.style.display = 'block';
        } else {
            alert(result.message || 'Invalid OTP');
        }
    } catch (err) {
        console.error('Error verifying OTP:', err);
    }
}

document.getElementById('verifyBtn').addEventListener('click', () => {
    const otp = otpInput.value.trim();
    if (otp.length === 6) checkOtp(otp);
    else alert('Please enter a 6‑digit OTP');
});

document.getElementById('resendBtn').addEventListener('click',resendOtp)
document.addEventListener('DOMContentLoaded',resendOtp)
startTimer();  
