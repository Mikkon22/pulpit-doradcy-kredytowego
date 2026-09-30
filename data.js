/**
 * Dane demonstracyjne pulpitu doradcy kredytowego.
 * W docelowym systemie ten moduł zastąpiłoby wywołanie API.
 */

// Etapy procesu w kolejności — indeks steruje paskiem postępu w tabeli.
const STAGES = [
  'Wypełnianie',
  'Weryfikacja dokumentów',
  'Analiza ryzyka',
  'Decyzja',
];

// Typy problemów blokujących wniosek. `priority` porządkuje listę alertów:
// im niższa liczba, tym pilniejsza sprawa.
//
// `action` to szybka akcja odpowiadająca danemu problemowi — każdy powód
// utknięcia wniosku ma własną, jednoklikową odpowiedź.
const PROBLEMS = {
  ok: {
    label: 'OK', tone: 'ok', priority: 4, info: false,
    action: null,
  },
  bik: {
    // Przyczyna leży po stronie systemu, nie klienta, więc komunikat jest
    // stały — nie ma tu nic, co różniłoby się między wnioskami.
    label: 'Błąd systemu BIK', tone: 'bik', priority: 1, info: false,
    detail: 'Automatyczne zapytanie do BIK wymaga ponowienia.',
    action: { kind: 'retry', label: 'Wyślij ponownie do BIK', icon: 'retry.svg' },
  },
  docs: {
    label: 'Brakujące dokumenty', tone: 'docs', priority: 2, info: true,
    action: { kind: 'remind', label: 'Wyślij przypomnienie', icon: 'qa-reminder.svg' },
  },
  data: {
    label: 'Prośba o korektę danych', tone: 'data', priority: 3, info: false,
    action: { kind: 'edit', label: 'Zmień dane wniosku', icon: 'edit-pencil.svg' },
  },
};

// Norma czasu (w godzinach) na każdym etapie. Przekroczenie oznacza wniosek
// czerwonym czasem i wypycha go na górę listy "Pilne".
const STAGE_NORM_HOURS = [48, 48, 24, 24];

const APPLICATIONS = [
  {
    id: 'KH/2026/0401',
    name: 'Bartosz Nowak',
    amount: 450000,
    stage: 2,
    hoursInStage: 2,
    problem: 'bik',
    phone: '+48 602 110 344',
    email: 'b.nowak@example.com',
    note: 'Zapytanie do BIK zawiesiło się — wymaga ponownego wysłania.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Zapytanie BIK zakończone błędem',
      '28.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0402',
    name: 'Marek Nowak',
    amount: 750000,
    stage: 2,
    hoursInStage: 3,
    problem: 'bik',
    phone: '+48 605 887 201',
    email: 'm.nowak@example.com',
    note: 'Automatyczne zapytanie do BIK wymaga ponowienia.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Zapytanie BIK zakończone błędem',
      '27.09 · Komplet dokumentów zweryfikowany',
    ],
  },
  {
    id: 'KH/2026/0412',
    name: 'Cecylia Wiśniewska',
    amount: 380000,
    stage: 1,
    hoursInStage: 72,
    problem: 'docs',
    phone: '+48 601 234 567',
    email: 'Wisniewska@example.com',
    note: 'Umowa przedwstępna: notariusz 14.10',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: false },
    ],
    history: [
      '26.09 · SMS z przypomnieniem wysłany',
      '23.09 · Wniosek przekazany do weryfikacji',
    ],
  },
  {
    id: 'KH/2026/0415',
    name: 'Krzysztof Zieliński',
    amount: 600000,
    stage: 1,
    hoursInStage: 10,
    problem: 'docs',
    phone: '+48 604 771 902',
    email: 'k.zielinski@example.com',
    note: 'Brakuje wyciągu z konta za ostatnie 3 miesiące.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: false },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Wniosek przekazany do weryfikacji',
      '28.09 · Wniosek złożony',
    ],
  },
  {
    id: 'KH/2026/0418',
    name: 'Ewa Jabłońska',
    amount: 430000,
    stage: 2,
    hoursInStage: 24,
    problem: 'data',
    phone: '+48 691 300 145',
    email: 'e.jablonska@example.com',
    note: 'Analityk z centrali cofnął wniosek do korekty.',
    // Cofnięcie z centrali zawsze dotyczy konkretnej liczby — doradca musi
    // od razu widzieć, co i na co ma zmienić, bez wchodzenia we wniosek.
    correction: { field: 'Dochód miesięczny', from: '10 000 zł', to: '8 500 zł' },
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '28.09 · Wniosek cofnięty przez analityka',
      '26.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0421',
    name: 'Dawid Kowalczyk',
    amount: 500000,
    stage: 2,
    hoursInStage: 2,
    problem: 'data',
    phone: '+48 668 214 780',
    email: 'd.kowalczyk@example.com',
    note: 'Analityk z centrali cofnął wniosek do korekty.',
    correction: { field: 'Staż pracy', from: '6 lat', to: '4 lata' },
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Wniosek cofnięty przez analityka',
      '27.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0424',
    name: 'Ewa Zielińska',
    amount: 700000,
    stage: 2,
    hoursInStage: 24,
    problem: 'ok',
    phone: '+48 512 640 118',
    email: 'e.zielinska@example.com',
    note: 'Wniosek w normie czasowej — brak akcji po stronie doradcy.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '28.09 · Wniosek przekazany do analizy ryzyka',
      '25.09 · Komplet dokumentów zweryfikowany',
    ],
  },
  {
    id: 'KH/2026/0427',
    name: 'Filip Jankowski',
    amount: 330000,
    stage: 2,
    hoursInStage: 8,
    problem: 'ok',
    phone: '+48 783 002 559',
    email: 'f.jankowski@example.com',
    note: 'Wniosek w normie czasowej — brak akcji po stronie doradcy.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Wniosek przekazany do analizy ryzyka',
      '26.09 · Komplet dokumentów zweryfikowany',
    ],
  },
  {
    id: 'KH/2026/0430',
    name: 'Julia Wiśniewska',
    amount: 500000,
    stage: 0,
    hoursInStage: 10,
    problem: 'ok',
    phone: '+48 530 441 026',
    email: 'j.wisniewska@example.com',
    note: 'Klient uzupełnia wniosek w aplikacji bankowej.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: false },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: false },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: false },
    ],
    history: [
      '29.09 · Wniosek założony',
    ],
  },
  {
    id: 'KH/2026/0433',
    name: 'Anna Kowalska',
    amount: 620000,
    stage: 3,
    hoursInStage: 1,
    problem: 'ok',
    phone: '+48 600 918 337',
    email: 'a.kowalska@example.com',
    note: 'Wniosek oczekuje na decyzję kredytową.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Analiza ryzyka zakończona pozytywnie',
      '27.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0436',
    name: 'Tomasz Kowalczyk',
    amount: 980000,
    stage: 3,
    hoursInStage: 24,
    problem: 'ok',
    phone: '+48 697 155 480',
    email: 't.kowalczyk@example.com',
    note: 'Wniosek oczekuje na decyzję kredytową.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '28.09 · Analiza ryzyka zakończona pozytywnie',
      '24.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0439',
    name: 'Aleksandra Mazur',
    amount: 540000,
    stage: 2,
    hoursInStage: 5,
    problem: 'bik',
    phone: '+48 663 401 289',
    email: 'a.mazur@example.com',
    note: 'Zapytanie do BIK zawiesiło się przy weryfikacji historii kredytowej.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '30.09 · Zapytanie BIK zakończone błędem',
      '29.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0442',
    name: 'Piotr Lewandowski',
    amount: 820000,
    stage: 1,
    hoursInStage: 54,
    problem: 'docs',
    phone: '+48 517 228 640',
    email: 'p.lewandowski@example.com',
    note: 'Klient czeka na termin u notariusza.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: false },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '28.09 · SMS z przypomnieniem wysłany',
      '26.09 · Wniosek przekazany do weryfikacji',
    ],
  },
  {
    id: 'KH/2026/0445',
    name: 'Magdalena Szymańska',
    amount: 410000,
    stage: 2,
    hoursInStage: 30,
    problem: 'data',
    phone: '+48 574 190 833',
    email: 'm.szymanska@example.com',
    note: 'Analityk z centrali cofnął wniosek do korekty.',
    correction: { field: 'Wkład własny', from: '90 000 zł', to: '70 000 zł' },
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '29.09 · Wniosek cofnięty przez analityka',
      '27.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0448',
    name: 'Rafał Dąbrowski',
    amount: 660000,
    stage: 2,
    hoursInStage: 6,
    problem: 'ok',
    phone: '+48 690 315 772',
    email: 'r.dabrowski@example.com',
    note: 'Wniosek w normie czasowej — brak akcji po stronie doradcy.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '30.09 · Wniosek przekazany do analizy ryzyka',
      '27.09 · Komplet dokumentów zweryfikowany',
    ],
  },
  {
    id: 'KH/2026/0451',
    name: 'Natalia Woźniak',
    amount: 295000,
    stage: 0,
    hoursInStage: 20,
    problem: 'ok',
    phone: '+48 728 604 117',
    email: 'n.wozniak@example.com',
    note: 'Klientka uzupełnia wniosek w aplikacji bankowej.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: false },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: false },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: false },
    ],
    history: [
      '30.09 · Wniosek założony',
    ],
  },
  {
    id: 'KH/2026/0454',
    name: 'Michał Kaczmarek',
    amount: 1150000,
    stage: 3,
    hoursInStage: 4,
    problem: 'ok',
    phone: '+48 602 887 043',
    email: 'm.kaczmarek@example.com',
    note: 'Wniosek oczekuje na decyzję kredytową.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '30.09 · Analiza ryzyka zakończona pozytywnie',
      '28.09 · Wniosek przekazany do analizy ryzyka',
    ],
  },
  {
    id: 'KH/2026/0457',
    name: 'Karolina Grabowska',
    amount: 470000,
    stage: 1,
    hoursInStage: 12,
    problem: 'ok',
    phone: '+48 535 772 908',
    email: 'k.grabowska@example.com',
    note: 'Dokumenty w trakcie weryfikacji — brak akcji po stronie doradcy.',
    documents: [
      { label: 'Dowód osobisty', genitive: 'dowodu osobistego', done: true },
      { label: 'Umowa przedwstępna', genitive: 'umowy przedwstępnej', done: true },
      { label: 'Wyciąg z konta (3 mies.)', genitive: 'wyciągu z konta za ostatnie 3 miesiące', done: true },
      { label: 'Zaświadczenie o zarobkach', genitive: 'zaświadczenia o zarobkach', done: true },
    ],
    history: [
      '30.09 · Wniosek przekazany do weryfikacji',
      '29.09 · Wniosek złożony',
    ],
  },
];
