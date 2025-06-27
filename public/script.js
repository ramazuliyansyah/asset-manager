// public/script.js
const API_BASE_URL = "http://localhost:3000/api"; // Base URL for both auth and asset APIs

// UI Elements - Main Sections
const authSection = document.getElementById("authSection");
const homeDashboardSection = document.getElementById("homeDashboardSection");
const viewAssetsSection = document.getElementById("viewAssetsSection"); // New
const addAssetSection = document.getElementById("addAssetSection"); // New

// UI Elements - Message Box
const messageBox = document.getElementById("messageBox");
const messageBoxContent = document.getElementById("messageBoxContent");
const messageText = document.getElementById("messageText");
const messageConfirmBtn = document.getElementById("messageConfirmBtn");
const messageCancelBtn = document.getElementById("messageCancelBtn");
const messageCloseBtn = document.getElementById("messageCloseBtn");

// UI Elements - Auth
const authTitle = document.getElementById("auth-title");
const loginForm = document.getElementById("loginForm");
const loginUsernameInput = document.getElementById("loginUsername");
const loginPasswordInput = document.getElementById("loginPassword");
const signupForm = document.getElementById("signupForm");
const signupUsernameInput = document.getElementById("signupUsername");
const signupPasswordInput = document.getElementById("signupPassword");
const toggleAuthModeButton = document.getElementById("toggleAuthMode");

// UI Elements - Home Dashboard
const dashboardUsernameDisplay = document.getElementById("dashboardUsername");
const goToViewAssetsBtn = document.getElementById("goToViewAssetsBtn"); // New button
const goToAddAssetBtn = document.getElementById("goToAddAssetBtn"); // New button
const dashboardLogoutButton = document.getElementById("dashboardLogoutButton");

// UI Elements - View Assets Section
const cardViewBtn = document.getElementById("cardViewBtn");
const tableViewBtn = document.getElementById("tableViewBtn");
const cardViewContainer = document.getElementById("cardViewContainer");
const tableViewContainer = document.getElementById("tableViewContainer");
const assetTableBody = document.getElementById("assetTableBody");
const noAssetsMessageView = document.getElementById("noAssetsMessageView"); // Message specific to View Assets
const viewAssetsBackToDashboardBtn = document.getElementById(
  "viewAssetsBackToDashboardBtn"
);
const viewAssetsLogoutButton = document.getElementById(
  "viewAssetsLogoutButton"
);

// UI Elements - Add New Asset Section
const assetForm = document.getElementById("assetForm");
const assetNameInput = document.getElementById("assetName");
const assetTypeInput = document.getElementById("assetType");
const assetValueInput = document.getElementById("assetValue");
const acquisitionDateInput = document.getElementById("acquisitionDate");
const assetLocationInput = document.getElementById("assetLocation");
const assetIdInput = document.getElementById("assetId");
const submitButton = document.getElementById("submitButton");
const addAssetSectionTitle = document.getElementById("addAssetSectionTitle"); // To change title for edit mode
const cancelEditButton = document.getElementById("cancelEditButton");
const noAssetsMessageAdd = document.getElementById("noAssetsMessageAdd"); // Message specific to Add Asset (not used for errors)
const addAssetBackToDashboardBtn = document.getElementById(
  "addAssetBackToDashboardBtn"
);
const addAssetGoToViewAssetsBtn = document.getElementById(
  "addAssetGoToViewAssetsBtn"
);
const addAssetLogoutButton = document.getElementById("addAssetLogoutButton");

let isLoginMode = true;
let currentLoggedInUsername = "";
let currentAssetsData = []; // Store fetched assets
let currentViewMode = "card"; // Default view mode

/**
 * Manages which main section of the UI is visible.
 * @param {string} viewName 'auth', 'homeDashboard', 'viewAssets', or 'addAsset'.
 */
function renderView(viewName) {
  // Hide all sections first
  authSection.classList.add("hidden");
  homeDashboardSection.classList.add("hidden");
  viewAssetsSection.classList.add("hidden");
  addAssetSection.classList.add("hidden");

  // Show the requested section
  if (viewName === "auth") {
    authSection.classList.remove("hidden");
    isLoginMode = false; // Ensure login form is default
    toggleAuthForms();
  } else if (viewName === "homeDashboard") {
    homeDashboardSection.classList.remove("hidden");
    dashboardUsernameDisplay.textContent = currentLoggedInUsername;
    clearForm(); // Clear the form if coming from edit mode
  } else if (viewName === "viewAssets") {
    viewAssetsSection.classList.remove("hidden");
    fetchAssets().then(() => {
      // Fetch assets when entering this view
      if (currentViewMode === "card") {
        renderAssetsCardView(currentAssetsData);
        activateViewButton(cardViewBtn);
      } else {
        renderAssetsTableView(currentAssetsData);
        activateViewButton(tableViewBtn);
      }
    });
    clearForm(); // Clear the form if coming from edit mode
  } else if (viewName === "addAsset") {
    addAssetSection.classList.remove("hidden");
    clearForm(); // Always clear the form when navigating to "Add New Asset"
    addAssetSectionTitle.textContent = "Add New Asset"; // Reset title for new asset
  }
}

/**
 * Helper to activate/deactivate view toggle buttons styling.
 * @param {HTMLElement} activeBtn The button to set as active.
 */
function activateViewButton(activeBtn) {
  cardViewBtn.classList.remove("bg-blue-600", "text-white");
  cardViewBtn.classList.add("bg-gray-300", "text-gray-800");
  tableViewBtn.classList.remove("bg-blue-600", "text-white");
  tableViewBtn.classList.add("bg-gray-300", "text-gray-800");

  activeBtn.classList.remove("bg-gray-300", "text-gray-800");
  activeBtn.classList.add("bg-blue-600", "text-white");
}

function showMessageBox(message, type = "alert") {
  messageText.textContent = message;
  messageBox.classList.remove("hidden");
  setTimeout(() => {
    messageBoxContent.classList.remove("opacity-0", "scale-90");
    messageBoxContent.classList.add("opacity-100", "scale-100");
  }, 10);

  messageConfirmBtn.classList.add("hidden");
  messageCancelBtn.classList.add("hidden");
  messageCloseBtn.classList.add("hidden");

  return new Promise((resolve) => {
    const closeMessageBox = (result) => {
      messageBoxContent.classList.remove("opacity-100", "scale-100");
      messageBoxContent.classList.add("opacity-0", "scale-90");
      setTimeout(() => {
        messageBox.classList.add("hidden");
        messageConfirmBtn.onclick = null;
        messageCancelBtn.onclick = null;
        messageCloseBtn.onclick = null;
        resolve(result);
      }, 300);
    };

    if (type === "confirm") {
      messageConfirmBtn.classList.remove("hidden");
      messageCancelBtn.classList.remove("hidden");
      messageConfirmBtn.onclick = () => closeMessageBox(true);
      messageCancelBtn.onclick = () => closeMessageBox(false);
    } else {
      messageCloseBtn.classList.remove("hidden");
      messageCloseBtn.onclick = () => closeMessageBox(true);
    }
  });
}

function setAuthToken(token) {
  localStorage.setItem("jwtToken", token);
}

function getAuthToken() {
  return localStorage.getItem("jwtToken");
}

function removeAuthToken() {
  localStorage.removeItem("jwtToken");
}

function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decoding JWT:", e);
    return null;
  }
}

function toggleAuthForms() {
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    authTitle.textContent = "Secure Access";
    toggleAuthModeButton.textContent = "Don't have an account? Sign Up now!";
    loginUsernameInput.focus();
  } else {
    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");
    authTitle.textContent = "Create Account";
    toggleAuthModeButton.textContent = "Already have an account? Login here.";
    signupUsernameInput.focus();
  }
  loginUsernameInput.value = "";
  loginPasswordInput.value = "";
  signupUsernameInput.value = "";
  signupPasswordInput.value = "";
}

async function handleLogin(e) {
  e.preventDefault();
  const username = loginUsernameInput.value.trim();
  const password = loginPasswordInput.value.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      setAuthToken(data.token);
      const decodedToken = decodeJwt(data.token);
      currentLoggedInUsername = decodedToken.username;
      showMessageBox(data.message, "alert");
      renderView("homeDashboard"); // Go to home dashboard after login
    } else {
      showMessageBox(
        data.message || "Login failed. Please check your credentials.",
        "alert"
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    showMessageBox(`Login failed: ${error.message}`, "alert");
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const username = signupUsernameInput.value.trim();
  const password = signupPasswordInput.value.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (response.ok) {
      showMessageBox(data.message + "\nYou can now log in.", "alert");
      toggleAuthForms();
    } else {
      showMessageBox(data.message || "Signup failed.", "alert");
    }
  } catch (error) {
    console.error("Signup error:", error);
    showMessageBox(`Signup failed: ${error.message}`, "alert");
  }
}

function handleLogout() {
  const confirmed = showMessageBox(
    "Are you sure you want to log out?",
    "confirm"
  );
  confirmed.then((result) => {
    if (result) {
      removeAuthToken();
      currentLoggedInUsername = "";
      renderView("auth"); // Go back to auth view on logout
      showMessageBox("Logged out successfully.", "alert");
    }
  });
}

/**
 * Determines and renders the appropriate UI section based on authentication status.
 */
function updateUIForAuthStatus() {
  const token = getAuthToken();
  if (token) {
    const decoded = decodeJwt(token);
    if (decoded && decoded.username) {
      currentLoggedInUsername = decoded.username;
      renderView("homeDashboard"); // Display home dashboard first after login
      return;
    }
  }
  // If no token, or invalid token
  currentLoggedInUsername = "";
  renderView("auth");
  // Ensure asset list containers are empty and appropriate message is shown when logged out
  cardViewContainer.innerHTML = "";
  tableViewContainer.innerHTML = "";
  noAssetsMessageView.innerHTML =
    '<p class="text-gray-500 text-center col-span-full py-8 text-lg">Please log in to view your assets.</p>';
  noAssetsMessageView.classList.remove("hidden");
}

/**
 * Fetches all assets from the backend API for the authenticated user.
 * Stores them in `currentAssetsData` and then calls the appropriate render function.
 */
async function fetchAssets() {
  noAssetsMessageView.innerHTML =
    'Loading assets... <span class="spinner inline-block ml-2"></span>';
  noAssetsMessageView.classList.remove("hidden");
  cardViewContainer.innerHTML = ""; // Clear both containers before loading
  assetTableBody.innerHTML = "";

  const token = getAuthToken();
  if (!token) {
    noAssetsMessageView.textContent = "Please log in to view assets."; // Should not happen if called correctly
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        removeAuthToken();
        updateUIForAuthStatus();
        showMessageBox(
          "Your session has expired. Please log in again.",
          "alert"
        );
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const assets = await response.json();
    currentAssetsData = assets; // Store fetched data
    if (currentAssetsData.length === 0) {
      noAssetsMessageView.innerHTML =
        '<p class="text-gray-500 text-center col-span-full py-8 text-lg">No assets found. Click "Add New Asset" to get started!</p>';
      noAssetsMessageView.classList.remove("hidden");
      cardViewContainer.classList.add("hidden"); // Ensure containers are hidden
      tableViewContainer.classList.add("hidden");
      return;
    } else {
      noAssetsMessageView.classList.add("hidden");
    }

    if (currentViewMode === "card") {
      renderAssetsCardView(currentAssetsData);
    } else {
      renderAssetsTableView(currentAssetsData);
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
    showMessageBox(`Failed to load assets: ${error.message}`, "alert");
    noAssetsMessageView.innerHTML =
      "Failed to load assets. Please check your backend server or network connection.";
  }
}

function clearForm() {
  assetNameInput.value = "";
  assetTypeInput.value = "";
  assetValueInput.value = "";
  acquisitionDateInput.value = "";
  assetLocationInput.value = "";
  assetIdInput.value = ""; // Clear the hidden ID input
  submitButton.innerHTML =
    '<svg class="w-5 h-5 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg> Add Asset';
  addAssetSectionTitle.textContent = "Add New Asset"; // Reset title for new asset
  cancelEditButton.classList.add("hidden");
}

function populateFormForEdit(asset) {
  assetNameInput.value = asset.name;
  assetTypeInput.value = asset.type;
  assetValueInput.value = asset.value;
  acquisitionDateInput.value = asset.acquisition_date.substring(0, 10);
  assetLocationInput.value = asset.location;
  assetIdInput.value = asset.id;

  submitButton.innerHTML =
    '<svg class="w-5 h-5 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828L15.414 12H17a1 1 0 110 2h-1.586l-.707.707a1 1 0 01-1.414 0L12 15.414V17a1 1 0 11-2 0v-1.586l-.707-.707a1 1 0 010-1.414L7.586 12H6a1 1 0 110-2h1.586l.707-.707a1 1 0 011.414 0L12 7.586V6a1 1 0 110-2h1.586l.707-.707a1 1 0 011.414 0zM10 12a2 2 0 100-4 2 2 0 000 4z" fill-rule="evenodd" clip-rule="evenodd"></path></svg> Update Asset';
  addAssetSectionTitle.textContent = "Edit Asset"; // Change title for edit mode
  cancelEditButton.classList.remove("hidden");

  renderView("addAsset"); // Navigate to the addAssetSection
  window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top to see the form
}

async function handleAssetFormSubmit(e) {
  e.preventDefault();
  const token = getAuthToken();
  if (!token) {
    showMessageBox("You must be logged in to manage assets.", "alert");
    renderView("auth"); // Redirect to login
    return;
  }

  const name = assetNameInput.value.trim();
  const type = assetTypeInput.value.trim();
  const value = parseFloat(assetValueInput.value);
  const acquisitionDate = acquisitionDateInput.value;
  const location = assetLocationInput.value.trim();
  const assetId = assetIdInput.value;

  if (!name || !type || isNaN(value) || !acquisitionDate || !location) {
    showMessageBox("Please fill in all asset fields correctly.", "alert");
    return;
  }

  const assetData = {
    name,
    type,
    value,
    acquisitionDate,
    location,
  };

  try {
    let response;
    if (assetId) {
      response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assetData),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(assetData),
      });
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        removeAuthToken();
        renderView("auth");
        showMessageBox(
          "Your session has expired or is unauthorized. Please log in again.",
          "alert"
        );
        return;
      }
      const errorData = await response.json();
      throw new Error(
        `HTTP error! Status: ${response.status}, Message: ${
          errorData.message || response.statusText
        }`
      );
    }

    showMessageBox(
      `Asset ${assetId ? "updated" : "added"} successfully!`,
      "alert"
    );
    clearForm();
    renderView("viewAssets"); // After add/edit, go to view assets to see the change
  } catch (error) {
    console.error("Error saving asset:", error);
    showMessageBox(`Error saving asset: ${error.message}`, "alert");
  }
}

async function deleteAsset(assetId, assetName) {
  const token = getAuthToken();
  if (!token) {
    showMessageBox("You must be logged in to delete assets.", "alert");
    renderView("auth");
    return;
  }

  const confirmed = await showMessageBox(
    `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
    "confirm"
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        removeAuthToken();
        renderView("auth");
        showMessageBox(
          "Your session has expired. Please log in again.",
          "alert"
        );
        return;
      }
      const errorData = await response.json();
      throw new Error(
        `HTTP error! Status: ${response.status}, Message: ${
          errorData.message || response.statusText
        }`
      );
    }
    showMessageBox("Asset deleted successfully!", "alert");
    fetchAssets(); // Refresh assets after deletion
  } catch (error) {
    console.error("Error deleting asset:", error);
    showMessageBox(`Error deleting asset: ${error.message}`, "alert");
  }
}

/**
 * Helper function to format ISO date strings into a readable format.
 * @param {string} isoDateString The date string from the database (e.g., '2025-05-31T17:00:00.000Z').
 * @returns {string} Formatted date (e.g., 'May 31, 2025').
 */
function formatDisplayDate(isoDateString) {
  if (!isoDateString) return "N/A";
  try {
    const date = new Date(isoDateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (e) {
    console.error("Error formatting date:", e, isoDateString);
    return isoDateString.split("T")[0];
  }
}

/**
 * Helper function to format numbers as Indonesian Rupiah.
 * @param {any} value The numerical value to format (can be string or number).
 * @returns {string} Formatted currency string (e.g., "Rp 12.000,00").
 */
function formatCurrencyIDR(value) {
  const numericValue = parseFloat(value);
  if (typeof numericValue !== "number" || isNaN(numericValue)) {
    console.warn(
      "Invalid value passed to formatCurrencyIDR:",
      value,
      "Type:",
      typeof value
    );
    return "Rp 0,00";
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Renders assets in the Card View.
 * @param {Array<object>} assets Array of asset objects.
 */
function renderAssetsCardView(assets) {
  cardViewContainer.innerHTML = "";
  tableViewContainer.classList.add("hidden"); // Hide table view
  cardViewContainer.classList.remove("hidden"); // Show card view

  if (assets.length === 0) {
    // This case is handled by fetchAssets now, so this won't be hit if assets are truly empty after fetch
    return;
  }

  assets.forEach((asset) => {
    const formattedAcquisitionDate = formatDisplayDate(asset.acquisition_date);
    const formattedAssetValue = formatCurrencyIDR(asset.value);

    const assetCard = document.createElement("div");
    assetCard.className =
      "bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1";
    assetCard.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800 mb-2">${asset.name}</h3>
            <p class="text-gray-600 mb-1 text-sm"><strong class="text-gray-700">Type:</strong> ${asset.type}</p>
            <p class="text-gray-600 mb-1 text-sm"><strong class="text-gray-700">Value:</strong> <span class="text-green-600 font-semibold">${formattedAssetValue}</span></p>
            <p class="text-gray-600 mb-1 text-sm"><strong class="text-gray-700">Acquired:</strong> ${formattedAcquisitionDate}</p>
            <p class="text-gray-600 mb-4 text-sm"><strong class="text-gray-700">Location:</strong> ${asset.location}</p>
            <div class="flex flex-col sm:flex-row gap-3 mt-4">
                <button class="edit-btn flex items-center justify-center gap-1 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 transition duration-200 ease-in-out flex-grow" data-id="${asset.id}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828L15.414 12H17a1 1 0 110 2h-1.586l-.707.707a1 1 0 01-1.414 0L12 15.414V17a1 1 0 11-2 0v-1.586l-.707-.707a1 1 0 010-1.414L7.586 12H6a1 1 0 110-2h1.586l.707-.707a1 1 0 011.414 0L12 7.586V6a1 1 0 110-2h1.586l.707-.707a1 1 0 011.414 0zM10 12a2 2 0 100-4 2 2 0 000 4z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
                    Edit
                </button>
                <button class="delete-btn flex items-center justify-center gap-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 transition duration-200 ease-in-out flex-grow" data-id="${asset.id}" data-name="${asset.name}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm.002 6.757l.006-.006c.307-.307.76-.395 1.157-.225.437.197.807.49 1.137.795.328.303.626.549.882.686l.001.001c.078.04.159.07.242.09.083.02.169.027.253.027.085 0 .17-.007.253-.027.083-.02.164-.05.242-.09l.001-.001c.256-.137.554-.383.882-.686.33-.305.701-.598 1.137-.795.397-.17.85-.082 1.157.225l.006.006A.999.999 0 0116 15V8a1 1 0 00-1-1h-4a1 1 0 000 2h3v6h-3a1 1 0 000 2h3a1 1 0 001-1v-4a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                    Delete
                </button>
            </div>
        `;
    cardViewContainer.appendChild(assetCard);
  });
  addAssetCardEventListeners();
}

/**
 * Renders assets in the Table View.
 * @param {Array<object>} assets Array of asset objects.
 */
function renderAssetsTableView(assets) {
  assetTableBody.innerHTML = ""; // Clear existing table rows
  cardViewContainer.classList.add("hidden"); // Hide card view
  tableViewContainer.classList.remove("hidden"); // Show table view

  if (assets.length === 0) {
    // This case is handled by fetchAssets now
    return;
  }

  assets.forEach((asset) => {
    const formattedAcquisitionDate = formatDisplayDate(asset.acquisition_date);
    const formattedAssetValue = formatCurrencyIDR(asset.value);

    const tableRow = document.createElement("tr");
    tableRow.className = "border-b border-gray-100 last:border-b-0";
    tableRow.innerHTML = `
            <td>${asset.name}</td>
            <td>${asset.type}</td>
            <td class="font-semibold text-green-600">${formattedAssetValue}</td>
            <td>${formattedAcquisitionDate}</td>
            <td>${asset.location}</td>
            <td>
                <div class="flex flex-col sm:flex-row gap-2">
                    <button class="edit-btn px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition duration-200" data-id="${asset.id}">
                        <svg class="w-4 h-4 inline-block -mt-0.5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828L15.414 12H17a1 1 0 110 2h-1.586l-.707.707a1 1 0 01-1.414 0L12 15.414V17a1 1 0 11-2 0v-1.586l-.707-.707a1 1 0 010-1.414L7.586 12H6a1 1 0 110-2h1.586l.707-.707a1 1 0 011.414 0L12 7.586V6a1 1 0 110-2h1.586l.707-.707a1 1 0 011.414 0zM10 12a2 2 0 100-4 2 2 0 000 4z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
                        Edit
                    </button>
                    <button class="delete-btn px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition duration-200" data-id="${asset.id}" data-name="${asset.name}">
                        <svg class="w-4 h-4 inline-block -mt-0.5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm.002 6.757l.006-.006c.307-.307.76-.395 1.157-.225.437.197.807.49 1.137.795.328.303.626.549.882.686l.001.001c.078.04.159.07.242.09.083.02.169.027.253.027.085 0 .17-.007.253-.027.083-.02.164-.05.242-.09l.001-.001c.256-.137.554-.383.882-.686.33-.305.701-.598 1.137-.795.397-.17.85-.082 1.157.225l.006.006A.999.999 0 0116 15V8a1 1 0 00-1-1h-4a1 1 0 000 2h3v6h-3a1 1 0 000 2h3a1 1 0 001-1v-4a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                        Delete
                    </button>
                </div>
            </td>
        `;
    assetTableBody.appendChild(tableRow);
  });
  addAssetTableEventListeners();
}

/**
 * Attaches event listeners for edit/delete buttons in card view.
 */
function addAssetCardEventListeners() {
  document
    .querySelectorAll("#cardViewContainer .edit-btn")
    .forEach((button) => {
      button.addEventListener("click", handleEditButtonClick);
    });
  document
    .querySelectorAll("#cardViewContainer .delete-btn")
    .forEach((button) => {
      button.addEventListener("click", handleDeleteButtonClick);
    });
}

/**
 * Attaches event listeners for edit/delete buttons in table view.
 */
function addAssetTableEventListeners() {
  document
    .querySelectorAll("#tableViewContainer .edit-btn")
    .forEach((button) => {
      button.addEventListener("click", handleEditButtonClick);
    });
  document
    .querySelectorAll("#tableViewContainer .delete-btn")
    .forEach((button) => {
      button.addEventListener("click", handleDeleteButtonClick);
    });
}

// Unified handlers for edit/delete actions, regardless of view
async function handleEditButtonClick(e) {
  const id = parseInt(e.currentTarget.dataset.id);
  const token = getAuthToken();
  if (!token) {
    showMessageBox("You must be logged in to edit assets.", "alert");
    renderView("auth");
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        removeAuthToken();
        renderView("auth");
        showMessageBox(
          "Your session has expired. Please log in again.",
          "alert"
        );
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const assetToEdit = await response.json();
    populateFormForEdit(assetToEdit);
  } catch (error) {
    console.error("Error fetching asset for edit:", error);
    showMessageBox(
      `Failed to load asset for editing: ${error.message}`,
      "alert"
    );
  }
}

function handleDeleteButtonClick(e) {
  const id = parseInt(e.currentTarget.dataset.id);
  const name = e.currentTarget.dataset.name;
  deleteAsset(id, name);
}

// --- Event Listeners ---
loginForm.addEventListener("submit", handleLogin);
signupForm.addEventListener("submit", handleSignup);
toggleAuthModeButton.addEventListener("click", (e) => {
  e.preventDefault();
  toggleAuthForms();
});

// Logout buttons
dashboardLogoutButton.addEventListener("click", handleLogout);
viewAssetsLogoutButton.addEventListener("click", handleLogout);
addAssetLogoutButton.addEventListener("click", handleLogout);

// Navigation buttons from Home Dashboard
goToViewAssetsBtn.addEventListener("click", () => renderView("viewAssets"));
goToAddAssetBtn.addEventListener("click", () => renderView("addAsset"));

// Navigation buttons from View Assets
viewAssetsBackToDashboardBtn.addEventListener("click", () =>
  renderView("homeDashboard")
);
cardViewBtn.addEventListener("click", () => {
  currentViewMode = "card";
  renderAssetsCardView(currentAssetsData); // Re-render from already fetched data
  activateViewButton(cardViewBtn);
});
tableViewBtn.addEventListener("click", () => {
  currentViewMode = "table";
  renderAssetsTableView(currentAssetsData); // Re-render from already fetched data
  activateViewButton(tableViewBtn);
});

// Navigation buttons from Add New Asset
addAssetBackToDashboardBtn.addEventListener("click", () =>
  renderView("homeDashboard")
);
addAssetGoToViewAssetsBtn.addEventListener("click", () =>
  renderView("viewAssets")
);

// Asset Form and actions
assetForm.addEventListener("submit", handleAssetFormSubmit);
cancelEditButton.addEventListener("click", clearForm);

// Initial check for authentication status on page load
document.addEventListener("DOMContentLoaded", updateUIForAuthStatus);
