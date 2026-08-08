/**
 * render.js
 * -----------------------------------------------------------------------
 * Pure-ish rendering: reads App.state / App.ui and writes HTML into the
 * page. Split into one function per region of the page so each piece can
 * be re-rendered independently when only that piece needs to change.
 * -----------------------------------------------------------------------
 */

function renderAll() {
  withFocusPreserved(() => {
    renderTopProgress();
    renderHeader();
    renderSidebar();
    renderMainContent();
    renderToasts();
  });
}

// Re-runs `fn`, then restores focus + cursor position on whichever input
///textarea had focus before re-rendering (re-rendering replaces the DOM
// nodes, which would otherwise steal focus away while typing).
function withFocusPreserved(fn) {
  const active = document.activeElement;
  const isTextField = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
  const id = isTextField ? active.id : null;
  const selStart = isTextField ? active.selectionStart : null;
  const selEnd = isTextField ? active.selectionEnd : null;

  fn();

  if (id) {
    const el = document.getElementById(id);
    if (el) {
      el.focus();
      if (typeof selStart === "number" && el.setSelectionRange) {
        try {
          el.setSelectionRange(selStart, selEnd);
        } catch (err) {
          /* not all input types support selection ranges */
        }
      }
    }
  }
}

/* ---------------------------------------------------------------------
 * Top progress bar
 * ------------------------------------------------------------------- */

function renderTopProgress() {
  const el = document.getElementById("top-progress-fill");
  if (el) el.style.width = `${overallProgressPercent()}%`;
}

/* ---------------------------------------------------------------------
 * Header
 * ------------------------------------------------------------------- */

function renderHeader() {
  const container = document.getElementById("header-container");
  if (!container) return;

  const percent = overallProgressPercent();

  container.innerHTML = `
    <nav class="d-flex align-items-center gap-2 fs-13 text-secondary mb-3 flex-wrap">
      <a href="#" class="breadcrumb-link d-flex align-items-center gap-1">
        <i class="bi bi-person-circle"></i> الصفحة الشخصية
      </a>
      <i class="bi bi-chevron-left fs-10"></i>
      <a href="#" class="breadcrumb-link">دوراتي</a>
      <i class="bi bi-chevron-left fs-10"></i>
      <span class="text-primary-brand fw-bold">دورة احتراف STEP</span>
    </nav>
    <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <h1 class="fs-22 fs-lg-26 fw-bold text-primary-brand mb-0 lh-sm">
          دورة احتراف اختبار STEP - من الصفر للاحتراف
        </h1>
        <span class="badge-level">
          <i class="bi bi-bar-chart-fill me-1"></i> متقدم
        </span>
        ${
          App.ui.focusMode
            ? `<span class="badge-watching d-flex align-items-center gap-1">
                 <i class="bi bi-eye"></i> وضع التركيز
               </span>`
            : ""
        }
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="text-lg-end">
          <div class="fs-14 fw-bold text-primary-brand">
            تقدمك: ${percent}% • ${App.state.completedIds.length} من ${App.flatList.length} عنصر مكتمل
          </div>
          <div class="progress-thin mt-2" style="width:220px;">
            <div style="width:${percent}%"></div>
          </div>
        </div>
        <button class="btn-outline-custom d-none d-lg-flex align-items-center gap-2 fs-13" data-action="toggle-focus">
          <i class="bi bi-fullscreen"></i> ${App.ui.focusMode ? "إنهاء التركيز" : "وضع التركيز"}
        </button>
        <button class="btn-primary-custom d-flex d-lg-none align-items-center gap-2 fs-13" data-action="open-mobile-drawer">
          <i class="bi bi-list-ul"></i> قائمة الدورة
        </button>
      </div>
    </div>
  `;
}

/* ---------------------------------------------------------------------
 * Sidebar
 * ------------------------------------------------------------------- */

function renderSidebar() {
  const col = document.getElementById("sidebar-col");
  if (!col) return;

  if (App.ui.focusMode) {
    col.innerHTML = "";
    col.classList.remove("mobile-drawer-open");
    return;
  }

  col.classList.toggle("mobile-drawer-open", App.ui.mobileDrawerOpen);

  const panelOpenClass = App.ui.mobileDrawerOpen ? "drawer-panel" : "";
  const backdrop = App.ui.mobileDrawerOpen
    ? `<div class="drawer-backdrop d-lg-none" data-action="close-mobile-drawer"></div>`
    : "";
  const mobileHeader = App.ui.mobileDrawerOpen
    ? `<div class="d-flex align-items-center justify-content-between mb-4 d-lg-none">
         <h3 class="fw-bold text-primary-brand mb-0">قائمة الدورة</h3>
         <button class="btn btn-light rounded-circle border drawer-close-btn" data-action="close-mobile-drawer">
           <i class="bi bi-x-lg"></i>
         </button>
       </div>`
    : "";

  col.innerHTML = `
    ${backdrop}
    <div class="sidebar-panel ${panelOpenClass}">
      ${mobileHeader}
      <div class="card-pro p-3 sidebar-search">
        <div class="position-relative">
          <i class="bi bi-search position-absolute top-50 end-0 translate-middle-y me-3 text-secondary"></i>
          <input
            id="search-input"
            type="text"
            class="form-control rounded-3"
            placeholder="ابحث في محتوى الدورة..."
            value="${escapeAttr(App.ui.searchQuery)}"
          />
        </div>
      </div>

      <div class="d-flex flex-column gap-3">
        ${getFilteredSections().map(renderSectionCard).join("")}
      </div>

      ${renderHelpCard()}
    </div>
  `;
}

function renderSectionCard(section) {
  const sectionIndex = COURSE_SECTIONS.findIndex((s) => s.id === section.id);
  const unlocked = areAllPriorSectionsComplete(sectionIndex);
  const percent = sectionProgressPercent(section);
  const isOpen = App.ui.openSections[section.id];

  const totalCount = section.items.length;
  const videoCount = section.items.filter((it) => it.type === "video").length;
  const fileCount = section.items.filter((it) => it.type === "file").length;
  const quizCount = section.items.filter((it) => it.type === "quiz").length;

  const iconOrProgress = !unlocked
    ? `<span class="d-flex align-items-center justify-content-center rounded-circle bg-secondary-subtle text-secondary" style="width:32px;height:32px;">
         <i class="bi bi-lock-fill fs-14"></i>
       </span>`
    : progressRingSVG(percent, 36, percent === 100 ? "#16a34a" : "#01335b");

  return `
    <div class="card-pro overflow-hidden ${!unlocked ? "bg-page" : ""}">
      <button class="section-toggle-btn d-flex align-items-center justify-content-between p-3" data-action="toggle-section" data-section-id="${section.id}">
        <div class="d-flex align-items-center gap-3 flex-1 text-start">
          ${iconOrProgress}
          <div class="flex-fill">
            <div class="fw-bold fs-14 text-primary-brand lh-sm d-flex align-items-center gap-2 flex-wrap">
              ${section.title}
              ${
                !unlocked
                  ? `<span class="lock-pill"><i class="bi bi-lock-fill fs-10"></i> مقفل</span>`
                  : ""
              }
            </div>
            <div class="fs-11 text-secondary mt-1">
              ${videoCount} فيديو • ${fileCount} ملف • ${quizCount} اختبار • ${totalCount} عنصر
            </div>
          </div>
        </div>
        <i class="bi bi-chevron-down text-secondary ${isOpen ? "rotate-180" : ""}" style="transition:transform .2s;${isOpen ? "transform:rotate(180deg);" : ""}"></i>
      </button>
      ${isOpen ? `<div class="px-2 pb-3 d-flex flex-column gap-2">${section.items.map(renderLessonRow).join("")}</div>` : ""}
    </div>
  `;
}

function renderLessonRow(item) {
  const flatEntry = App.flatList.find((e) => e.item.id === item.id);
  const globalIndex = flatEntry.globalIndex;
  const isDone = App.state.completedIds.includes(item.id);
  const isCurrent = App.ui.activeId === item.id;
  const unlocked = isItemUnlocked(globalIndex);
  const watchedPct = App.state.videoProgress[item.id] || 0;
  const isShaking = App.ui.shakeId === item.id;

  const rowClasses = [
    "lesson-row",
    isDone ? "item-completed" : "bg-white",
    isCurrent ? "item-current" : "",
    !unlocked ? "item-locked" : "",
    isShaking ? "shake" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const iconClass = !unlocked
    ? "type-locked"
    : item.type === "video"
    ? "type-video"
    : item.type === "file"
    ? "type-file"
    : "type-quiz";

  const iconGlyph = !unlocked
    ? "bi-lock-fill"
    : item.type === "video"
    ? "bi-play-circle"
    : item.type === "file"
    ? "bi-file-earmark-pdf"
    : "bi-patch-question";

  const checkGlyph = isDone
    ? '<i class="bi bi-check-lg fs-14"></i>'
    : !unlocked
    ? '<i class="bi bi-lock-fill fs-12 text-secondary"></i>'
    : '<i class="bi bi-check fs-14" style="color:transparent"></i>';

  const miniProgress =
    item.type === "video" && !isDone && watchedPct > 0
      ? `<div class="mini-progress-track"><div class="mini-progress-fill" style="width:${watchedPct}%"></div></div>`
      : "";

  const metaParts = [];
  if (item.duration) metaParts.push(`<span class="fs-11 text-secondary d-flex align-items-center gap-1"><i class="bi bi-clock"></i> ${item.duration}</span>`);
  if (item.size) metaParts.push(`<span class="fs-11 text-secondary">${item.size}</span>`);
  if (item.questions) metaParts.push(`<span class="fs-11 text-secondary">${item.questions} سؤال • ${item.minutes} د</span>`);
  if (isCurrent) metaParts.push(`<span class="badge-watching">قيد المشاهدة</span>`);
  if (!unlocked) metaParts.push(`<span class="lock-pill"><i class="bi bi-lock-fill"></i> مقفل</span>`);

  const titleClass = isDone
    ? "fw-bold"
    : isCurrent
    ? "fw-bold text-primary-brand"
    : !unlocked
    ? "fw-medium text-secondary"
    : "fw-medium";
  const titleColor = isDone ? "color:#14532d;" : "";

  const percentBadge =
    item.type === "video" && isCurrent
      ? `<span id="sidebar-current-percent" class="fs-11 fw-bold text-primary-brand px-2 py-1 rounded-pill" style="background:rgba(241,186,26,.2);">${Math.round(
          currentVideoWatchedPercent()
        )}%</span>`
      : "";

  return `
    <div class="${rowClasses}" data-action="select-item" data-index="${globalIndex}">
      <div class="d-flex flex-column align-items-center gap-1">
        <button
          class="check-circle ${isDone ? "done" : ""} ${!unlocked ? "is-locked" : ""}"
          data-action="toggle-check"
          data-item-id="${item.id}"
          title="${isDone ? "مكتمل - اضغط للإلغاء" : unlocked ? "وضع علامة مكتمل" : "مقفل - أكمل السابق"}"
        >${checkGlyph}</button>
        ${miniProgress}
      </div>
      <div class="lesson-type-icon ${iconClass}">
        <i class="bi ${iconGlyph} fs-16"></i>
      </div>
      <div class="flex-fill min-w-0">
        <div class="fs-13 lh-sm lesson-title ${titleClass}" style="${titleColor}">${item.title}</div>
        <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">${metaParts.join("")}</div>
      </div>
      ${percentBadge}
    </div>
  `;
}

function renderHelpCard() {
  return `
    <div class="help-card p-4">
      <div class="d-flex flex-column align-items-center text-center gap-3">
        <div class="help-icon-badge"><i class="bi bi-life-preserver"></i></div>
        <p class="fs-13 lh-base fw-bold mb-0">واجهت صعوبة؟ لا تقلق، نحن هنا لمساعدتك في كل خطوة</p>
        <p class="fs-11 lh-sm text-secondary mb-0 mt-n1">فريق الدعم جاهز للإجابة على جميع استفساراتك الأكاديمية والتقنية</p>
      </div>
      <button class="help-btn mt-4" data-action="request-help">
        <i class="bi bi-life-preserver fs-16"></i> طلب المساعدة
      </button>
    </div>
  `;
}

// SVG progress ring (mirrors the original's small circular progress component).
function progressRingSVG(percent, size = 32, color = "#01335b") {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;
  return `
    <svg width="${size}" height="${size}" class="flex-shrink-0">
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${stroke}" />
      <circle
        cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${center} ${center})" style="transition:stroke-dashoffset .5s ease"
      />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="${size * 0.32}" font-weight="700" fill="${color}">
        ${Math.round(percent)}%
      </text>
    </svg>
  `;
}

/* ---------------------------------------------------------------------
 * Main content
 * ------------------------------------------------------------------- */

// Signature of "the state that actually changes what's on screen" for the
// currently open item. Used to avoid rebuilding (and thereby destroying/
// restarting) the <video> element when a full renderAll() is triggered by
// something unrelated, like opening a different accordion section.
let lastMainSignature = null;

function renderMainContent() {
  const section = document.getElementById("main-content-col");
  if (!section) return;

  section.className = App.ui.focusMode ? "col-12 d-flex flex-column gap-4" : "col-12 col-lg-8 d-flex flex-column gap-4";

  if (App.ui.transitioning) {
    lastMainSignature = "transitioning";
    section.innerHTML = `
      <div class="skeleton-pulse" style="height:420px;"></div>
      <div class="skeleton-pulse" style="height:96px;"></div>
    `;
    return;
  }

  const entry = findFlatByItemId(App.ui.activeId);
  const item = entry.item;
  const isDone = App.state.completedIds.includes(item.id);
  const isDownloaded = App.state.downloadedIds.includes(item.id);
  const notesValue = App.state.notes[item.id] || "";

  const signature = JSON.stringify([item.id, isDone, isDownloaded, notesValue]);
  if (signature === lastMainSignature) return; // nothing relevant to this pane changed
  lastMainSignature = signature;

  if (item.type === "video") {
    section.innerHTML = renderVideoPanel(entry);
    wireVideoElement();
  } else if (item.type === "file") {
    section.innerHTML = renderFilePanel(entry);
  } else {
    section.innerHTML = renderQuizPanel(entry);
  }
}

function renderVideoPanel(entry) {
  const item = entry.item;
  const watchedRaw = currentVideoWatchedPercent();
  const watched = Math.round(watchedRaw);
  const isDownloaded = App.state.downloadedIds.includes(item.id);
  const notesValue = App.state.notes[item.id] || "";
  const isFirst = App.flatList.findIndex((e) => e.item.id === item.id) === 0;
  const nextDisabled = watchedRaw < 80 && !App.state.completedIds.includes(item.id);

  return `
    <div class="alert-academic p-3 d-flex align-items-start gap-3">
      <div class="icon-badge"><i class="bi bi-info-circle-fill"></i></div>
      <div class="fs-13 lh-base">
        <span class="fw-bold" style="color:#92400e;">تنبيه أكاديمي:</span>
        <span style="color:#78350f;" class="me-1">
          يجب مشاهدة 80% أو تحديد الدرس كمكتمل للانتقال للدرس التالي. تقدمك الحالي:
          <b id="watched-percent-alert-num">${watched}%</b>
        </span>
        <div class="progress-thin progress-thin-amber mt-2" style="max-width:320px;">
          <div id="alert-progress-fill" style="width:${watched}%"></div>
        </div>
      </div>
    </div>

    <div class="video-wrapper">
      <video
        id="video-el"
        src="${item.url}"
        playsinline
      ></video>
      <div class="controls-bar">
        <div class="d-flex align-items-center gap-3">
          <input id="seek-range" type="range" min="0" max="100" value="0" class="custom-range flex-fill" />
          <span id="time-label" class="text-white fs-12 fw-medium tabular-nums">0:00 / 0:00</span>
        </div>
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="d-flex align-items-center gap-2">
            <button id="play-pause-btn" class="player-round-btn" data-action="toggle-play">
              <i id="play-pause-icon" class="bi bi-play-fill fs-18"></i>
            </button>
            <div class="position-relative d-flex align-items-center gap-2">
              <button class="player-round-btn ghost" data-action="toggle-mute">
                <i id="volume-icon" class="bi ${App.ui.player.muted || App.ui.player.volume === 0 ? "bi-volume-mute" : "bi-volume-up"}"></i>
              </button>
              <input
                id="volume-slider-el"
                type="range" min="0" max="1" step="0.05"
                value="${App.ui.player.muted ? 0 : App.ui.player.volume}"
                class="custom-range volume-slider ${App.ui.player.showVolume ? "" : "d-none"}"
                data-action="volume-change"
              />
            </div>
            <div id="watched-percent-controls" class="text-white-50 fs-12 d-none d-sm-block">شاهدت ${watched}% من هذا الفيديو</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="position-relative">
              <button class="px-3 py-1 rounded-pill bg-white bg-opacity-10 text-white fs-12 fw-bold d-flex align-items-center gap-1 border-0" data-action="toggle-speed-menu">
                <i class="bi bi-speedometer"></i> <span id="speed-label">${App.ui.player.speed}x</span>
              </button>
              <div id="speed-menu-el" class="speed-menu ${App.ui.player.showSpeed ? "" : "d-none"}">
                ${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
                  .map(
                    (s) =>
                      `<button class="${s === App.ui.player.speed ? "active" : ""}" data-action="set-speed" data-speed="${s}">${s}x</button>`
                  )
                  .join("")}
              </div>
            </div>
            <button class="player-round-btn ghost" data-action="request-pip"><i class="bi bi-pip"></i></button>
            <button class="player-round-btn ghost" data-action="toggle-fullscreen"><i class="bi bi-fullscreen"></i></button>
          </div>
        </div>
      </div>
    </div>

    <div class="card-pro p-4 d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
      <div class="d-flex align-items-center gap-3">
        <button
          id="download-btn"
          class="d-flex align-items-center gap-2 px-4 py-2 rounded-3 fw-bold fs-13 border-0"
          style="background:${isDownloaded ? "#16a34a" : "#01335b"};color:#fff;"
          data-action="download"
        >
          <i id="download-btn-icon" class="bi ${isDownloaded ? "bi-check-circle-fill" : "bi-download"}"></i>
          <span id="download-btn-text">${isDownloaded ? "تم التحميل" : "تحميل الفيديو للمشاهدة أوفلاين"}</span>
        </button>
        <span id="download-hint" class="fs-11 text-secondary d-none d-md-block" style="max-width:320px;line-height:1.6;">
          ${
            isDownloaded
              ? "لقد تم تحميل هذا الفيديو ويمكن مشاهدته في صفحتك الشخصية بدون إنترنت"
              : "عند الضغط على التحميل سيتم حفظ الفيديو في قائمة التشغيل بصفحتك الشخصية ويمكنك مشاهدته بدون إنترنت"
          }
        </span>
      </div>
      <div class="d-flex align-items-center gap-2 fs-12 text-secondary">
        <i class="bi bi-shield-check" style="color:#16a34a;"></i> محمي بحقوق الدورة
      </div>
    </div>

    <div class="card-pro p-4">
      <div class="d-flex align-items-center gap-2 mb-3">
        <div class="summary-icon-badge"><i class="bi bi-journal-text"></i></div>
        <h3 class="fs-16 fw-bold text-primary-brand mb-0">ملخص ما تم شرحه</h3>
      </div>
      <p class="fs-14 lh-lg text-body-secondary">${item.summary}</p>
      <ul class="list-unstyled d-flex flex-column gap-2 mt-3 mb-0">
        ${(item.bullets || [])
          .map(
            (b) =>
              `<li class="d-flex align-items-start gap-2 fs-13 text-secondary">
                 <span class="summary-bullet-dot"><i class="bi bi-check fs-12"></i></span> ${b}
               </li>`
          )
          .join("")}
      </ul>
    </div>

    <div class="card-pro p-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h4 class="fs-14 fw-bold text-primary-brand mb-0 d-flex align-items-center gap-2">
          <i class="bi bi-pencil-square"></i> ملاحظاتي السريعة
        </h4>
        <span class="fs-11 text-secondary">تحفظ تلقائيا</span>
      </div>
      <textarea
        id="notes-textarea"
        class="notes-textarea"
        placeholder="اكتب أهم النقاط التي تريد تذكرها في هذا الدرس..."
        data-action="save-note"
      >${escapeHtml(notesValue)}</textarea>
    </div>

    <div class="d-flex align-items-center justify-content-between gap-3 pt-2">
      <button class="btn-outline-custom d-flex align-items-center gap-2" data-action="go-prev" ${isFirst ? "disabled" : ""}>
        <i class="bi bi-arrow-right"></i> السابق
      </button>
      <button id="btn-continue" class="btn-primary-custom d-flex align-items-center gap-2" data-action="go-next" ${nextDisabled ? "disabled" : ""}>
        أكمل المتابعة <i class="bi bi-arrow-left"></i>
      </button>
    </div>
  `;
}

function renderFilePanel(entry) {
  const item = entry.item;
  const isDone = App.state.completedIds.includes(item.id);

  return `
    <div class="card-pro p-5 text-center">
      <div class="file-icon-xl mb-4"><i class="bi bi-file-earmark-pdf-fill"></i></div>
      <h2 class="fs-18 fw-bold text-primary-brand">${item.title}</h2>
      <p class="fs-13 text-secondary mt-2">حجم الملف: ${item.size} • PDF عالي الجودة</p>
      <button
        id="download-btn"
        class="mt-4 px-4 py-2 rounded-3 fw-bold fs-14 d-inline-flex align-items-center gap-2 border-0"
        style="background:${isDone ? "#16a34a" : "#01335b"};color:#fff;"
        data-action="download"
      >
        <i id="download-btn-icon" class="bi ${isDone ? "bi-check-circle" : "bi-download"}"></i>
        <span id="download-btn-text">${isDone ? "تم التحميل والاكتمال" : "تحميل الملف الآن"}</span>
      </button>
      <div class="fs-12 text-secondary mt-3">سيظهر بجانب الملف في القائمة علامة صح خضراء بعد التحميل</div>
    </div>
    <div class="d-flex align-items-center justify-content-between">
      <button class="btn-outline-custom d-flex align-items-center gap-2" data-action="go-prev">
        <i class="bi bi-arrow-right"></i> السابق
      </button>
      <button class="btn-primary-custom d-flex align-items-center gap-2" data-action="go-next">
        التالي <i class="bi bi-arrow-left"></i>
      </button>
    </div>
  `;
}

function renderQuizPanel(entry) {
  const item = entry.item;
  const isDone = App.state.completedIds.includes(item.id);

  return `
    <div class="card-pro p-4">
      <div class="d-flex align-items-start gap-3">
        <div class="quiz-icon-xl"><i class="bi bi-patch-question-fill"></i></div>
        <div class="flex-fill">
          <h2 class="fs-20 fw-bold text-primary-brand">${item.title}</h2>
          <p class="fs-13 text-secondary mt-2 lh-base">
            هذا الاختبار يقيّم مدى استيعابك لمحتوى ${entry.sectionTitle}. يجب اجتيازه لفتح القسم التالي. يمكنك إعادته أكثر من مرة.
          </p>
          <div class="d-flex gap-3 mt-4 flex-wrap" style="max-width:420px;">
            <div class="quiz-stat-box flex-fill">
              <div class="fs-18 fw-bold text-primary-brand">${item.questions}</div>
              <div class="fs-11 text-secondary">سؤال</div>
            </div>
            <div class="quiz-stat-box flex-fill">
              <div class="fs-18 fw-bold text-primary-brand">${item.minutes}</div>
              <div class="fs-11 text-secondary">دقيقة</div>
            </div>
            <div class="quiz-stat-box flex-fill">
              <div class="fs-18 fw-bold" style="color:#16a34a;">70%</div>
              <div class="fs-11 text-secondary">للنجاح</div>
            </div>
          </div>
          <button class="mt-4 btn-primary-custom d-inline-flex align-items-center gap-2" data-action="start-quiz" data-item-id="${item.id}">
            <i class="bi bi-box-arrow-up-right"></i> بدء الاختبار الآن
          </button>
          <div class="mt-3 fs-12 text-secondary d-flex align-items-center gap-1">
            <i class="bi bi-lock-fill"></i> لن يفتح القسم التالي حتى تكمل هذا الاختبار
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex align-items-center justify-content-between">
      <button class="btn-outline-custom d-flex align-items-center gap-2" data-action="go-prev">
        <i class="bi bi-arrow-right"></i> السابق
      </button>
      <button class="btn-primary-custom d-flex align-items-center gap-2" data-action="go-next" ${isDone ? "" : "disabled"}>
        فتح القسم التالي <i class="bi bi-unlock"></i>
      </button>
    </div>
  `;
}

// Patches the download button in place (used after "download" clicks) so
// we don't have to rebuild the whole main content pane — which would
// destroy and restart a currently-playing <video> element.
function refreshDownloadButtonUI() {
  const entry = findFlatByItemId(App.ui.activeId);
  const item = entry.item;
  const isDone = App.state.completedIds.includes(item.id);
  const isDownloaded = App.state.downloadedIds.includes(item.id);
  const done = item.type === "file" ? isDone : isDownloaded;

  const btn = document.getElementById("download-btn");
  const icon = document.getElementById("download-btn-icon");
  const text = document.getElementById("download-btn-text");
  const hint = document.getElementById("download-hint");

  if (btn) btn.style.background = done ? "#16a34a" : "#01335b";
  if (icon) icon.className = `bi ${done ? (item.type === "file" ? "bi-check-circle" : "bi-check-circle-fill") : "bi-download"}`;
  if (text) {
    text.textContent =
      item.type === "file"
        ? done
          ? "تم التحميل والاكتمال"
          : "تحميل الملف الآن"
        : done
        ? "تم التحميل"
        : "تحميل الفيديو للمشاهدة أوفلاين";
  }
  if (hint) {
    hint.textContent = done
      ? "لقد تم تحميل هذا الفيديو ويمكن مشاهدته في صفحتك الشخصية بدون إنترنت"
      : "عند الضغط على التحميل سيتم حفظ الفيديو في قائمة التشغيل بصفحتك الشخصية ويمكنك مشاهدته بدون إنترنت";
  }

  // Keep the cached signature in sync so a later unrelated renderAll()
  // doesn't rebuild the pane again for a change we already applied.
  const notesValue = App.state.notes[item.id] || "";
  lastMainSignature = JSON.stringify([item.id, isDone, isDownloaded, notesValue]);
}

/* ---------------------------------------------------------------------
 * Toasts
 * ------------------------------------------------------------------- */

function renderToasts() {
  const container = document.getElementById("toast-container");
  if (!container) return;

  container.innerHTML = App.ui.toasts
    .map((t) => {
      const iconClass =
        t.type === "success" ? "bi-check-circle-fill" : t.type === "warning" ? "bi-exclamation-triangle-fill" : "bi-info-circle-fill";
      const typeClass = t.type === "success" ? "toast-success" : t.type === "warning" ? "toast-warning" : "toast-info";
      return `
        <div class="toast-pro ${typeClass}">
          <i class="bi ${iconClass} fs-16 mt-1"></i>
          <span class="lh-base">${t.msg}</span>
        </div>
      `;
    })
    .join("");
}

/* ---------------------------------------------------------------------
 * Small utilities
 * ------------------------------------------------------------------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
