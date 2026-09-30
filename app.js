/**
 * Pulpit doradcy kredytowego — logika widoku.
 * Czysty JS, bez zależności; stan trzymany w pamięci (dane demonstracyjne).
 */

const rowsEl   = document.getElementById('rows');
const emptyEl  = document.getElementById('empty');
const searchEl = document.getElementById('search');
const sidebarEl = document.getElementById('sidebar');
const toastEl  = document.getElementById('toast');
const sortNoteEl = document.getElementById('sort-note');

const state = {
  query: '',
  sort: 'priority',   // 'priority' | 'name' | 'stage' | 'time' | 'problem'
  dir: 'desc',        // kierunek dla kolumny wybranej ręcznie
  selectedId: null,
};

/* ------------------------------------------------------------- pomocnicze */

// "2 h" / "1 dzień" / "3 dni" — odmiana zgodna z polską gramatyką.
function formatDuration(hours) {
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return '1 dzień';
  return `${days} dni`;
}

function formatAmount(amount) {
  return `${amount.toLocaleString('pl-PL')} zł`;
}

// "zaświadczenia o zarobkach" / "X i Y" / "X, Y i Z" — dopełniacz bierzemy
// z danych dokumentu, żeby nie odmieniać nazw w kodzie.
function listGenitive(documents) {
  const names = documents.map(d => d.genitive);
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`;
}

function normFor(app) {
  return STAGE_NORM_HOURS[app.stage];
}

// Wniosek "na już": przekroczył normę czasu na swoim etapie.
function isOverdue(app) {
  return app.hoursInStage > normFor(app);
}

// Im wyższa wartość, tym pilniejsza sprawa. Łączy typ problemu
// z tym, jak bardzo wniosek przekroczył normę czasu.
function urgencyScore(app) {
  const problemWeight = (5 - PROBLEMS[app.problem].priority) * 100;
  const timeWeight = (app.hoursInStage / normFor(app)) * 10;
  return problemWeight + timeWeight;
}

function nowTime() {
  return new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function todayStamp() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* Podpowiedź trzymana poza tabelą: `.table` przycina zawartość (zaokrąglone
   rogi, a przy wąskim oknie przewijanie poziome), więc dymek wewnątrz wiersza
   zostałby obcięty. Jeden element na całą stronę, pozycjonowany przy pokazaniu. */
const tooltipEl = document.createElement('div');
tooltipEl.className = 'tooltip';
tooltipEl.setAttribute('role', 'tooltip');
document.body.appendChild(tooltipEl);

function showTooltip(target) {
  tooltipEl.textContent = target.dataset.tip;
  tooltipEl.classList.add('show');

  const anchor = target.getBoundingClientRect();
  const tip = tooltipEl.getBoundingClientRect();
  const gap = 8;

  // Domyślnie nad znacznikiem; gdy brakuje miejsca u góry — pod nim.
  const above = anchor.top - tip.height - gap;
  tooltipEl.style.top = `${above < 0 ? anchor.bottom + gap : above}px`;

  // Wyśrodkowanie względem znacznika, przycięte do okna.
  const centered = anchor.left + anchor.width / 2 - tip.width / 2;
  const maxLeft = window.innerWidth - tip.width - gap;
  tooltipEl.style.left = `${Math.max(gap, Math.min(centered, maxLeft))}px`;
}

function hideTooltip() {
  tooltipEl.classList.remove('show');
}

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

/* ------------------------------------------------------ lista i sortowanie */

function visibleApplications() {
  const q = state.query.trim().toLowerCase();
  const list = APPLICATIONS.filter(app =>
    !q ||
    app.name.toLowerCase().includes(q) ||
    app.id.toLowerCase().includes(q) ||
    app.email.toLowerCase().includes(q)
  );

  const factor = state.dir === 'asc' ? 1 : -1;
  const compare = {
    // Domyślnie: najpilniejsze na górze — to jest "podpowiedź priorytetów".
    priority: (a, b) => urgencyScore(b) - urgencyScore(a),
    name:     (a, b) => a.name.localeCompare(b.name, 'pl') * factor,
    stage:    (a, b) => (a.stage - b.stage) * factor,
    time:     (a, b) => (a.hoursInStage - b.hoursInStage) * factor,
    problem:  (a, b) => (PROBLEMS[a.problem].priority - PROBLEMS[b.problem].priority) * factor,
  }[state.sort];

  return list.sort(compare);
}

function renderTable() {
  const list = visibleApplications();
  rowsEl.innerHTML = '';

  for (const app of list) {
    const problem = PROBLEMS[app.problem];
    const overdue = isOverdue(app);
    // Znacznik "Brakujące dokumenty" ma ikonę (i) — po najechaniu mówi wprost,
    // czego brakuje, żeby doradca nie musiał otwierać podglądu.
    const missingDocs = app.documents.filter(d => !d.done);
    const tip = app.problem === 'docs' && missingDocs.length
      ? `Brakuje ${listGenitive(missingDocs)}.`
      : '';

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'row';
    row.setAttribute('role', 'row');
    row.setAttribute('aria-selected', String(app.id === state.selectedId));
    row.dataset.id = app.id;

    const bars = STAGES
      .map((_, i) => `<i class="${i <= app.stage ? 'on' : ''}"></i>`)
      .join('');

    row.innerHTML = `
      <div class="col col-name">
        <div class="client-name">${app.name}</div>
        <div class="client-amount">${formatAmount(app.amount)}</div>
      </div>
      <div class="col col-stage">
        <div class="stage-bars">${bars}</div>
        <div class="stage-label">${STAGES[app.stage]}</div>
      </div>
      <div class="col col-time">
        <div class="time ${overdue ? 'overdue' : ''}">
          <img src="assets/clock.svg" alt="">
          <span>${formatDuration(app.hoursInStage)}</span>
        </div>
      </div>
      <div class="col col-problem">
        <span class="chip ${problem.tone}"${tip ? ` data-tip="${tip}" tabindex="0"` : ''}>
          ${problem.label}
          ${problem.info ? '<img src="assets/info-circle.svg" alt="">' : ''}
        </span>
      </div>
      <div class="col col-action">${renderProblemAction(app)}</div>
      <div class="quick-actions">
        <span class="qa" role="button" tabindex="0" data-act="call"
              title="Zadzwoń do klienta" aria-label="Zadzwoń do klienta">
          <img src="assets/qa-phone.svg" alt="">
        </span>
        <span class="qa" role="button" tabindex="0" data-act="email"
              title="Wyślij e-mail" aria-label="Wyślij e-mail">
          <img src="assets/qa-email.svg" alt="">
        </span>
      </div>
    `;

    row.addEventListener('click', () => selectApplication(app.id));
    wireRowQuickActions(row, app);
    rowsEl.appendChild(row);
  }

  emptyEl.hidden = list.length > 0;
  renderSortNote(list);
  // Przy otwartym panelu wiersz nie pokazuje akcji — tabela jest wtedy
  // węższa, a akcje dostępne są w panelu.
  document.body.classList.toggle('sidebar-open', state.selectedId !== null);
}

/**
 * Podpis pod tytułem mówi wprost, według czego ułożona jest lista. Przy
 * sortowaniu ręcznym zamienia się w drogę powrotną do domyślnej kolejności —
 * inaczej doradca nie wiedziałby, że ją stracił, ani jak ją odzyskać bez
 * przeładowania strony.
 */
function renderSortNote(list) {
  // Pusta lista mówi sama za siebie komunikatem w tabeli.
  if (!list.length) {
    sortNoteEl.textContent = '';
    return;
  }

  if (state.sort === 'priority') {
    sortNoteEl.textContent = 'Uszeregowane według akcji i czasu oczekiwania';
    return;
  }

  sortNoteEl.innerHTML =
    '<button class="sort-reset" type="button">' +
    '↺ Wróć do sortowania według akcji i czasu oczekiwania</button>';
  sortNoteEl.querySelector('.sort-reset').addEventListener('click', resetSort);
}

/**
 * Przycisk rozwiązujący konkretny problem, renderowany w osobnej kolumnie
 * wiersza. Wiersz bez problemu zostawia tę kolumnę pustą — nie ma co robić.
 *
 *   błąd BIK              → Wyślij ponownie do BIK
 *   brakujące dokumenty   → Wyślij przypomnienie
 *   prośba o korektę      → Zmień dane wniosku
 *
 * Skróty kontaktowe (telefon, e-mail) są obok, niezależnie od problemu.
 */
function renderProblemAction(app) {
  const action = PROBLEMS[app.problem].action;
  if (!action) return '';

  // Po wykonaniu akcji przycisk zamienia się w potwierdzenie — doradca widzi
  // na liście, że sprawa jest ruszona, i nie wysyła tego samego dwa razy.
  const done = app.actionDone;
  if (done && done.kind === action.kind) {
    return `
      <span class="row-action is-done">
        <img src="assets/check.svg" alt="">
        ${doneLabel(done)}
      </span>
    `;
  }

  return `
    <span class="row-action" role="button" tabindex="0" data-act="${action.kind}"
          title="${action.label}">
      ${action.label}
      <img src="assets/${action.icon}" alt="">
    </span>
  `;
}

function doneLabel(done) {
  return done.kind === 'remind'
    ? `Wysłano przypomnienie ${done.at}`
    : 'Zmieniono dane, wysłano do zatwierdzenia';
}

/* Wspólna obsługa akcji — używana i przez wiersz, i przez panel boczny,
   żeby efekt był identyczny niezależnie od miejsca kliknięcia. */
function runAction(app, kind, channels) {
  switch (kind) {
    case 'call':
      window.location.href = `tel:${app.phone.replace(/\s/g, '')}`;
      logHistory(app, `Połączenie z klientem (${app.phone})`);
      toast(`Dzwonię: ${app.phone}`);
      break;

    case 'email':
      window.location.href = `mailto:${app.email}`;
      logHistory(app, `E-mail do klienta (${app.email})`);
      toast(`Nowa wiadomość do: ${app.email}`);
      break;

    case 'remind': {
      // Z wiersza idzie SMS-em (najszybszy kanał), z panelu — wszystkimi
      // zaznaczonymi kanałami naraz. Zapamiętane na wniosku, żeby przetrwało
      // przerysowanie tabeli i było widoczne po zamknięciu panelu.
      const used = channels?.length ? channels : ['SMS'];
      const label = used.join(', ');
      app.actionDone = { kind: 'remind', at: nowTime() };
      logHistory(app, `Przypomnienie wysłane (${label})`);
      toast(`Przypomnienie wysłane (${label}): ${app.name}`);
      renderTable();
      break;
    }

    case 'retry':
      // Ponowione zapytanie zdejmuje blokadę — wniosek wraca do normalnego biegu.
      app.problem = 'ok';
      app.note = 'Zapytanie do BIK wysłane ponownie — oczekiwanie na odpowiedź.';
      logHistory(app, 'Zapytanie do BIK wysłane ponownie');
      toast('Zapytanie do BIK wysłane ponownie');
      renderTable();
      break;

    case 'edit':
      app.actionDone = { kind: 'edit', at: nowTime() };
      logHistory(app, 'Dane wniosku zmienione, wysłane do zatwierdzenia');
      toast(`Zmieniono dane wniosku ${app.id} — wysłano do zatwierdzenia`);
      renderTable();
      break;
  }
}

// Klik w akcję nie może otworzyć panelu, stąd stopPropagation.
function wireRowQuickActions(row, app) {
  row.querySelectorAll('[data-act]').forEach(btn => {
    const fire = e => {
      e.stopPropagation();
      e.preventDefault();
      runAction(app, btn.dataset.act, btn.dataset.channel ? [btn.dataset.channel] : undefined);
    };
    btn.addEventListener('click', fire);
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') fire(e);
    });
  });
}

// Dopisuje wpis na początek historii wniosku i odświeża widoczny panel.
function logHistory(app, text) {
  app.history.unshift(`${todayStamp()} \u00b7 ${text}`);
  if (state.selectedId === app.id) renderSidebar();
}

/* ---------------------------------------------------------------- sidebar */

function selectApplication(id) {
  state.selectedId = id;
  renderTable();
  renderSidebar();
  sidebarEl.querySelector('.sb-close')?.focus();
}

function closeSidebar() {
  const previous = state.selectedId;
  state.selectedId = null;
  sidebarEl.hidden = true;
  sidebarEl.setAttribute('aria-hidden', 'true');
  renderTable();
  // Fokus wraca na wiersz, z którego otwarto podgląd.
  rowsEl.querySelector(`.row[data-id="${CSS.escape(previous ?? '')}"]`)?.focus();
}

function renderSidebar() {
  const app = APPLICATIONS.find(a => a.id === state.selectedId);
  if (!app) {
    sidebarEl.hidden = true;
    sidebarEl.setAttribute('aria-hidden', 'true');
    return;
  }

  sidebarEl.hidden = false;
  sidebarEl.setAttribute('aria-hidden', 'false');

  const overdue = isOverdue(app);
  const missing = app.documents.filter(d => !d.done);

  // Alert pokazuje się dla każdego wniosku wymagającego akcji: dowolnego
  // z trzech problemów albo przekroczonej normy czasu na etapie.
  const needsAttention = app.problem !== 'ok' || overdue;

  // Nagłówkiem jest nazwa problemu; gdy problemu nie ma, a wniosek stoi za
  // długo — informacja o przekroczonej normie.
  const headline = app.problem !== 'ok'
    ? PROBLEMS[app.problem].label
    : `${formatDuration(app.hoursInStage)} na etapie (norma ${formatDuration(normFor(app))})`;

  // Treść alertu, od najbardziej konkretnej: wyliczenie brakujących
  // dokumentów, żądana zmiana wartości (z jakiej na jaką), stała treść
  // przypisana do typu problemu, na końcu notatka z danych wniosku.
  const detail =
    app.problem === 'docs' && missing.length
      ? `Brakuje ${listGenitive(missing)}.`
    : app.problem === 'data' && app.correction
      ? `${app.correction.field}: <span class="was">${app.correction.from}</span>` +
        ` → <span class="now">${app.correction.to}</span>`
    : PROBLEMS[app.problem].detail || app.note;

  const alertHtml = needsAttention
    ? `<div class="sb-alert">
         <strong>${headline}</strong>
         <span>${detail}</span>
       </div>`
    : `<div class="sb-section"><h2>Status</h2><p class="hist old" style="margin:0">${app.note}</p></div>`;

  const docsHtml = app.documents.map(doc => `
    <div class="doc ${doc.done ? '' : 'missing'}">
      <i></i><span>${doc.label}</span>
    </div>
  `).join('');

  // Ikona etapu: ukończony ✓, bieżący — w toku, przyszły — pusty znacznik.
  const stagesHtml = STAGES.map((label, i) => {
    const icon = i < app.stage ? 'check.svg'
               : i === app.stage ? 'loading.svg'
               : 'circle-empty.svg';
    return `
      <div class="stage-row ${i === app.stage ? 'current' : ''}">
        <span>${label}</span><img src="assets/${icon}" alt="">
      </div>
    `;
  }).join('');

  const historyHtml = app.history
    .map((entry, i) => `<div class="hist ${i === 0 ? 'recent' : 'old'}">${entry}</div>`)
    .join('');

  sidebarEl.innerHTML = `
    <div class="sb-top">
      <div>
        <h2 class="sb-name">${app.name}</h2>
        <p class="sb-sub">${formatAmount(app.amount)} &nbsp;wniosek ${app.id}</p>
      </div>
      <button class="sb-close" type="button">Zamknij ✕</button>
    </div>

    ${alertHtml}

    ${renderQuickAction(app)}

    <div class="sb-section">
      <h2>Kontakt</h2>
      <div class="contact-line">
        <img src="assets/phone-call.svg" alt="">
        <a href="tel:${app.phone.replace(/\s/g, '')}">${app.phone}</a>
      </div>
      <div class="contact-line">
        <img src="assets/mail.svg" alt="">
        <a href="mailto:${app.email}">${app.email}</a>
      </div>
    </div>

    <div class="sb-section">
      <h2>Dokumenty</h2>
      ${docsHtml}
    </div>

    <div class="sb-section">
      <h2>Etap</h2>
      ${stagesHtml}
    </div>

    <div class="sb-section">
      <h2>Historia</h2>
      ${historyHtml}
    </div>

    <div class="sb-spacer"></div>
    <button class="sb-open" type="button" id="open-full">Otwórz pełny wniosek →</button>
  `;

  wireSidebar(app);
}

/**
 * Akcja dopasowana do powodu, przez który wniosek utknął.
 * Każdy z trzech powodów utknięcia ma własną, jednoklikową odpowiedź:
 *   brak dokumentów  → przypomnienie do klienta wybranym kanałem,
 *   błąd BIK         → ponowne wysłanie zapytania,
 *   cofnięcie danych → przejście do edycji wniosku.
 */
function renderQuickAction(app) {
  const action = PROBLEMS[app.problem].action;
  if (!action) return '';

  const done = app.actionDone;
  if (done && done.kind === action.kind) {
    return `
      <div class="sb-action sb-action-single is-done">
        <img src="assets/check.svg" alt="">
        <span>${doneLabel(done)}</span>
      </div>
    `;
  }

  if (action.kind === 'remind') {
    return `
      <div class="sb-action">
        <div class="sb-action-head">
          <span>Przypomnienie dla klienta</span>
          <button class="send-btn" type="button" id="send" disabled>
            Wyślij <img src="assets/send-filled.svg" alt="">
          </button>
        </div>
        <div class="channels">
          <label class="channel"><input type="checkbox" value="SMS"> SMS</label>
          <label class="channel"><input type="checkbox" value="Email"> Email</label>
          <label class="channel"><input type="checkbox" value="aplikacja bankowa"> Poprzez aplikację bankową</label>
        </div>
      </div>
    `;
  }

  // Warianty jednoprzyciskowe (BIK, korekta danych).
  return `
    <button class="sb-action sb-action-single" type="button" id="single-action"
            data-kind="${action.kind}">
      <span>${action.label}</span>
      <img src="assets/${action.icon}" alt="">
    </button>
  `;
}

function wireSidebar(app) {
  sidebarEl.querySelector('.sb-close').addEventListener('click', closeSidebar);

  const sendBtn = sidebarEl.querySelector('#send');
  if (sendBtn) {
    const boxes = [...sidebarEl.querySelectorAll('.channels input')];

    const syncSendState = () => {
      sendBtn.disabled = !boxes.some(b => b.checked);
    };
    boxes.forEach(b => b.addEventListener('change', syncSendState));

    sendBtn.addEventListener('click', () => {
      const channels = boxes.filter(b => b.checked).map(b => b.value);
      if (!channels.length) return;

      // Ta sama obsługa co przy akcji w wierszu — dzięki temu wysyłka z panelu
      // też przestawia status na "Wysłano przypomnienie", i to w obu miejscach:
      // w panelu oraz w kolumnie akcji widocznej po jego zamknięciu.
      runAction(app, 'remind', channels);
      renderSidebar();
    });
  }

  const single = sidebarEl.querySelector('#single-action');
  if (single) {
    single.addEventListener('click', () => {
      runAction(app, single.dataset.kind);
      renderSidebar();
    });
  }

  sidebarEl.querySelector('#open-full').addEventListener('click', () => {
    toast(`Otwieram pełny wniosek ${app.id} (demo)`);
  });
}

/* ----------------------------------------------------------------- zdarzenia */

searchEl.addEventListener('input', e => {
  state.query = e.target.value;
  renderTable();
});

/**
 * Cykl sortowania kolumny: rosnąco → malejąco → z powrotem do domyślnej
 * kolejności. Bez trzeciego kroku domyślne uszeregowanie dałoby się wyłączyć
 * jednym kliknięciem i nie było jak do niego wrócić — a to ono najlepiej
 * podpowiada doradcy, czym zająć się najpierw.
 */
document.querySelectorAll('.th').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (state.sort !== key) {
      state.sort = key;
      state.dir = 'asc';
    } else if (state.dir === 'asc') {
      state.dir = 'desc';
    } else {
      state.sort = 'priority';
    }
    syncSortIndicators();
    renderTable();
  });
});

function resetSort() {
  state.sort = 'priority';
  syncSortIndicators();
  renderTable();
  // Przycisk właśnie zniknął (zastąpiła go etykieta), więc fokus nie może
  // zostać na wyrzuconym elemencie — wraca na nagłówki tabeli.
  document.querySelector('.th')?.focus();
}

// Strzałka tylko przy kolumnie, po której faktycznie sortujemy.
function syncSortIndicators() {
  for (const th of document.querySelectorAll('.th')) {
    if (th.dataset.sort === state.sort) {
      th.setAttribute('aria-sort', state.dir === 'asc' ? 'ascending' : 'descending');
    } else {
      th.removeAttribute('aria-sort');
    }
  }
}

// Delegacja, żeby podpowiedź działała po każdym przerysowaniu tabeli.
// Focus obsłużony osobno — podpowiedź musi być dostępna z klawiatury.
rowsEl.addEventListener('mouseover', e => {
  const target = e.target.closest('[data-tip]');
  if (target) showTooltip(target);
});
rowsEl.addEventListener('mouseout', e => {
  if (e.target.closest('[data-tip]')) hideTooltip();
});
rowsEl.addEventListener('focusin', e => {
  const target = e.target.closest('[data-tip]');
  if (target) showTooltip(target);
});
rowsEl.addEventListener('focusout', hideTooltip);
window.addEventListener('scroll', hideTooltip, true);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.selectedId) closeSidebar();
  if (e.key === 'Escape') hideTooltip();
});

/* ------------------------------------------------------------------ start */

sidebarEl.hidden = true;
renderTable();
