/**
 * app.js
 * -----------------------------------------------------------------------
 * Startup + event wiring. Because the page is re-rendered by replacing
 * innerHTML, we use event delegation (one listener on `document`) instead
 * of attaching a listener per element — that way newly-rendered elements
 * automatically work without re-binding anything.
 * -----------------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", init);

function init() {
  App.state = loadState();
  App.flatList = buildFlatList();
  App.ui.activeId = App.state.lastActiveId || (App.flatList[0] && App.flatList[0].item.id) || "v1";

  // Persist the active lesson id, same as the original's effect on `r`.
  App.state.lastActiveId = App.ui.activeId;
  saveState();

  renderAll();
  wireGlobalEvents();
}

function wireGlobalEvents() {
  document.addEventListener("click", handleDelegatedClick);
  document.addEventListener("input", handleDelegatedInput);

  // Close open speed/volume popovers when clicking outside the player.
  document.addEventListener("click", (e) => {
    if (!e.target.closest('[data-action="toggle-speed-menu"]') && !e.target.closest("#speed-menu-el")) {
      if (App.ui.player.showSpeed) {
        App.ui.player.showSpeed = false;
        const menu = document.getElementById("speed-menu-el");
        if (menu) menu.classList.add("d-none");
      }
    }
  });
}

function handleDelegatedClick(e) {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case "toggle-focus":
      App.ui.focusMode = !App.ui.focusMode;
      renderAll();
      break;

    case "open-mobile-drawer":
      App.ui.mobileDrawerOpen = true;
      renderAll();
      break;

    case "close-mobile-drawer":
      App.ui.mobileDrawerOpen = false;
      renderAll();
      break;

    case "toggle-section": {
      const sectionId = target.dataset.sectionId;
      App.ui.openSections = { ...App.ui.openSections, [sectionId]: !App.ui.openSections[sectionId] };
      renderAll();
      break;
    }

    case "select-item": {
      const index = parseInt(target.closest("[data-index]").dataset.index, 10);
      selectItemByIndex(index);
      break;
    }

    case "toggle-check": {
      e.stopPropagation();
      const itemId = target.dataset.itemId;
      const globalIndex = findFlatByItemId(itemId).globalIndex;
      const unlocked = isItemUnlocked(globalIndex);
      const isDone = App.state.completedIds.includes(itemId);
      if (!unlocked && !isDone) {
        showToast("يجب إكمال المجموعة السابقة أولا لفتح هذا الدرس", "warning");
        App.ui.shakeId = itemId;
        renderAll();
        setTimeout(() => {
          App.ui.shakeId = null;
          renderAll();
        }, 450);
        break;
      }
      toggleComplete(itemId);
      renderAll();
      break;
    }

    case "request-help":
      showToast("تم إرسال طلب المساعدة، سيتواصل معك فريق الدعم قريبا", "success");
      break;

    case "toggle-play":
      togglePlay();
      break;

    case "toggle-mute":
      toggleMute();
      break;

    case "toggle-speed-menu":
      toggleSpeedMenu();
      break;

    case "set-speed":
      setSpeed(parseFloat(target.dataset.speed));
      break;

    case "request-pip":
      requestPip();
      break;

    case "toggle-fullscreen":
      toggleFullscreen();
      break;

    case "download":
      markDownloaded();
      refreshDownloadButtonUI();
      renderSidebar();
      break;

    case "go-prev":
      goPrev();
      break;

    case "go-next":
      goNext();
      break;

    case "start-quiz": {
      const itemId = target.dataset.itemId;
      window.open(`https://example.com/quiz/${itemId}`, "_blank");
      markComplete(itemId);
      showToast("تم فتح الاختبار في تبويب جديد واعتباره مكتمل للتجربة", "success");
      renderAll();
      break;
    }
  }
}

function handleDelegatedInput(e) {
  const target = e.target;

  if (target.id === "search-input") {
    App.ui.searchQuery = target.value;
    withFocusPreserved(renderSidebar);
    return;
  }

  if (target.id === "notes-textarea") {
    saveNote(App.ui.activeId, target.value);
    return;
  }

  if (target.id === "seek-range") {
    onSeek(e);
    return;
  }

  if (target.id === "volume-slider-el") {
    onVolumeChange(e);
    return;
  }
}
