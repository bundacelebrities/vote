// FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// SECURITY NOTE: Move Firebase config to environment variables or backend
// For production, use: process.env.FIREBASE_API_KEY, etc.
// This is exposed for demo purposes only
// TODO: Implement proper authentication and authorization
const firebaseConfig = {
    apiKey: "AIzaSyBI8he4wEs7tMBzb4fwlIwQ5VTUCMjC378",
    authDomain: "bunda-celebrities-voting.firebaseapp.com",
    projectId: "bunda-celebrities-voting",
    storageBucket: "bunda-celebrities-voting.firebasestorage.app",
    messagingSenderId: "558995151206",
    appId: "1:558995151206:web:a3ae7bc1d7fa613b7690a7",
    measurementId: "G-BHC7ZMHS0J"
};

// Initialize Firebase
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization failed:", error);
    showToast("Failed to connect to database. Please try again later.");
}

const loader = document.getElementById("loader");
const toast = document.getElementById("toast");
let votingInProgress = false;

// Rate limiting: Max 5 votes per hour per user
const VOTE_LIMIT = 5;
const VOTE_WINDOW = 60 * 60 * 1000; // 1 hour

// Simple authentication: Track votes per session
let userVotes = JSON.parse(localStorage.getItem('userVotes') || '[]');

// SEARCH & FILTER
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
let allContestants = [];

// MOBILE MENU
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

// LEADERBOARD
const topLeaders = document.getElementById("topLeaders");

let confettiTriggered = false;

// STATS
const totalVotes = document.getElementById("totalVotes");

const totalContestants =
    document.getElementById("totalContestants");

const topCategory =
    document.getElementById("topCategory");

// ACTIVITY
const activityContainer =
    document.getElementById("activityContainer");

let recentActivities = [];

// FLOATING NOTIFICATION
const floatingNotification =
    document.getElementById("floatingNotification");

const notificationText =
    document.getElementById("notificationText");

// PAYMENT MODAL
const paymentModal =
    document.getElementById("paymentModal");

const closePayment =
    document.getElementById("closePayment");

const payNowBtn =
    document.getElementById("payNowBtn");

// PAYMENT METHODS
const paymentMethods =
    document.querySelectorAll(".payment-method");

let selectedPaymentMethod = "";

// MODAL ELEMENTS
const voteModal = document.getElementById("voteModal");

const closeModal = document.getElementById("closeModal");

const modalContestantName = document.getElementById("modalContestantName");

const modalVotes = document.getElementById("modalVotes");

const confirmVoteBtn = document.getElementById("confirmVoteBtn");

const voteOptions = document.querySelectorAll(".vote-option");

let selectedContestantId = null;

let selectedVotes = 1;


// Function to check rate limit
function canVote() {
    const now = Date.now();
    // Remove old votes outside the window
    userVotes = userVotes.filter(vote => now - vote.timestamp < VOTE_WINDOW);
    return userVotes.length < VOTE_LIMIT;
}

// Function to record vote
function recordVote() {
    userVotes.push({ timestamp: Date.now() });
    localStorage.setItem('userVotes', JSON.stringify(userVotes));
}

// Phone number validation
function validatePhoneNumber(phone) {
    const tanzaniaRegex = /^(\+255|255|0)[67]\d{8}$/;
    return tanzaniaRegex.test(phone);
}


// DISPLAY CONTESTANTS
function displayContestants(contestants) {

    contestantsContainer.innerHTML = "";

    contestants.forEach((contestant, index) => {

        // Cache image for better performance
        const img = new Image();
        img.src = contestant.image;
        img.onload = () => {
            // Image loaded successfully
        };
        img.onerror = () => {
            // Fallback to placeholder
            contestant.image = 'images/placeholder.svg';
        };

        contestantsContainer.innerHTML += `

        <div class="card rank-${index + 1}" role="article" aria-labelledby="contestant-${contestant.id}">

          <div class="rank-badge" aria-label="Rank ${index + 1}">
            ${index === 0 ? "⭐ #" : "#"}${index + 1}
          </div>

          <img src="${contestant.image}" alt="Photo of ${contestant.name}" loading="lazy">

          <div class="card-content">

            <h3 id="contestant-${contestant.id}">${contestant.name}</h3>

            <p>${contestant.category}</p>

            <div class="votes" aria-label="${contestant.votes} votes">
              Votes: ${contestant.votes}
            </div>

            <div class="progress-bar" role="progressbar" aria-valuenow="${Math.min(contestant.votes / 100, 100)}" aria-valuemin="0" aria-valuemax="100">

              <div 
                class="progress"
                style="width:${Math.min(contestant.votes / 100, 100)}%"
              ></div>

            </div>

            <button 
              class="vote-btn"
              data-id="${contestant.id}"
              aria-label="Vote for ${contestant.name}"
            >
              Vote Now
            </button>

          </div>

        </div>

        `;

    });


    // VOTE BUTTONS
    const voteButtons = document.querySelectorAll(".vote-btn");

    voteButtons.forEach((button) => {

        if (!voteModal || !modalContestantName || !modalVotes) {
            button.disabled = true;
            button.setAttribute("aria-disabled", "true");
            button.textContent = "Voting disabled";
            return;
        }

        button.addEventListener("click", () => {

            const contestantId = button.dataset.id;

            const contestant = allContestants.find(
                item => item.id === contestantId
            );

            selectedContestantId = contestantId;

            modalContestantName.innerHTML = contestant.name;

            modalVotes.innerHTML = contestant.votes;

            voteModal.style.display = "flex";
            voteModal.setAttribute('aria-hidden', 'false');

        });

    });

}


// LOAD CONTESTANTS LIVE
function loadContestants() {
    try {
        onSnapshot(collection(db, "contestants"), (snapshot) => {
            let contestants = [];

            // STORE DATA
            snapshot.forEach((docSnap) => {
                contestants.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            // SORT BY VOTES DESCENDING
            contestants.sort((a, b) => b.votes - a.votes);

            allContestants = contestants;

            // DISPLAY
            displayContestants(contestants);
            displayTopLeaders(contestants);
            updateStats(contestants);
            // HIDE LOADER
            setTimeout(() => {
                loader.classList.add("hidden");
            }, 1000);
        }, (error) => {
            console.error("Error loading contestants:", error);
            showToast("Failed to load contestants. Please refresh the page.");
            loader.classList.add("hidden");
        });
    } catch (error) {
        console.error("Error setting up contestants listener:", error);
        showToast("Database connection error. Please try again later.");
        loader.classList.add("hidden");
    }
}


// COUNTDOWN TIMER
// TODO: Update voting end date as needed
const votingEndDate = new Date("May 10, 2026 23:59:59").getTime();

const countdown = setInterval(() => {

    const now = new Date().getTime();

    const distance = votingEndDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));

    const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    const minutes = Math.floor(
        (distance % (1000 * 60 * 60)) / (1000 * 60)
    );

    const seconds = Math.floor(
        (distance % (1000 * 60)) / 1000
    );

    document.getElementById("days").innerHTML = days;

    document.getElementById("hours").innerHTML = hours;

    document.getElementById("minutes").innerHTML = minutes;

    document.getElementById("seconds").innerHTML = seconds;

    if (distance < 0) {

        clearInterval(countdown);

        document.querySelector(".countdown").innerHTML = `
            <h2>Voting Closed</h2>
        `;

    }

}, 1000);


// CLOSE MODAL
if (closeModal && voteModal) {
    closeModal.addEventListener("click", () => {
        voteModal.style.display = "none";
        voteModal.setAttribute('aria-hidden', 'true');
    });
}

// Keyboard navigation for modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (voteModal && voteModal.style.display === 'flex') {
            voteModal.style.display = 'none';
            voteModal.setAttribute('aria-hidden', 'true');
        }
        if (paymentModal && paymentModal.style.display === 'flex') {
            paymentModal.style.display = 'none';
            paymentModal.setAttribute('aria-hidden', 'true');
        }
    }
});


// SELECT VOTE PACKAGE
voteOptions.forEach((option) => {

    option.addEventListener("click", () => {

        voteOptions.forEach(btn => {
            btn.classList.remove("active");
        });

        option.classList.add("active");

        selectedVotes = Number(option.dataset.votes);

    });

});


// CONFIRM VOTE
if (confirmVoteBtn && paymentModal) {
    confirmVoteBtn.addEventListener("click", () => {
        paymentModal.style.display = "flex";
    });
}


// FILTER FUNCTION
function filterContestants() {

    const searchValue = searchInput.value.toLowerCase();

    const selectedCategory = categoryFilter.value;

    let filtered = allContestants.filter((contestant) => {

        const matchesSearch =
            contestant.name.toLowerCase().includes(searchValue);

        const matchesCategory =
            selectedCategory === "all" ||
            contestant.category === selectedCategory;

        return matchesSearch && matchesCategory;

    });

    displayContestants(filtered);

}


// EVENTS
searchInput.addEventListener("input", filterContestants);

categoryFilter.addEventListener("change", filterContestants);

// RUN
loadContestants();

// MOBILE MENU TOGGLE
menuToggle.addEventListener("click", () => {

    navMenu.classList.toggle("active");

});

// DISPLAY TOP LEADERS
function displayTopLeaders(contestants) {

    topLeaders.innerHTML = "";

    const topThree = contestants.slice(0, 3);

    topThree.forEach((contestant, index) => {

        const whatsappMessage =
            `Vote for ${contestant.name} on Bunda Celebrities Voting Platform`;

        const whatsappLink =
            `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

        topLeaders.innerHTML += `

        <div class="leader-card">

            <div class="crown">
                ${index === 0 ? "👑" : "⭐"}
            </div>

            <img src="${contestant.image}" alt="">

            <h3>${contestant.name}</h3>

            <p>${contestant.votes} Votes</p>

            <a 
                href="${whatsappLink}"
                target="_blank"
                class="share-btn"
            >
                Share
            </a>

        </div>

        `;

    });

    // CONFETTI FOR TOP LEADER

    if (topThree.length > 0 && !confettiTriggered) {

        confettiTriggered = true;

        confetti({

            particleCount: 200,
            spread: 120,
            origin: { y: 0.6 }

        });

    }

}

// UPDATE STATS
function updateStats(contestants) {

    // TOTAL VOTES
    const votes = contestants.reduce(
        (total, contestant) =>
            total + contestant.votes,
        0
    );

    animateValue(totalVotes, votes);


    // TOTAL CONTESTANTS
    animateValue(
        totalContestants,
        contestants.length
    );


    // TOP CATEGORY
    const categoryCounts = {};

    contestants.forEach((contestant) => {

        categoryCounts[contestant.category] =
            (categoryCounts[contestant.category] || 0) + contestant.votes;

    });

    let highest = 0;

    let bestCategory = "-";

    for (const category in categoryCounts) {

        if (categoryCounts[category] > highest) {

            highest = categoryCounts[category];

            bestCategory = category;

        }

    }

    topCategory.innerHTML = bestCategory;

}

// ANIMATE COUNTER
function animateValue(element, endValue) {

    let startValue = 0;

    const duration = 1000;

    const increment =
        endValue / (duration / 16);

    const counter = setInterval(() => {

        startValue += increment;

        if (startValue >= endValue) {

            startValue = endValue;

            clearInterval(counter);

        }

        element.innerHTML =
            Math.floor(startValue);

    }, 16);

}

// DISPLAY ACTIVITIES
function displayActivities() {

    activityContainer.innerHTML = "";

    recentActivities.forEach((activity) => {

        activityContainer.innerHTML += `

        <div class="activity-item">

            <div>

                Someone voted
                <strong>${activity.votes}</strong>
                votes for
                <strong>${activity.name}</strong>

            </div>

            <div class="activity-time">

                ${activity.time}

            </div>

        </div>

        `;

    });

}

// FAKE LIVE NOTIFICATIONS

const fakeNames = [

    "Brian",
    "Kelvin",
    "Sandra",
    "Focus",
    "Mariam",
    "Gift",
    "Amina",
    "John",
    "Prince",
    "Glory"

];

const fakeLocations = [

    "Bunda",
    "Mwanza",
    "Musoma",
    "Serengeti",
    "Mara",
    "Arusha"

];

function showFloatingNotification() {

    if (allContestants.length === 0) return;

    const randomContestant =
        allContestants[
        Math.floor(Math.random() * allContestants.length)
        ];

    const randomName =
        fakeNames[
        Math.floor(Math.random() * fakeNames.length)
        ];

    const randomLocation =
        fakeLocations[
        Math.floor(Math.random() * fakeLocations.length)
        ];

    const randomVotes =
        Math.floor(Math.random() * 20) + 1;

    notificationText.innerHTML = `

        <strong>${randomName}</strong>
        from
        <strong>${randomLocation}</strong>
        voted
        <strong>${randomVotes}</strong>
        votes for
        <strong>${randomContestant.name}</strong>

    `;

    floatingNotification.classList.add("show");

    setTimeout(() => {

        floatingNotification.classList.remove("show");

    }, 4000);

}


// SHOW EVERY 8 SECONDS
setInterval(() => {

    showFloatingNotification();

}, 8000);

// PAY NOW
// TOAST FUNCTION

function showToast(message) {

    toast.innerHTML = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}



// PAY NOW

payNowBtn.addEventListener("click", async () => {

    try {

        // VALIDATIONS

        if (!selectedContestantId) {

            showToast("Contestant not selected");

            return;

        }

        if (selectedPaymentMethod === "") {

            showToast("Please select payment method");

            return;

        }

        const paymentInput =
            document.querySelector(".payment-input");

        const phone =
            paymentInput.value.trim();

        if (phone === "") {

            showToast("Enter phone number");

            return;

        }

        if (!validatePhoneNumber(phone)) {

            showToast("Please enter a valid Tanzanian phone number");

            return;

        }

        // Check rate limit
        if (!canVote()) {

            showToast("You have reached the maximum votes per hour. Please try again later.");

            return;

        }

        // LOADING
        payNowBtn.innerHTML = "Processing...";
        payNowBtn.disabled = true;

        // TODO: Integrate with actual payment gateway (M-Pesa, Airtel Money, etc.)
        // Currently simulating payment processing


        // FIREBASE UPDATE

        const contestantRef = doc(

            db,
            "contestants",
            selectedContestantId

        );

        await updateDoc(contestantRef, {

            votes: increment(selectedVotes)

        });

        // Record vote for rate limiting
        recordVote();


        // FIND CONTESTANT

        const contestant =
            allContestants.find(

                item =>
                    item.id === selectedContestantId

            );


        // SAVE ACTIVITY

        recentActivities.unshift({

            name: contestant.name,

            votes: selectedVotes,

            time: new Date().toLocaleTimeString()

        });

        if (recentActivities.length > 8) {

            recentActivities.pop();

        }

        displayActivities();


        // SUCCESS TOAST

        showToast("Vote submitted successfully!");


        // CONFETTI

        confetti({

            particleCount: 150,

            spread: 100,

            origin: { y: 0.6 }

        });


        // CLOSE MODALS

        paymentModal.style.display = "none";

        voteModal.style.display = "none";


        // RESET INPUTS

        paymentInput.value = "";

        selectedPaymentMethod = "";

        paymentMethods.forEach((btn) => {

            btn.classList.remove("active");

        });


        // RESET BUTTON

        payNowBtn.innerHTML = "Pay Now";

        payNowBtn.disabled = false;

    }

    catch (error) {

        console.error(error);

        showToast("Payment failed. Try again.");

        payNowBtn.innerHTML = "Pay Now";

        payNowBtn.disabled = false;

    }

});



// CLOSE PAYMENT
closePayment.addEventListener("click", () => {
    paymentModal.style.display = "none";
    paymentModal.setAttribute('aria-hidden', 'true');
});



// SELECT PAYMENT METHOD

paymentMethods.forEach((method) => {

    method.addEventListener("click", () => {

        paymentMethods.forEach((btn) => {

            btn.classList.remove("active");

        });

        method.classList.add("active");

        selectedPaymentMethod =
            method.innerText.trim();

    });

});
