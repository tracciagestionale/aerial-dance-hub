# Materi_ali — piano di sviluppo a fasi

Il progetto è ampio: lo costruisco in fasi, ognuna utilizzabile e verificata prima di passare alla successiva.

## Fase 1 — Fondamenta e operatività (questo primo giro)
- Attivazione di Lovable Cloud (database, accessi, permessi lato server).
- Accesso con email/password; ruoli separati Responsabile / Insegnante, con regole di sicurezza nel database (ogni insegnante vede solo i propri corsi e le relative allieve).
- Dati demo realistici e marcati "DEMO": corsi, insegnanti e tariffe come da elenco, ~40 allieve.
- Allieve: anagrafica separata dalle iscrizioni, ID stabile, solo nome/cognome/corso obbligatori, ricerca, filtri per corso e stato, avviso di possibili doppioni, disattivazione senza perdere lo storico.
- Corsi e calendario modificabili dall'app.
- Lezioni del giorno e registro presenze: elenco grande da telefono (presente / assente / non registrata), insegnante effettiva, sostituzioni, sezione Paola per i corsi di Antonella (1 ora / tutta la lezione), conferma con esito salvataggio. Nessuna lezione duplicata.
- Registro a griglia da computer (allieve × date, filtri corso e mese).
- Design: card, colori per area (azzurro, verde, arancio/beige, rosa, lilla), navigazione in basso su telefono e laterale su computer, tutto in italiano, €, fuso Europe/Rome.

## Fase 2 — Economico
- Tariffe con data di validità, compensi = ore effettive × tariffa (nessun compenso automatico per Arianna), riepilogo mensile e pagamenti compensi.
- Quote mensili (80 € + 40 € gare) con regole generali, individuali e per singolo mese; generazione senza duplicati; dovuto / ricevuto / residuo.
- Pagamenti con abbinamento a quote, acconti, importi non attribuiti; inserimento da parte delle insegnanti per pagamenti ricevuti a mano.
- Ripartizione 30/70, esclusioni per allieva, trasferimenti palestra → Arianna, saldo.

## Fase 3 — Panoramica e importazioni
- Dashboard con totali cliccabili, previsione a 2 mesi, avvisi (presenze incomplete, doppioni, quote scadute, pagamenti da attribuire).
- Importazione CSV/Google Sheets (allieve, bonifici) con mappatura colonne, anteprima, controllo doppioni e suggerimenti di abbinamento.
- Esportazioni.

## Fase 4 — Offline
- App installabile sul telefono, interfaccia disponibile senza rete (solo nella versione pubblicata, non nell'anteprima).
- Dati operativi salvati sul dispositivo, coda di modifiche con stati "Salvato sul dispositivo / Da sincronizzare / Sincronizzato / Errore", pulsante "Riprova", sincronizzazione all'apertura e al ritorno della rete, gestione conflitti senza sovrascritture, richiesta di spazio persistente. La parte economica resta solo online.

## Dettagli tecnici
- Tabelle principali: students, courses, course_schedules, teachers, course_teachers, enrollments, lessons, lesson_staff (insegnanti/assistenti con ore), attendance, rates (valid_from/valid_to), fee_rules, fee_overrides, charges, payments, payment_allocations, gym_transfers, expenses, user_roles.
- Ruoli in tabella dedicata + funzione has_role; RLS per insegnante tramite course_teachers.
- Compensi e addebiti salvano la tariffa/regola usata al momento del calcolo (nessun ricalcolo silenzioso).
- Vincoli unici su (corso, data, orario) per le lezioni e (allieva, mese, tipo) per gli addebiti.
- Offline: IndexedDB + coda con UUID generati dal client per idempotenza; service worker con vite-plugin-pwa protetto in anteprima.
