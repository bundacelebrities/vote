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
// This is exposed for demo purposes only.
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
}

// ============ Shared DOM ============
const loader = document.getElementById("loader");
const toast = document.getElementById("toast");

let confettiTriggered = false;

// Rate limiting (frontend demo only)
const VOTE_LIMIT = 5;
const VOTE_WINDOW = 60 * 60 * 1000; // 1 hour
let userVotes = JSON.parse(localStorage.getItem("userVotes") || "[]");

function canVote() {
  const now = Date.now();
  userVotes = userVotes.filter(vote => now - vote.timestamp < VOTE_WINDOW);
  return userVotes.length < VOTE_LIMIT;
}

function recordVote() {
  userVotes.push({ timestamp: Date.now() });
  localStorage.setItem("userVotes", JSON.stringify(userVotes));
}

function validatePhoneNumber(phone) {
  const tanzaniaRegex = /^(\+255|255|0)[67]\d{8}$/;
  return tanzaniaRegex.test(phone);
}

function showToast(message) {
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

const navMenu = document.getElementById("navMenu");
const menuToggle = document.getElementById("menuToggle");

function toggleMenu() {
  if (!navMenu || !menuToggle) return;
  const isOpen = !navMenu.classList.contains("active");
  navMenu.classList.toggle("active", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

if (menuToggle) {
  menuToggle.addEventListener("click", toggleMenu);
}

function hideLoader() {
  if (loader) loader.classList.add("hidden");
}

// Countdown timer (exists in both pages)
const votingEndDate = new Date("May 20, 2026 23:59:59").getTime();
const countdown = setInterval(() => {
  const now = new Date().getTime();
  const distance = votingEndDate - now;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  const elDays = document.getElementById("days");
  const elHours = document.getElementById("hours");
  const elMinutes = document.getElementById("minutes");
  const elSeconds = document.getElementById("seconds");

  if (elDays) elDays.innerHTML = days;
  if (elHours) elHours.innerHTML = hours;
  if (elMinutes) elMinutes.innerHTML = minutes;
  if (elSeconds) elSeconds.innerHTML = seconds;

  if (distance < 0) {
    clearInterval(countdown);
    const countdownWrap = document.querySelector(".countdown");
    if (countdownWrap) countdownWrap.innerHTML = `<h2>Voting Closed</h2>`;
  }
}, 1000);

// ============ Home Page (index.html) ============
function initHome({ contestants }) {
  // Top leaders
  const topLeaders = document.getElementById("topLeaders");
  if (topLeaders) {
    topLeaders.innerHTML = "";
    const topThree = contestants.slice(0, 3);

    topThree.forEach((contestant, index) => {
      const whatsappMessage = `Vote for ${contestant.name} on Bunda Celebrities Voting Platform`;
      const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

      topLeaders.innerHTML += `
        <div class="leader-card">
          <div class="crown">${index === 0 ? "👑" : "⭐"}</div>
          <img src="${contestant.image}" alt="" />
          <h3>${contestant.name}</h3>
          <p>${contestant.votes} Votes</p>
          <a href="${whatsappLink}" target="_blank" class="share-btn">Share</a>
        </div>
      `;
    });

    if (topThree.length > 0 && !confettiTriggered) {
      confettiTriggered = true;
      if (typeof confetti === "function") {
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
      }
    }
  }

  // Stats
  const totalVotes = document.getElementById("totalVotes");
  const totalContestants = document.getElementById("totalContestants");
  const topCategory = document.getElementById("topCategory");

  if (totalVotes && totalContestants && topCategory) {
    const votes = contestants.reduce((total, c) => total + (c.votes || 0), 0);
    animateValue(totalVotes, votes);
    animateValue(totalContestants, contestants.length);

    const categoryCounts = {};
    contestants.forEach(c => {
      const category = c.category || "-";
      categoryCounts[category] = (categoryCounts[category] || 0) + (c.votes || 0);
    });

    let bestCategory = "-";
    let highest = 0;
    for (const category in categoryCounts) {
      if (categoryCounts[category] > highest) {
        highest = categoryCounts[category];
        bestCategory = category;
      }
    }
    topCategory.innerHTML = bestCategory;
  }
}

function animateValue(element, endValue) {
  if (!element) return;

  let startValue = 0;
  const duration = 1000;
  const increment = endValue / (duration / 16);

  const counter = setInterval(() => {
    startValue += increment;
    if (startValue >= endValue) {
      startValue = endValue;
      clearInterval(counter);
    }
    element.innerHTML = Math.floor(startValue);
  }, 16);
}

function initLeaderboardPage() {
  const searchInput = document.getElementById("searchLeaderboard");
  const categoryFilter = document.getElementById("filterLeaderboard");
  const leaderboardContainer = document.getElementById("leaderboardContainer");
  const categoryAnalysis = document.getElementById("categoryAnalysis");
  const categoryBreakdown = document.getElementById("categoryBreakdown");
  const totalVotesEl = document.getElementById("leaderboardTotalVotes");
  const totalContestantsEl = document.getElementById("leaderboardContestantsCount");
  const categoriesCountEl = document.getElementById("leaderboardCategoriesCount");
  const topCategoryEl = document.getElementById("leaderboardTopCategory");

  let allContestants = [];
  let totalVotesAll = 0;

  const formatNumber = (value) => {
    return typeof value === "number" ? value.toLocaleString() : "0";
  };

  const buildSummary = (contestants) => {
    const totalVotes = contestants.reduce((sum, contestant) => sum + (contestant.votes || 0), 0);
    const categories = Array.from(
      new Set(
        contestants
          .map(contestant => (typeof contestant.category === "string" ? contestant.category.trim() : ""))
          .filter(Boolean)
      )
    );

    const categoryTotals = {};
    contestants.forEach(contestant => {
      const category = (contestant.category || "Unclassified").trim();
      categoryTotals[category] = (categoryTotals[category] || 0) + (contestant.votes || 0);
    });

    const topCategory = Object.entries(categoryTotals)
      .sort(([, aVotes], [, bVotes]) => bVotes - aVotes)
      .map(([category]) => category)[0] || "-";

    if (totalVotesEl) totalVotesEl.innerText = formatNumber(totalVotes);
    if (totalContestantsEl) totalContestantsEl.innerText = formatNumber(contestants.length);
    if (categoriesCountEl) categoriesCountEl.innerText = formatNumber(categories.length);
    if (topCategoryEl) topCategoryEl.innerText = topCategory;

    totalVotesAll = totalVotes;
  };

  const renderLeaderboardTable = (contestants) => {
    if (!leaderboardContainer) return;

    if (!contestants.length) {
      leaderboardContainer.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">No participants found for this search or category.</td>
        </tr>
      `;
      return;
    }

    leaderboardContainer.innerHTML = contestants
      .map((contestant, index) => {
        const votes = contestant.votes || 0;
        const share = totalVotesAll > 0 ? Math.round((votes / totalVotesAll) * 100) : 0;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${contestant.name}</td>
            <td>${contestant.category || "Unclassified"}</td>
            <td>${formatNumber(votes)}</td>
            <td>${share}%</td>
          </tr>
        `;
      })
      .join("");
  };

  const buildCategoryAnalysis = (contestants) => {
    if (!categoryAnalysis) return;

    const categoryStats = contestants.reduce((carry, contestant) => {
      const category = (contestant.category || "Unclassified").trim();
      const current = carry[category] || { votes: 0, count: 0, top: null };
      const votes = contestant.votes || 0;
      current.votes += votes;
      current.count += 1;
      if (!current.top || votes > current.top.votes) {
        current.top = { name: contestant.name, votes };
      }
      carry[category] = current;
      return carry;
    }, {});

    categoryAnalysis.innerHTML = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.votes - a.votes)
      .map(([category, stats]) => `
        <div class="analysis-card">
          <h3>${category}</h3>
          <p><strong>${formatNumber(stats.count)}</strong> contestants</p>
          <p><strong>${formatNumber(stats.votes)}</strong> total votes</p>
          <p class="analysis-note">Top performer: ${stats.top.name} (${formatNumber(stats.top.votes)} votes)</p>
        </div>
      `)
      .join("");
  };

  const buildCategoryBreakdown = (contestants) => {
    if (!categoryBreakdown) return;

    const categoryStats = contestants.reduce((carry, contestant) => {
      const category = (contestant.category || "Unclassified").trim();
      const votes = contestant.votes || 0;
      if (!carry[category]) {
        carry[category] = { votes: 0, count: 0 };
      }
      carry[category].votes += votes;
      carry[category].count += 1;
      return carry;
    }, {});

    categoryBreakdown.innerHTML = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.votes - a.votes)
      .map(([category, stats]) => `
        <div class="breakdown-card">
          <h4>${category}</h4>
          <div class="breakdown-row"><span>Nominees:</span><strong>${formatNumber(stats.count)}</strong></div>
          <div class="breakdown-row"><span>Total Votes:</span><strong>${formatNumber(stats.votes)}</strong></div>
          <div class="breakdown-row"><span>Avg / nominee:</span><strong>${Math.round(stats.votes / stats.count)}</strong></div>
        </div>
      `)
      .join("");
  };

  const buildTopPerformers = (contestants) => {
    const topOverallList = document.getElementById("topOverallList");
    const topPerCategoryList = document.getElementById("topPerCategoryList");

    if (topOverallList) {
      const top10 = contestants.slice(0, 10);
      topOverallList.innerHTML = top10.map((contestant, index) => `
        <div class="top-item">
          <span class="rank">${index + 1}</span>
          <span class="name">${contestant.name}</span>
          <span class="votes">${formatNumber(contestant.votes || 0)}</span>
        </div>
      `).join("");
    }

    if (topPerCategoryList) {
      const categoryTops = contestants.reduce((carry, contestant) => {
        const category = (contestant.category || "Unclassified").trim();
        if (!carry[category]) carry[category] = [];
        carry[category].push(contestant);
        return carry;
      }, {});

      const topPerCategory = Object.entries(categoryTops)
        .map(([category, list]) => ({
          category,
          top3: list.sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 3)
        }))
        .filter(item => item.top3.length > 0);

      topPerCategoryList.innerHTML = topPerCategory.map(item => `
        <div class="category-top">
          <h4>${item.category}</h4>
          ${item.top3.map((contestant, index) => `
            <div class="top-item">
              <span class="rank">${index + 1}</span>
              <span class="name">${contestant.name}</span>
              <span class="votes">${formatNumber(contestant.votes || 0)}</span>
            </div>
          `).join("")}
        </div>
      `).join("");
    }
  };

  const buildCharts = (contestants) => {
    const overallChart = document.getElementById("overallChart");
    const categoryChart = document.getElementById("categoryChart");

    if (overallChart) {
      const top10 = contestants.slice(0, 10);
      overallChart.innerHTML = top10.map(contestant => {
        const percentage = totalVotesAll > 0 ? ((contestant.votes || 0) / totalVotesAll) * 100 : 0;
        return `
          <div class="chart-bar">
            <div class="chart-label">${contestant.name}</div>
            <div class="chart-bar-fill" style="width: ${percentage}%"></div>
            <div class="chart-value">${formatNumber(contestant.votes || 0)}</div>
          </div>
        `;
      }).join("");
    }

    if (categoryChart) {
      const categoryStats = contestants.reduce((carry, contestant) => {
        const category = (contestant.category || "Unclassified").trim();
        carry[category] = (carry[category] || 0) + (contestant.votes || 0);
        return carry;
      }, {});

      const sortedCategories = Object.entries(categoryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

      categoryChart.innerHTML = sortedCategories.map(([category, votes]) => {
        const percentage = totalVotesAll > 0 ? (votes / totalVotesAll) * 100 : 0;
        return `
          <div class="chart-bar">
            <div class="chart-label">${category}</div>
            <div class="chart-bar-fill" style="width: ${percentage}%"></div>
            <div class="chart-value">${formatNumber(votes)}</div>
          </div>
        `;
      }).join("");
    }
  };

  const buildTrending = (contestants) => {
    const trendingGrid = document.getElementById("trendingGrid");

    if (!trendingGrid) return;

    // Simulate trending based on recent votes (in real app, track vote timestamps)
    const trending = contestants
      .filter(contestant => (contestant.votes || 0) > 50) // High vote threshold
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 6);

    trendingGrid.innerHTML = trending.map(contestant => `
      <div class="trending-card">
        <div class="trending-icon">🔥</div>
        <h4>${contestant.name}</h4>
        <p>${contestant.category}</p>
        <div class="trending-votes">${formatNumber(contestant.votes || 0)} votes</div>
      </div>
    `).join("");
  };

  const setupExport = (contestants) => {
    const exportCSV = document.getElementById("exportCSV");
    const exportPDF = document.getElementById("exportPDF");

    if (exportCSV) {
      exportCSV.addEventListener("click", () => {
        const csvContent = [
          ["Rank", "Name", "Category", "Votes"],
          ...contestants.map((contestant, index) => [
            index + 1,
            contestant.name,
            contestant.category || "Unclassified",
            contestant.votes || 0
          ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bunda-celebrities-results.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (exportPDF) {
      exportPDF.addEventListener("click", () => {
        // Enhanced PDF export with comprehensive results
        const totalVotes = contestants.reduce((sum, c) => sum + (c.votes || 0), 0);
        const totalContestants = contestants.length;
        const categories = Array.from(new Set(contestants.map(c => c.category || "Unclassified")));
        const categoryStats = categories.map(cat => {
          const catContestants = contestants.filter(c => (c.category || "Unclassified") === cat);
          const catVotes = catContestants.reduce((sum, c) => sum + (c.votes || 0), 0);
          const topPerformer = catContestants.sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
          return { category: cat, votes: catVotes, count: catContestants.length, top: topPerformer };
        }).sort((a, b) => b.votes - a.votes);

        const mostCompetitiveCategory = categoryStats.find(cat => cat.count > 1) || categoryStats[0];

        const printContent = `
          <html>
            <head>
              <title>Bunda Celebrities Awards 2025/2026 - Official Results</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #facc15; text-align: center; }
                h2 { color: #333; border-bottom: 2px solid #facc15; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #facc15; color: black; }
                .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .winner { background-color: #fff5f5; }
              </style>
            </head>
            <body>
              <h1>Bunda Celebrities Awards 2025/2026</h1>
              <h2>Official Results Report</h2>

              <div class="summary">
                <h3>Summary Statistics</h3>
                <p><strong>Total Contestants:</strong> ${totalContestants}</p>
                <p><strong>Total Votes Cast:</strong> ${formatNumber(totalVotes)}</p>
                <p><strong>Number of Categories:</strong> ${categories.length}</p>
                <p><strong>Most Competitive Category:</strong> ${mostCompetitiveCategory.category} (${mostCompetitiveCategory.count} contestants, ${formatNumber(mostCompetitiveCategory.votes)} votes)</p>
                <p><strong>Overall Winner:</strong> ${contestants[0]?.name || 'N/A'} (${formatNumber(contestants[0]?.votes || 0)} votes)</p>
              </div>

              <h2>Category Winners</h2>
              <table>
                <tr><th>Category</th><th>Winner</th><th>Votes</th><th>Total Category Votes</th><th>Contestants in Category</th></tr>
                ${categoryStats.map(cat => `
                  <tr class="${cat.top === contestants[0] ? 'winner' : ''}">
                    <td>${cat.category}</td>
                    <td>${cat.top?.name || 'N/A'}</td>
                    <td>${formatNumber(cat.top?.votes || 0)}</td>
                    <td>${formatNumber(cat.votes)}</td>
                    <td>${cat.count}</td>
                  </tr>
                `).join('')}
              </table>

              <h2>Complete Rankings</h2>
              <table>
                <tr><th>Rank</th><th>Name</th><th>Category</th><th>Votes</th><th>Vote Share</th></tr>
                ${contestants.map((contestant, index) => {
                  const share = totalVotes > 0 ? ((contestant.votes || 0) / totalVotes * 100).toFixed(2) : 0;
                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${contestant.name}</td>
                      <td>${contestant.category || "Unclassified"}</td>
                      <td>${formatNumber(contestant.votes || 0)}</td>
                      <td>${share}%</td>
                    </tr>
                  `;
                }).join('')}
              </table>

              <div class="summary">
                <p><em>Report generated on ${new Date().toLocaleString()}</em></p>
                <p><em>Bunda Celebrities Awards 2025/2026 - Powered by Mara Region Entertainment Community</em></p>
              </div>
            </body>
          </html>
        `;

        const printWindow = window.open("", "_blank");
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
      });
    }
  };

  const populateCategoryFilter = (contestants) => {
    if (!categoryFilter) return;

    const categories = Array.from(
      new Set(
        contestants
          .map(contestant => (typeof contestant.category === "string" ? contestant.category.trim() : ""))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const selectedValue = categoryFilter.value || "all";
    categoryFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Categories";
    categoryFilter.appendChild(allOption);

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    if (categories.includes(selectedValue) || selectedValue === "all") {
      categoryFilter.value = selectedValue;
    }
  };

  const filterLeaderboard = () => {
    if (!allContestants.length) return;

    const searchValue = (searchInput?.value || "").trim().toLowerCase();
    const selectedCategory = categoryFilter?.value || "all";

    const filtered = allContestants.filter(contestant => {
      const nameMatches = (contestant.name || "").toLowerCase().includes(searchValue);
      const categoryMatches = (contestant.category || "").toLowerCase().includes(searchValue);
      const matchesSearch = !searchValue || nameMatches || categoryMatches;
      const matchesCategory = selectedCategory === "all" || contestant.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    renderLeaderboardTable(filtered);
  };

  if (searchInput) {
    searchInput.addEventListener("input", filterLeaderboard);
  }
  if (categoryFilter) {
    categoryFilter.addEventListener("change", filterLeaderboard);
  }

  onSnapshot(collection(db, "contestants"), (snapshot) => {
    const contestants = [];
    snapshot.forEach(docSnap => contestants.push({ id: docSnap.id, ...docSnap.data() }));
    contestants.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    allContestants = contestants;
    buildSummary(contestants);
    populateCategoryFilter(contestants);
    buildCategoryAnalysis(contestants);
    buildCategoryBreakdown(contestants);
    buildTopPerformers(contestants);
    buildCharts(contestants);
    buildTrending(contestants);
    setupExport(contestants);
    renderLeaderboardTable(contestants);

    if (loader) {
      setTimeout(() => loader.classList.add("hidden"), 600);
    }
  }, (error) => {
    console.error("Error loading leaderboard data:", error);
    showToast("Failed to load leaderboard results. Please refresh the page.");
    if (loader) loader.classList.add("hidden");
  });
}

// ============ Voting Page (voting.html) ============
function initVotingUI() {
  // Voting elements
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const contestantsContainer = document.getElementById("contestantsContainer");

  const voteModal = document.getElementById("voteModal");
  const closeModal = document.getElementById("closeModal");
  const modalContestantName = document.getElementById("modalContestantName");
  const modalVotes = document.getElementById("modalVotes");
  const confirmVoteBtn = document.getElementById("confirmVoteBtn");
  const voteOptions = document.querySelectorAll(".vote-option");

  const paymentModal = document.getElementById("paymentModal");
  const closePayment = document.getElementById("closePayment");
  const payNowBtn = document.getElementById("payNowBtn");
  const paymentMethods = document.querySelectorAll(".payment-method");

  const activityContainer = document.getElementById("activityContainer");

  if (!contestantsContainer || !voteModal || !paymentModal) {
    return;
  }

  let allContestants = [];
  let selectedContestantId = null;
  let selectedVotes = 1;
  let recentActivities = [];
  let selectedPaymentMethod = "";

  function populateCategoryFilter(contestants) {
    if (!categoryFilter) return;

    const categories = Array.from(new Set(
      contestants
        .map(c => (typeof c.category === "string" ? c.category.trim() : ""))
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const currentValue = categoryFilter.value || "all";
    categoryFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Categories";
    categoryFilter.appendChild(allOption);

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    if (categories.includes(currentValue) || currentValue === "all") {
      categoryFilter.value = currentValue;
    }
  }

  // Modal close
  if (closeModal) {
    closeModal.addEventListener("click", () => {
      voteModal.style.display = "none";
      voteModal.setAttribute("aria-hidden", "true");
    });
  }

  // Modal keyboard close
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (voteModal && voteModal.style.display === "flex") {
      voteModal.style.display = "none";
      voteModal.setAttribute("aria-hidden", "true");
    }
    if (paymentModal && paymentModal.style.display === "flex") {
      paymentModal.style.display = "none";
      paymentModal.setAttribute("aria-hidden", "true");
    }
  });

  // Confirm vote opens payment modal
  if (confirmVoteBtn) {
    confirmVoteBtn.addEventListener("click", () => {
      paymentModal.style.display = "flex";
    });
  }

  // Select vote package
  voteOptions.forEach(option => {
    option.addEventListener("click", () => {
      voteOptions.forEach(btn => btn.classList.remove("active"));
      option.classList.add("active");
      selectedVotes = Number(option.dataset.votes || 1);
    });
  });

  // Select payment method
  paymentMethods.forEach(method => {
    method.addEventListener("click", () => {
      paymentMethods.forEach(btn => btn.classList.remove("active"));
      method.classList.add("active");
      selectedPaymentMethod = method.innerText.trim();
    });
  });

  // Close payment
  if (closePayment) {
    closePayment.addEventListener("click", () => {
      paymentModal.style.display = "none";
      paymentModal.setAttribute("aria-hidden", "true");
    });
  }

  function displayActivities() {
    if (!activityContainer) return;
    activityContainer.innerHTML = "";

    recentActivities.forEach(activity => {
      activityContainer.innerHTML += `
        <div class="activity-item">
          <div>
            Someone voted <strong>${activity.votes}</strong> votes for <strong>${activity.name}</strong>
          </div>
          <div class="activity-time">${activity.time}</div>
        </div>
      `;
    });
  }

  function displayContestants(contestants) {
    contestantsContainer.innerHTML = "";

    const maxVotes = Math.max(...contestants.map(c => c.votes || 0), 1); // Avoid division by zero

    contestants.forEach((contestant, index) => {
      const rankNum = index + 1;
      const imgSrc = contestant.image || "images/placeholder.svg";
      const votes = contestant.votes || 0;
      const progressPercentage = (votes / maxVotes) * 100;

      contestantsContainer.innerHTML += `
        <div class="card rank-${rankNum}" role="article" aria-labelledby="contestant-${contestant.id}">
          <div class="rank-badge" aria-label="Rank ${rankNum}">${rankNum === 1 ? "⭐ #" : "#"}${rankNum}</div>
          <img src="${imgSrc}" alt="Photo of ${contestant.name}" loading="lazy" />
          <div class="card-content">
            <h3 id="contestant-${contestant.id}">${contestant.name}</h3>
            <p>${contestant.category}</p>
            <div class="votes" aria-label="${votes} votes">Votes: ${votes}</div>
            <div class="progress-bar" role="progressbar" aria-valuenow="${progressPercentage}" aria-valuemin="0" aria-valuemax="100">
              <div class="progress" style="width:${progressPercentage}%"></div>
            </div>
            <button class="vote-btn" data-id="${contestant.id}" aria-label="Vote for ${contestant.name}">Vote Now</button>
          </div>
        </div>
      `;
    });

    const voteButtons = contestantsContainer.querySelectorAll(".vote-btn");
    voteButtons.forEach(button => {
      button.addEventListener("click", () => {
        const contestantId = button.dataset.id;
        const contestant = allContestants.find(item => item.id === contestantId);
        if (!contestant) return;

        selectedContestantId = contestantId;
        modalContestantName.innerHTML = contestant.name;
        modalVotes.innerHTML = contestant.votes;

        voteModal.style.display = "flex";
        voteModal.setAttribute("aria-hidden", "false");
      });
    });
  }

  function filterContestants() {
    const searchValue = (searchInput?.value || "").toLowerCase();
    const selectedCategory = categoryFilter?.value || "all";

    const filtered = allContestants.filter(contestant => {
      const matchesSearch = (contestant.name || "").toLowerCase().includes(searchValue);
      const matchesCategory = selectedCategory === "all" || contestant.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    displayContestants(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", filterContestants);
  if (categoryFilter) categoryFilter.addEventListener("change", filterContestants);

  // Load contestants live
  onSnapshot(collection(db, "contestants"), (snapshot) => {
    const contestants = [];
    snapshot.forEach(docSnap => {
      contestants.push({ id: docSnap.id, ...docSnap.data() });
    });

    contestants.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    allContestants = contestants;

    // Populate category filter from Firebase categories
    populateCategoryFilter(contestants);

    // For voting page: show full list initially
    displayContestants(contestants);
    hideLoader();

    // Also update leaderboard/stats if those containers exist
    const topLeaders = document.getElementById("topLeaders");
    if (topLeaders) {
      initHome({ contestants });
    }
  });

  // Payment -> vote update (frontend demo: still simulated)
  if (payNowBtn) {
    payNowBtn.addEventListener("click", async () => {
      try {
        if (!selectedContestantId) return showToast("Contestant not selected");
        if (!selectedPaymentMethod) return showToast("Please select payment method");

        const paymentInput = document.querySelector(".payment-input");
        const phone = paymentInput ? paymentInput.value.trim() : "";
        if (!phone) return showToast("Enter phone number");
        if (!validatePhoneNumber(phone)) return showToast("Please enter a valid Tanzanian phone number");

        if (!canVote()) return showToast("You have reached the maximum votes per hour. Please try again later.");

        payNowBtn.innerHTML = "Processing...";
        payNowBtn.disabled = true;

        // Simulate payment confirmation
        await new Promise(r => setTimeout(r, 900));

        const contestantRef = doc(db, "contestants", selectedContestantId);
        await updateDoc(contestantRef, { votes: increment(selectedVotes) });

        recordVote();

        const contestant = allContestants.find(item => item.id === selectedContestantId);
        if (contestant && activityContainer) {
          recentActivities.unshift({
            name: contestant.name,
            votes: selectedVotes,
            time: new Date().toLocaleTimeString()
          });
          if (recentActivities.length > 8) recentActivities.pop();
          displayActivities();
        }

        showToast("Vote submitted successfully!");

        if (typeof confetti === "function") {
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
        }

        paymentModal.style.display = "none";
        voteModal.style.display = "none";

        if (paymentInput) paymentInput.value = "";
        selectedPaymentMethod = "";
        paymentMethods.forEach(btn => btn.classList.remove("active"));

        payNowBtn.innerHTML = "Pay Now";
        payNowBtn.disabled = false;
      } catch (error) {
        console.error(error);
        showToast("Payment failed. Try again.");
        if (payNowBtn) {
          payNowBtn.innerHTML = "Pay Now";
          payNowBtn.disabled = false;
        }
      }
    });
  }
}

// ============ Floating notifications (optional) ============
function initFakeNotifications() {
  const floatingNotification = document.getElementById("floatingNotification");
  const notificationText = document.getElementById("notificationText");

  if (!floatingNotification || !notificationText) return;

  const fakeNames = ["Brian", "Kelvin", "Sandra", "Focus", "Mariam", "Gift", "Amina", "John", "Prince", "Glory"];
  const fakeLocations = ["Bunda", "Mwanza", "Musoma", "Serengeti", "Mara", "Arusha"];

  const allContestantsRef = { current: [] };

  // Feed from Firestore snapshot
  onSnapshot(collection(db, "contestants"), snapshot => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    allContestantsRef.current = list;
  });

  function showFloatingNotification() {
    const list = allContestantsRef.current;
    if (!list || list.length === 0) return;

    const randomContestant = list[Math.floor(Math.random() * list.length)];
    const randomName = fakeNames[Math.floor(Math.random() * fakeNames.length)];
    const randomLocation = fakeLocations[Math.floor(Math.random() * fakeLocations.length)];
    const randomVotes = Math.floor(Math.random() * 20) + 1;

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
    setTimeout(() => floatingNotification.classList.remove("show"), 4000);
  }

  setInterval(showFloatingNotification, 8000);
}

// ============ Boot ============
const isVotingPage = !!document.getElementById("contestantsContainer") && !!document.getElementById("voteModal") && !!document.getElementById("paymentModal");
const isLeaderboardPage = !!document.getElementById("leaderboardContainer") && !!document.getElementById("filterLeaderboard") && !!document.getElementById("searchLeaderboard");

// Home & shared countdown/loader
if (!db) {
  showToast("Failed to connect to database. Please refresh the page.");
}

if (isVotingPage) {
  initVotingUI();
  initFakeNotifications();
} else if (isLeaderboardPage) {
  initLeaderboardPage();
} else {
  // Load contestants for home stats/leaders
  onSnapshot(collection(db, "contestants"), (snapshot) => {
    const contestants = [];
    snapshot.forEach(docSnap => contestants.push({ id: docSnap.id, ...docSnap.data() }));
    contestants.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    initHome({ contestants });

    if (loader) {
      setTimeout(() => loader.classList.add("hidden"), 600);
    }
  }, (error) => {
    console.error("Error loading contestants:", error);
    showToast("Failed to load contestants. Please refresh the page.");
    if (loader) loader.classList.add("hidden");
  });
}

