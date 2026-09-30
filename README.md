# Pulpit doradcy kredytowego

Interfejs do prowadzenia wniosków o kredyt hipoteczny. Jeden widok, w którym
doradca widzi wszystkie swoje otwarte sprawy, od razu rozpoznaje te wymagające
reakcji i może wykonać podstawową akcję bez wchodzenia w szczegóły wniosku.

Statyczna aplikacja bez zależności — HTML, CSS i JavaScript.

## Uruchomienie

**Najprościej:** otwórz `index.html` w przeglądarce, podwójnym kliknięciem.

Nie ma kroku budowania, zależności ani serwera. Skrypty ładowane są klasycznie
(nie jako moduły), a w trakcie działania nic się nie pobiera, więc `file://`
w zupełności wystarczy.

Jeśli wolisz przez serwer lokalny:

```bash
./start.sh                 # albo: python3 -m http.server 8080
```

Następnie otwórz <http://localhost:8080>.

## Struktura

| Plik | Zawartość |
|---|---|
| `index.html` | Szkielet widoku: nagłówek, wyszukiwarka, tabela, panel boczny |
| `styles.css` | Style i tokeny kolorystyczno-typograficzne |
| `data.js` | Dane demonstracyjne — 18 wniosków wraz ze szczegółami |
| `app.js` | Logika: sortowanie, filtrowanie, panel boczny, akcje |
| `assets/` | Ikony (15 plików SVG) |

## Co robi

### Lista spraw i ich statusy

Tabela pokazuje wszystkie otwarte wnioski doradcy. Kolumna *Etap* łączy pasek
postępu (Wypełnianie → Weryfikacja dokumentów → Analiza ryzyka → Decyzja)
z nazwą bieżącego etapu, więc położenie wniosku w procesie widać bez czytania
tekstu. Obok jest czas spędzony na bieżącym etapie.

### Alerty

Kolumna *Problem* używa kolorowego znacznika dla trzech powodów, przez które
wniosek staje w miejscu:

- `Błąd systemu BIK` — automatyczne zapytanie zawiesiło się,
- `Brakujące dokumenty` — klient nie dostarczył załącznika,
- `Prośba o korektę danych` — analityk cofnął wniosek do doradcy,
- `OK` — wniosek idzie normalnym trybem.

Znacznik `Brakujące dokumenty` ma ikonę (i) — po najechaniu (lub po dojściu
tabulatorem) pokazuje nazwę brakującego dokumentu, więc nie trzeba nawet
otwierać podglądu, żeby wiedzieć, czego szukać. Zdanie powstaje z tych samych
danych co alert w panelu. Dymek jest doczepiony do `<body>`, a nie do wiersza,
bo tabela przycina zawartość (zaokrąglone rogi i przewijanie poziome przy
wąskim oknie).

### Kolejność listy

Domyślne uszeregowanie to nie kolejność wpisania, tylko ranking wyliczany przez
`urgencyScore()` w `app.js`: najpierw waga typu problemu (BIK > brakujące
dokumenty > korekta danych > OK), a w ramach tej samej wagi decyduje to, jak
bardzo wniosek przekroczył normę czasu na swoim etapie (`STAGE_NORM_HOURS`
w `data.js`). Czas etapu zapala się na czerwono dokładnie wtedy, gdy przekroczył
normę.

Sortowanie po kolumnie *Problem* to co innego: porządkuje wyłącznie typ
problemu, a wewnątrz grupy zostawia kolejność z danych. W grupie „Brakujące
dokumenty" daje `Cecylia (3 dni) → Krzysztof (10 h) → Piotr (2 dni)`, podczas
gdy ranking układa je `Cecylia (3 dni) → Piotr (2 dni) → Krzysztof (10 h)`.
Żadna pojedyncza kolumna tego nie zrobi, bo to kombinacja dwóch wymiarów —
w dodatku liczona stosunkiem do normy, a nie surowymi godzinami, bo normy
różnią się między etapami.

Kliknięcie nagłówka przełącza sortowanie ręczne w cyklu **rosnąco → malejąco →
powrót do domyślnej kolejności**. Trzeci krok jest tu po coś: bez niego domyślne
uszeregowanie dałoby się wyłączyć jednym kliknięciem i nie było jak do niego
wrócić inaczej niż przeładowaniem strony.

Podpis pod tytułem mówi wprost, według czego ułożona jest lista
(`Uszeregowane według akcji i czasu oczekiwania`). Przy sortowaniu ręcznym
zamienia się w przycisk `↺ Wróć do sortowania według akcji i czasu oczekiwania`
— informacja i droga powrotna są w tym samym miejscu.

### Akcje na wierszu

Każdy wiersz ma po prawej stronie dwa stałe skróty kontaktowe (zadzwoń, wyślij
e-mail). Dodatkowo, jeśli wniosek ma problem, w osobnej kolumnie pojawia się
przycisk rozwiązujący **ten konkretny** problem. Wiersze bez problemu mają tę
kolumnę pustą, bo nie ma co robić.

| Problem | Przycisk | Efekt kliknięcia |
|---|---|---|
| Błąd systemu BIK | `Wyślij ponownie do BIK` ↻ | ponawia zapytanie, zdejmuje blokadę, wniosek spada w rankingu |
| Brakujące dokumenty | `Wyślij przypomnienie` | wysyła SMS-em; przycisk zamienia się w `✓ Wysłano przypomnienie 16:11` |
| Prośba o korektę danych | `Zmień dane wniosku` ✎ | przycisk zamienia się w `✓ Zmieniono dane, wysłano do zatwierdzenia` |
| brak problemu (OK) | — | zostają same skróty kontaktowe |

Każda akcja dopisuje wpis do historii wniosku i potwierdza się komunikatem.
Kliknięcie akcji nie otwiera panelu bocznego (`stopPropagation`), więc jedno
kliknięcie = jedna czynność.

Po wykonaniu akcji przycisk zamienia się w potwierdzenie z ptaszkiem — bez tła
i bez hoveru, bo to już status, nie kontrolka. Przypomnienie pokazuje przy tym
godzinę wysyłki. Stan trzymany jest na wniosku (`app.actionDone`), więc przeżywa
sortowanie, wyszukiwanie i akcje w innych wierszach. Kolumna akcji ma stałą
szerokość, żeby dłuższy tekst potwierdzenia nie przesuwał pozostałych kolumn.

Po otwarciu panelu tabela robi się węższa, więc kolumna akcji i skróty znikają
z wierszy. Akcja jest wtedy dostępna w panelu.

### Panel boczny

Kliknięcie wiersza rozwija panel bez opuszczania listy. Zawiera dane kontaktowe
(telefon i e-mail jako klikalne odnośniki), listę dokumentów z zaznaczeniem
brakującego, pozycję na ścieżce etapów oraz historię. Zamyka się przyciskiem
*Zamknij ✕* lub klawiszem `Esc`; tabela wraca wtedy do pełnej szerokości.

Panel powtarza akcję z wiersza w wersji rozbudowanej: przy brakujących
dokumentach pozwala wybrać kanały przypomnienia (SMS / Email / aplikacja
bankowa) zamiast wysyłać domyślnym, także kilka naraz, a przycisk *Wyślij* jest
nieaktywny do czasu zaznaczenia choć jednego. Po wysłaniu panel — tak samo jak
wiersz — zamienia formularz w potwierdzenie, a w historii ląduje wpis z listą
użytych kanałów.

Obsługa jest wspólna — funkcja `runAction()` w `app.js` — więc efekt jest
identyczny niezależnie od tego, gdzie doradca kliknie: wysyłka z panelu
przestawia status również w kolumnie akcji widocznej po zamknięciu panelu.

### Treść alertu

Alert w panelu nazywa problem w nagłówku, a pod spodem podaje konkret. Treść
dobierana jest od najbardziej szczegółowej:

1. **brakujące dokumenty** — zdanie składane z pozycji, których faktycznie nie
   dostarczono („Brakuje zaświadczenia o zarobkach."). Odmianę bierzemy z pola
   `genitive` przy dokumencie w `data.js`, żeby nie odmieniać nazw w kodzie;
2. **żądana korekta wartości** (`app.correction`) — cofnięcie wniosku przez
   analityka zawsze dotyczy konkretnej liczby, więc alert pokazuje pole oraz
   wartość starą i nową („Dochód miesięczny: ~~10 000 zł~~ → **8 500 zł**").
   Stara jest przekreślona, nowa pogrubiona, żeby kierunek zmiany był czytelny
   bez czytania zdania;
3. **stała treść typu problemu** (`PROBLEMS[...].detail`) — używana dla błędu
   BIK, bo przyczyna leży po stronie systemu, nie klienta, więc komunikat nie
   ma się czym różnić między wnioskami;
4. **notatka z danych wniosku** (`app.note`) — zapas na pozostałe przypadki.

Wniosek bez problemu, ale stojący ponad normę, dostaje w nagłówku informację
o przekroczonym czasie.

## Ograniczenia

Dane są wyłącznie demonstracyjne i trzymane w pamięci — odświeżenie strony
przywraca stan początkowy. W docelowym systemie `data.js` zastąpiłoby wywołanie
API; to jedyne miejsce, które trzeba by podmienić.

Wszystkie dane klientów są fikcyjne (adresy w domenie `example.com`
zarezerwowanej do dokumentacji, numery telefonów zmyślone).
