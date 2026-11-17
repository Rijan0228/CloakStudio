
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


// IMAGE STUDIO — browser-local editing and export
import { loadImageFile, drawImage, exportCanvas } from "./engines/image-engine.js";

const imageInput = document.getElementById("imageFileInput");
const imageCanvas = document.getElementById("imageCanvas");
const imageStatus = document.getElementById("imageStatus");
const imageDimensions = document.getElementById("imageDimensions");
const imageEmpty = document.getElementById("canvasEmpty");
const imageExportButton = document.getElementById("exportImage");
const imageResetButton = document.getElementById("imageReset");

let activeImage = null;
let imageRotation = 0;
let imageFlipX = false;
let imageFlipY = false;
let imageObjectUrl = null;

const imageDefaults = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: false
};

function currentImageSettings() {
  return {
    brightness: Number(document.getElementById("brightness").value),
    contrast: Number(document.getElementById("contrast").value),
    saturation: Number(document.getElementById("saturation").value),
    grayscale: document.getElementById("grayscale").checked,
    rotation: imageRotation,
    flipX: imageFlipX,
    flipY: imageFlipY
  };
}

function renderImagePreview() {
  if (!activeImage) return;
  try {
    const dimensions = drawImage(imageCanvas, activeImage.image, currentImageSettings());
    imageDimensions.textContent = `${dimensions.width.toLocaleString()} × ${dimensions.height.toLocaleString()} px`;
    imageStatus.textContent = "Preview updated locally.";
  } catch (error) {
    imageStatus.textContent = error.message;
  }
}

async function openImageInStudio(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image file.");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showToast("This image is larger than the 500 MB session limit.");
    return;
  }

  imageStatus.textContent = "Reading image locally…";
  try {
    const loaded = await loadImageFile(file);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    imageObjectUrl = loaded.url;
    activeImage = { ...loaded, name: file.name };
    imageRotation = 0;
    imageFlipX = false;
    imageFlipY = false;
    resetImageControls(false);
    imageEmpty.classList.add("hidden");
    imageCanvas.classList.remove("hidden");
    imageExportButton.disabled = false;
    imageResetButton.disabled = false;
    renderImagePreview();
    imageStatus.textContent = `Loaded: ${file.name}`;
  } catch (error) {
    imageStatus.textContent = error.message || "Could not open this image.";
    showToast(imageStatus.textContent);
  }
}

function resetImageControls(redraw = true) {
  Object.entries(imageDefaults).forEach(([key, value]) => {
    const control = document.getElementById(key);
    if (control.type === "checkbox") control.checked = value;
    else control.value = value;
  });
  ["brightness", "contrast", "saturation"].forEach(id => {
    document.getElementById(id + "Value").textContent = "100%";
  });
  imageRotation = 0;
  imageFlipX = false;
  imageFlipY = false;
  if (redraw && activeImage) renderImagePreview();
}

if (imageInput) {
  imageInput.addEventListener("change", event => {
    openImageInStudio(event.target.files?.[0]);
    event.target.value = "";
  });

  ["brightness", "contrast", "saturation"].forEach(id => {
    const control = document.getElementById(id);
    control.addEventListener("input", () => {
      document.getElementById(id + "Value").textContent = control.value + "%";
      renderImagePreview();
    });
  });

  document.getElementById("grayscale").addEventListener("change", renderImagePreview);
  document.getElementById("rotateLeft").addEventListener("click", () => {
    imageRotation = (imageRotation + 270) % 360;
    renderImagePreview();
  });
  document.getElementById("rotateRight").addEventListener("click", () => {
    imageRotation = (imageRotation + 90) % 360;
    renderImagePreview();
  });
  document.getElementById("flipX").addEventListener("click", () => {
    imageFlipX = !imageFlipX;
    renderImagePreview();
  });
  document.getElementById("flipY").addEventListener("click", () => {
    imageFlipY = !imageFlipY;
    renderImagePreview();
  });
  imageResetButton.addEventListener("click", () => {
    resetImageControls();
    showToast("Image adjustments reset.");
  });

  const formatSelect = document.getElementById("imageFormat");
  const qualityControl = document.getElementById("imageQuality");
  formatSelect.addEventListener("change", () => {
    document.getElementById("qualityWrap").classList.toggle("hidden", formatSelect.value === "image/png");
  });
  qualityControl.addEventListener("input", () => {
    document.getElementById("qualityValue").textContent = qualityControl.value + "%";
  });

  imageExportButton.addEventListener("click", async () => {
    if (!activeImage) return;
    imageExportButton.disabled = true;
    imageExportButton.textContent = "Preparing export…";
    try {
      const mime = formatSelect.value;
      const blob = await exportCanvas(imageCanvas, mime, Number(qualityControl.value) / 100);
      const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
      const baseName = activeImage.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]/gi, "_") || "cloakstudio-image";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}-edited.${extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Export created. Your original image is unchanged.");
      imageStatus.textContent = `Export ready: ${formatBytes(blob.size)}`;
    } catch (error) {
      showToast(error.message || "Image export failed.");
    } finally {
      imageExportButton.disabled = false;
      imageExportButton.textContent = "Export edited image ↓";
    }
  });
}

window.addEventListener("pagehide", () => {
  if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
});
