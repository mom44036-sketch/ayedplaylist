/**
 * player.js
 * -----------------------------------------------------------------------
 * Everything about controlling the <video> element: play/pause, seeking,
 * volume, speed, fullscreen/PiP, and tracking watched percentage.
 *
 * IMPORTANT: video progress fires many times per second while playing.
 * We must NOT re-render the whole page on every tick (that would restart
 * the video). So this file updates only the small DOM nodes that show
 * live progress (seek bar, time label, percentage badges) directly,
 * and only triggers a full render() when something structural changes
 * (e.g. the lesson becomes "completed").
 * -----------------------------------------------------------------------
 */

function getVideoEl() {
  return document.getElementById("video-el");
}

// Called right after a fresh <video> element is inserted into the DOM
// (media events like timeupdate/play/pause do not bubble, so they must be
// attached directly to the element rather than handled via delegation).
function wireVideoElement() {
  const video = getVideoEl();
  if (!video) return;

  video.volume = App.ui.player.muted ? 0 : App.ui.player.volume;
  video.muted = App.ui.player.muted;
  video.playbackRate = App.ui.player.speed;

  video.addEventListener("timeupdate", onVideoTimeUpdate);
  video.addEventListener("loadedmetadata", onVideoTimeUpdate);
  video.addEventListener("play", () => {
    App.ui.player.playing = true;
    updatePlayPauseIcon();
  });
  video.addEventListener("pause", () => {
    App.ui.player.playing = false;
    updatePlayPauseIcon();
  });
  video.addEventListener("click", togglePlay);
}

function onVideoTimeUpdate() {
  const video = getVideoEl();
  if (!video) return;

  const current = video.currentTime;
  const duration = video.duration || 1;
  const percent = (current / duration) * 100;

  App.ui.player.current = current;
  App.ui.player.duration = duration;

  const activeId = App.ui.activeId;
  const entry = findFlatByItemId(activeId);

  if (entry.item.type === "video") {
    const prevMax = App.state.videoProgress[activeId] || 0;
    const newMax = Math.max(prevMax, percent);
    if (newMax !== prevMax) {
      App.state.videoProgress = { ...App.state.videoProgress, [activeId]: newMax };
      saveState();
    }

    if (percent >= 95 && !App.state.completedIds.includes(activeId)) {
      markComplete(activeId);
      maybeAutoAdvanceAfterCompletion();
      renderAll(); // structural change: lesson just got marked complete
      return;
    }
  }

  updateLiveVideoProgressUI();
}

// Cheap DOM patch for the fields that change on every timeupdate tick.
function updateLiveVideoProgressUI() {
  const video = getVideoEl();
  if (!video) return;

  const current = App.ui.player.current;
  const duration = App.ui.player.duration;
  const percent = duration ? (current / duration) * 100 : 0;
  const watchedRaw = currentVideoWatchedPercent();
  const watched = Math.round(watchedRaw);

  const seekRange = document.getElementById("seek-range");
  if (seekRange && document.activeElement !== seekRange) seekRange.value = percent;

  const timeLabel = document.getElementById("time-label");
  if (timeLabel) {
    timeLabel.textContent =
      `${Math.floor(current / 60)}:${String(Math.floor(current % 60)).padStart(2, "0")} / ` +
      `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`;
  }

  const watchedControls = document.getElementById("watched-percent-controls");
  if (watchedControls) watchedControls.textContent = `شاهدت ${watched}% من هذا الفيديو`;

  const watchedAlertNum = document.getElementById("watched-percent-alert-num");
  if (watchedAlertNum) watchedAlertNum.textContent = `${watched}%`;

  const alertFill = document.getElementById("alert-progress-fill");
  if (alertFill) alertFill.style.width = `${watched}%`;

  const sidebarBadge = document.getElementById("sidebar-current-percent");
  if (sidebarBadge) sidebarBadge.textContent = `${watched}%`;

  const nextBtn = document.getElementById("btn-continue");
  if (nextBtn) {
    const entry = findFlatByItemId(App.ui.activeId);
    const shouldDisable =
      entry.item.type === "video" && watchedRaw < 80 && !App.state.completedIds.includes(App.ui.activeId);
    nextBtn.disabled = shouldDisable;
  }
}

function onSeek(e) {
  const video = getVideoEl();
  const percent = parseFloat(e.target.value);
  if (video) video.currentTime = (percent / 100) * (video.duration || 0);
}

function togglePlay() {
  const video = getVideoEl();
  if (!video) return;
  if (video.paused) {
    video.play();
    App.ui.player.playing = true;
  } else {
    video.pause();
    App.ui.player.playing = false;
  }
  updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
  const icon = document.getElementById("play-pause-icon");
  if (icon) icon.className = `bi ${App.ui.player.playing ? "bi-pause-fill" : "bi-play-fill"} fs-18`;
}

// NOTE: the volume/speed popovers are toggled by directly showing/hiding
// the elements already present in the DOM (see render.js), rather than
// going through a full renderMainContent(). A full re-render would replace
// the <video> node and restart playback — these menus must not do that.

function toggleMute() {
  const video = getVideoEl();
  App.ui.player.muted = !App.ui.player.muted;
  App.ui.player.showVolume = !App.ui.player.showVolume;
  if (video) video.muted = App.ui.player.muted;

  const icon = document.getElementById("volume-icon");
  if (icon) icon.className = `bi ${App.ui.player.muted || App.ui.player.volume === 0 ? "bi-volume-mute" : "bi-volume-up"}`;

  const slider = document.getElementById("volume-slider-el");
  if (slider) {
    slider.classList.toggle("d-none", !App.ui.player.showVolume);
    slider.value = App.ui.player.muted ? 0 : App.ui.player.volume;
  }
}

function onVolumeChange(e) {
  const video = getVideoEl();
  const value = parseFloat(e.target.value);
  App.ui.player.volume = value;
  App.ui.player.muted = value === 0;
  if (video) video.volume = value;
  const icon = document.getElementById("volume-icon");
  if (icon) icon.className = `bi ${App.ui.player.muted || value === 0 ? "bi-volume-mute" : "bi-volume-up"}`;
}

function toggleSpeedMenu() {
  App.ui.player.showSpeed = !App.ui.player.showSpeed;
  const menu = document.getElementById("speed-menu-el");
  if (menu) menu.classList.toggle("d-none", !App.ui.player.showSpeed);
}

function setSpeed(speed) {
  const video = getVideoEl();
  if (video) video.playbackRate = speed;
  App.ui.player.speed = speed;
  App.ui.player.showSpeed = false;

  const menu = document.getElementById("speed-menu-el");
  if (menu) {
    menu.classList.add("d-none");
    menu.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", parseFloat(btn.dataset.speed) === speed);
    });
  }
  const label = document.getElementById("speed-label");
  if (label) label.textContent = `${speed}x`;
}

function requestPip() {
  const video = getVideoEl();
  if (document.pictureInPictureEnabled && video && video.requestPictureInPicture) {
    video.requestPictureInPicture();
  }
}

function toggleFullscreen() {
  const video = getVideoEl();
  if (!video) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    video.requestFullscreen();
  }
}
