/**
 * state.js
 * -----------------------------------------------------------------------
 * Everything related to "what is the current state of the learner" lives
 * here: loading/saving progress to localStorage, and every derived
 * calculation (is a section complete? is a lesson unlocked? what % has
 * the learner finished?).
 *
 * Nothing in this file touches the DOM — it only reads/writes state and
 * returns plain values. Rendering code (render.js) is the only place that
 * turns this into HTML.
 * -----------------------------------------------------------------------
 */

const App = {
  /** Persisted learner progress (saved to localStorage on every change). */
  state: null,

  /** Transient UI state (not persisted). */
  ui: {
    activeId: null, // currently open lesson/file/quiz id
    searchQuery: "",
    openSections: { s1: true, s2: false, s3: false, s4: false },
    mobileDrawerOpen: false,
    focusMode: false,
    toasts: [], // {id, msg, type}
    shakeId: null, // item id currently showing the "locked" shake animation
    transitioning: false, // brief loading-skeleton state when switching lessons
    player: {
      playing: false,
      current: 0,
      duration: 0,
      volume: 1,
      muted: false,
      speed: 1,
      showSpeed: false,
      showVolume: false,
    },
  },

  /** Flat, ordered list of every item across all sections, pre-computed once. */
  flatList: [],
};

/* ---------------------------------------------------------------------
 * Persistence
 * ------------------------------------------------------------------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    /* ignore corrupted storage */
  }
  return {
    completedIds: ["v1"],
    videoProgress: {},
    lastActiveId: "v1",
    downloadedIds: [],
    notes: {},
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(App.state));
  } catch (err) {
    /* storage full / unavailable — fail silently, same as the original */
  }
}

/* ---------------------------------------------------------------------
 * Flat list helpers
 * ------------------------------------------------------------------- */

function buildFlatList() {
  const flat = [];
  let globalIndex = 0;
  COURSE_SECTIONS.forEach((section, sectionIndex) => {
    section.items.forEach((item) => {
      flat.push({
        item,
        sectionId: section.id,
        sectionTitle: section.title,
        sectionIndex,
        globalIndex: globalIndex++,
      });
    });
  });
  return flat;
}

function findFlatByItemId(id) {
  return App.flatList.find((entry) => entry.item.id === id) || App.flatList[0];
}

/* ---------------------------------------------------------------------
 * Lock / progress logic
 * ------------------------------------------------------------------- */

// Is every item in the given section marked complete?
function isSectionComplete(sectionIndex) {
  const section = COURSE_SECTIONS[sectionIndex];
  if (!section) return false;
  return section.items.every((it) => App.state.completedIds.includes(it.id));
}

// Are all sections *before* the given section index fully complete?
function areAllPriorSectionsComplete(sectionIndex) {
  if (sectionIndex === 0) return true;
  for (let i = 0; i < sectionIndex; i++) {
    if (!isSectionComplete(i)) return false;
  }
  return true;
}

// Is the item at this global index unlocked?
function isItemUnlocked(globalIndex) {
  if (globalIndex === 0) return true;
  const prev = App.flatList[globalIndex - 1];
  if (!App.state.completedIds.includes(prev.item.id)) return false;
  const sectionIndex = App.flatList[globalIndex].sectionIndex;
  return areAllPriorSectionsComplete(sectionIndex);
}

function overallProgressPercent() {
  return Math.round((App.state.completedIds.length / App.flatList.length) * 100);
}

function sectionProgressPercent(section) {
  const done = section.items.filter((it) => App.state.completedIds.includes(it.id)).length;
  return Math.round((done / section.items.length) * 100);
}

function currentVideoWatchedPercent() {
  return App.state.videoProgress[App.ui.activeId] || 0;
}

/* ---------------------------------------------------------------------
 * Mutations
 * ------------------------------------------------------------------- */

function markComplete(id) {
  if (App.state.completedIds.includes(id)) return;
  App.state.completedIds = [...App.state.completedIds, id];
  saveState();
}

// Toggle a lesson's completed state; mirrors the original's "check circle" click.
function toggleComplete(id) {
  const wasComplete = App.state.completedIds.includes(id);

  if (wasComplete) {
    App.state.completedIds = App.state.completedIds.filter((x) => x !== id);
  } else {
    App.state.completedIds = [...App.state.completedIds, id];
  }
  saveState();

  if (!wasComplete) {
    const currentEntry = findFlatByItemId(id);
    const nextEntry = App.flatList[currentEntry.globalIndex + 1];

    if (nextEntry) {
      showToast("تم تحديد الدرس كمكتمل وفتح الدرس التالي", "success");
      setTimeout(() => {
        const completedSoFar = App.state.completedIds;
        const nextSectionIndex = nextEntry.sectionIndex;
        let allPriorDone = true;
        if (nextSectionIndex > 0) {
          for (let s = 0; s < nextSectionIndex; s++) {
            if (!COURSE_SECTIONS[s].items.every((it) => completedSoFar.includes(it.id))) {
              allPriorDone = false;
              break;
            }
          }
        }
        if (allPriorDone) switchToItem(nextEntry.item.id);
      }, 150);
    } else {
      showToast(`تم إكمال: ${currentEntry.item.title}`, "success");
    }
  }
}

function markDownloaded() {
  const id = App.ui.activeId;
  if (!App.state.downloadedIds.includes(id)) {
    App.state.downloadedIds = [...App.state.downloadedIds, id];
    saveState();
  }
  showToast("تم الحفظ في مكتبتك ويمكنك المشاهدة بدون إنترنت", "success");
  const entry = findFlatByItemId(id);
  if (entry.item.type === "file") markComplete(id);
}

function saveNote(id, text) {
  App.state.notes = { ...App.state.notes, [id]: text };
  saveState();
}

/* ---------------------------------------------------------------------
 * Navigation
 * ------------------------------------------------------------------- */

// Central place to move to a different lesson/file/quiz: resets the
// player, briefly shows a loading skeleton (same 380ms as the original),
// then renders the new content.
function switchToItem(id) {
  App.ui.activeId = id;
  App.ui.mobileDrawerOpen = false;
  App.ui.transitioning = true;
  resetPlayerUI();
  renderAll();

  setTimeout(() => {
    App.ui.transitioning = false;
    renderMainContent();
  }, 380);
}

// Click on a sidebar lesson row.
function selectItemByIndex(globalIndex) {
  const entry = App.flatList[globalIndex];
  if (!entry) return;

  if (!isItemUnlocked(globalIndex)) {
    showToast("يجب إكمال المجموعة السابقة أولا لفتح هذا الدرس", "warning");
    App.ui.shakeId = entry.item.id;
    renderAll();
    setTimeout(() => {
      App.ui.shakeId = null;
      renderAll();
    }, 450);
    return;
  }

  switchToItem(entry.item.id);
}

function goNext() {
  const currentIndex = App.flatList.findIndex((e) => e.item.id === App.ui.activeId);
  if (currentIndex >= App.flatList.length - 1) return;

  const next = App.flatList[currentIndex + 1];
  const currentId = App.ui.activeId;
  const currentItem = App.flatList[currentIndex].item;

  if (App.state.completedIds.includes(currentId) || isItemUnlocked(currentIndex + 1)) {
    switchToItem(next.item.id);
    return;
  }

  if (currentItem.type === "video") {
    if ((App.state.videoProgress[currentId] || 0) < 80) {
      showToast("يجب مشاهدة 80% أو تحديد الدرس كمكتمل للانتقال", "warning");
      return;
    }
  }

  markComplete(currentId);
  setTimeout(() => switchToItem(next.item.id), 200);
}

function goPrev() {
  const currentIndex = App.flatList.findIndex((e) => e.item.id === App.ui.activeId);
  if (currentIndex > 0) switchToItem(App.flatList[currentIndex - 1].item.id);
}

function resetPlayerUI() {
  App.ui.player = {
    playing: false,
    current: 0,
    duration: 0,
    volume: App.ui.player.volume,
    muted: App.ui.player.muted,
    speed: 1,
    showSpeed: false,
    showVolume: false,
  };
}

// Auto-advance to the next lesson a couple seconds after a video is
// completed, same as the original's completedIds side-effect.
function maybeAutoAdvanceAfterCompletion() {
  const entry = findFlatByItemId(App.ui.activeId);
  if (entry.item.type !== "video" || !App.state.completedIds.includes(App.ui.activeId)) return;

  const currentIndex = entry.globalIndex;
  if (currentIndex >= App.flatList.length - 1) return;
  if (!isItemUnlocked(currentIndex + 1)) return;

  const next = App.flatList[currentIndex + 1];
  if (App.state.completedIds.includes(next.item.id)) return;

  setTimeout(() => {
    if (App.state.completedIds.includes(next.item.id)) return;
    showToast(`ممتاز! ننتقل للدرس التالي: ${next.item.title}`, "success");
    switchToItem(next.item.id);
  }, 2000);
}

/* ---------------------------------------------------------------------
 * Search
 * ------------------------------------------------------------------- */

function getFilteredSections() {
  const query = App.ui.searchQuery.trim().toLowerCase();
  if (!query) return COURSE_SECTIONS;
  return COURSE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((it) => it.title.toLowerCase().includes(query)),
  })).filter((section) => section.items.length > 0);
}

/* ---------------------------------------------------------------------
 * Toasts
 * ------------------------------------------------------------------- */

function showToast(msg, type = "info") {
  const id = Date.now() + Math.random();
  App.ui.toasts = [...App.ui.toasts, { id, msg, type }];
  renderToasts();
  setTimeout(() => {
    App.ui.toasts = App.ui.toasts.filter((t) => t.id !== id);
    renderToasts();
  }, 3800);
}
