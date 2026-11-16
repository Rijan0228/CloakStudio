
const landing = document.getElementById("landing");
const app = document.getElementById("app");
const toast = document.getElementById("toast");

const fileInput = document.getElementById("fileInput");
const uploadZone = document.getElementById("uploadZone");
const fileList = document.getElementById("fileList");

const MAX_FILES = 20;
const MAX_FILE_SIZE = 500 * 1024 * 1024;

let sessionFiles = [];
let toastTimeout;

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp"
];

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime"
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function openStudio() {
  landing.classList.add("hidden");
  app.classList.remove("hidden");
  navigate("home");
}

function returnToLanding() {
  clearSession();
  app.classList.add("hidden");
  landing.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("heroLaunch").addEventListener("click", openStudio);
document.getElementById("navLaunch").addEventListener("click", openStudio);
document.getElementById("exitStudio").addEventListener("click", returnToLanding);

function navigate(page) {
  const target = document.getElementById(`page-${page}`);

  if (!target) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.remove("active");
  });

  target.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const title = document.getElementById("pageTitle");
  const activeButton = document.querySelector(
    `.side-link[data-page="${page}"]`
  );

  title.textContent = activeButton
    ? activeButton.querySelector("span").textContent
    : page.charAt(0).toUpperCase() + page.slice(1);

  document.querySelector(".sidebar").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.page);
  });
});

document.getElementById("menuToggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});

// FILE VALIDATION

function getMediaType(file) {
  if (allowedImageTypes.includes(file.type)) return "Image";
  if (allowedVideoTypes.includes(file.type)) return "Video";
  return null;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function addFiles(files) {
  let added = 0;

  for (const file of files) {
    if (sessionFiles.length >= MAX_FILES) {
      showToast(`Maximum ${MAX_FILES} files per session.`);
      break;
    }

    if (!getMediaType(file)) {
      showToast(`Unsupported file format: ${file.name}`);
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast(`File too large: ${file.name}`);
      continue;
    }

    const duplicate = sessionFiles.some(item =>
      item.file.name === file.name &&
      item.file.size === file.size &&
      item.file.lastModified === file.lastModified
    );

    if (duplicate) {
      showToast(`${file.name} is already in this session.`);
      continue;
    }

    sessionFiles.push({
      id: crypto.randomUUID(),
      file,
      type: getMediaType(file)
    });

    added++;
  }

  renderFiles();

  if (added > 0) {
    showToast(`${added} file${added === 1 ? "" : "s"} added to temporary session.`);
  }
}

function renderFiles() {
  if (sessionFiles.length === 0) {
    fileList.innerHTML = `
      <div class="empty-state">
        <span>▤</span>
        <strong>No files in this session</strong>
        <p>Your selected media will appear here.</p>
      </div>
    `;
    return;
  }

  fileList.replaceChildren();

  sessionFiles.forEach(item => {
    const row = document.createElement("div");
    row.className = "file-item";

    const details = document.createElement("div");
    details.className = "file-details";

    const name = document.createElement("strong");
    name.textContent = item.file.name;

    const meta = document.createElement("small");
    meta.textContent =
      `${item.type} · ${formatBytes(item.file.size)} · Temporary`;

    details.append(name, meta);

    const remove = document.createElement("button");
    remove.className = "file-remove";
    remove.textContent = "Remove";
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${item.file.name}`);

    remove.addEventListener("click", () => {
      removeFile(item.id);
    });

    row.append(details, remove);
    fileList.append(row);
  });
}

function removeFile(id) {
  sessionFiles = sessionFiles.filter(item => item.id !== id);
  renderFiles();
  showToast("File removed from temporary session.");
}

function clearSession() {
  sessionFiles = [];
  renderFiles();
  showToast("Temporary session cleared.");
}

fileInput.addEventListener("change", event => {
  addFiles(event.target.files);
  fileInput.value = "";
});

uploadZone.addEventListener("dragover", event => {
  event.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", event => {
  event.preventDefault();
  uploadZone.classList.remove("dragover");
  addFiles(event.dataTransfer.files);
});

document.getElementById("clearFiles").addEventListener("click", clearSession);
document.getElementById("settingsClear").addEventListener("click", clearSession);

// TEMPORARY SESSION LIFECYCLE

window.addEventListener("pagehide", () => {
  sessionFiles = [];
});

// Prevent accidental browser navigation while dragging files.
window.addEventListener("dragover", event => {
  if (!event.target.closest("#uploadZone")) {
    event.preventDefault();
  }
});

window.addEventListener("drop", event => {
  if (!event.target.closest("#uploadZone")) {
    event.preventDefault();
  }
});

// Start on landing page.
renderFiles();
