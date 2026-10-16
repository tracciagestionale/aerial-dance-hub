# Aerial Dance Hub

Voglio sviluppare Materi_ali, una web app gestionale per una scuola di danza aerea con corsi per bambine, adolescenti e adulti.

L’app deve gestire allieve, corsi, insegnanti, lezioni, presenze, compensi, quote mensili e pagamenti. Deve essere semplice da usare dal telefono, anche durante una lezione e in condizioni di connessione instabile.

La responsabile è Arianna Dell’Orfano. Le insegnanti utilizzano un’interfaccia essenziale per i propri corsi; Arianna dispone della gestione completa e della parte economica.

1. Obiettivo e struttura
L’app deve permettere di:
- iscrivere e aggiornare le allieve;
- organizzare corsi, insegnanti e calendario;
- registrare lezioni, presenze, sostituzioni e assistenze;
- calcolare i compensi in base al lavoro effettivamente svolto;
- generare le quote mensili dovute;
- registrare e riconciliare i pagamenti;
- calcolare la ripartizione economica con la palestra;
- consultare riepiloghi, anomalie e previsioni;
- lavorare offline nelle attività operative e sincronizzare successivamente.

Il precedente gestionale usa Google Sheets, Google Forms e Apps Script. La nuova app deve essere autonoma: i fogli esistenti sono un’eventuale fonte di importazione, non una dipendenza necessaria al funzionamento quotidiano.

2. Ruoli e accesso
Responsabile — Owner (Arianna):
- vedere e modificare tutti i corsi;
- gestire insegnanti e assegnazioni;
- gestire tutte le allieve e le iscrizioni;
- consultare e correggere lezioni e presenze;
- gestire tariffe, quote, pagamenti e spese;
- vedere compensi, ripartizioni e report;
- importare ed esportare dati;
- gestire gli accessi delle insegnanti.

Insegnante — Teacher:
Ogni insegnante accede con un account personale e può:
- vedere i corsi ai quali è assegnata;
- consultare le rispettive allieve;
- inserire nuove allieve nei corsi autorizzati;
- registrare e correggere le presenze delle lezioni autorizzate;
- segnalare la partecipazione di un’allieva alle gare;
- registrare sostituzioni o assistenze secondo le autorizzazioni previste;
- inserire un pagamento nel caso in cui lo riceva direttamente (mentre Arianna vede la situazione complessiva ed allieva per allieva).

Non può vedere la contabilità generale, i dati degli altri corsi o lo storico non autorizzato.
I permessi devono essere applicati anche nel database e nelle API. Nascondere una pagina nell’interfaccia non è sufficiente.
Non prevedere, in questa versione, un portale per allieve o genitori.

3. Corsi e organizzazione iniziale
La configurazione deve essere modificabile dall’app, senza intervenire nel codice.
Organizzazione di riferimento:
- Kids 1: Martedì e giovedì | Ida Nasto | 2 ore
- Kids 2: Lunedì | Francesca Longobardi | 2 ore
- Kids 2: Mercoledì | Filena Gentile | 2 ore
- Junior: Lunedì | Francesca Longobardi | 2 ore
- Junior: Mercoledì | Filena Gentile | 2 ore
- Adulti: Lunedì e mercoledì | Antonella Summa | 2 ore
- Preparazione gare: Venerdì | Arianna Dell’Orfano e/o Irene Catuogno | 2 ore

4. Anagrafiche e iscrizioni
Ogni allieva deve avere un identificativo interno stabile generato automaticamente.
Campi: nome, cognome, data di nascita, email, telefono dell’allieva (quando pertinente), telefono genitore 1, telefono genitore 2 (facoltativo), stato attiva/inattiva, eventuali note operative, indicazione “Partecipa alle gare”.
Nell’inserimento iniziale rendere obbligatori soltanto i dati indispensabili: nome, cognome e corso di iscrizione. Gli altri dati possono essere completati successivamente.
Separare l’anagrafica dalle iscrizioni: una stessa persona può frequentare un corso ordinario e Preparazione gare senza avere due anagrafiche.
Le liste devono essere ordinate alfabeticamente, ricercabili e filtrabili per corso e stato.
Quando viene inserita un’allieva, deve comparire nelle liste e nel registro del corso senza operazioni manuali di aggiornamento.
Duplicati e disattivazione: segnalare possibili duplicati usando i dati disponibili, senza bloccare automaticamente persone omonime. La disattivazione deve preservare presenze, iscrizioni storiche e movimenti economici. Gli identificativi non devono essere riciclati. Procedura controllata per risoluzione doppioni con dati collegati.

5. Lezioni e presenze delle allieve
Flusso principale per un’insegnante:
- accede;
- vede i propri corsi e le lezioni del giorno;
- apre la lezione;
- trova l’elenco delle allieve;
- registra le presenze;
- conferma e vede l’esito del salvataggio.
Se ha un solo corso disponibile, evitare una selezione superflua.
Distinguere chiaramente: presenza, assenza, presenza non ancora registrata (una casella non compilata non deve diventare automaticamente un’assenza).
Ogni lezione deve conservare: corso, data e orario, durata effettiva, stato svolta o annullata, insegnanti effettivamente presenti, eventuali sostituzioni, assistenti e ore svolte, presenze delle allieve.
Consentire di consultare date passate e correggere il registro nei limiti dei permessi. Evitare lezioni duplicate.
Registro desktop: vista a griglia (registro scolastico: allieve sulle righe, date sulle colonne, simboli chiari, filtri per corso e mese). Su mobile elenco semplice per la singola lezione con comandi grandi touch.

6. Sostituzioni e assistente Paola
Distinguere l’insegnante prevista dall’insegnante che ha effettivamente svolto la lezione. I compensi devono seguire il lavoro effettivo, evitando doppi conteggi.
Nel registro delle lezioni di Antonella deve esserci una sezione per Paola:
- Paola presente: sì/no;
- durata dell’assistenza: 1 ora oppure tutta la lezione (normalmente 2 ore);
- ore effettive chiaramente visualizzate.
La presenza di Paola è una prestazione lavorativa dell’assistente, distinta dalla presenza delle allieve.

7. Compensi delle insegnanti
Tariffe orarie iniziali:
- Francesca Longobardi: 15 €
- Filena Gentile: 20 €
- Ida Nasto: 15 €
- Antonella Summa: 20 €
- Irene Catuogno: 25 €
- Paola: 15 €
Tariffe modificabili con validità temporale. Cambiare tariffa non deve ricalcolare silenziosamente compensi storici.
Compenso = ore effettivamente svolte × tariffa applicabile.
Per Arianna, l'attività didattica rientra nel suo risultato economico: nessun compenso orario automatico.
È Arianna a pagare le insegnanti e le paga attingendo dalla sua quota del 70%.
Riepilogo mensile per la responsabile con ore, date, corsi, compensi maturati e pagamenti dei compensi.

8. Quote mensili e addebiti
Configurazione iniziale:
- quota ordinaria: 80 € / mese;
- supplemento gare: 40 € / mese;
- totale ordinario per chi partecipa anche alle gare: 120 €.
Regole generali, quote personalizzate per allieva, modifiche valide per un solo mese con decorrenze e scadenze.
Precedenza: modifica specifica del mese > impostazione individuale valida > regola generale valida.
Il supplemento gare non deve essere duplicato se iscritta anche a Preparazione gare.
Gli addebiti conservano mese di competenza, importo e regola usata. Generazione ripetuta non deve creare duplicati.
Distinguere addebito (dovuto), pagamento (ricevuto) e residuo.

9. Pagamenti e riconciliazione
Le allieve pagano sul conto della palestra, ma delle volte pagano direttamente Arianna o le insegnanti.
Inserire una sezione pagamenti dove Arianna vede tutta la situazione allieva per allieva e inserisce pagamenti ricevuti. Le insegnanti possono registrare pagamenti che ricevono direttamente a mano.
Registrazione pagamenti con data, importo, metodo e riferimento, abbinamento a quote, gestione acconti/parziali, importi non attribuiti, quote saldate e residui.
Importazione bonifici con anteprima e controllo duplicati, suggerimenti di associazione intelligenti e conferma manuale in caso di ambiguità.
Distinguere pagamento dell'allieva dal bonifico/trasferimento della palestra ad Arianna.

10. Ripartizione palestra e risultato economico
30% alla palestra; 70% ad Arianna/Materi_ali.
I compensi delle insegnanti vengono detratti dalla quota del 70%. La ripartizione avviene prima di detrarre i compensi.
Esempio: su 1.000 € incassati soggetti a ripartizione:
- palestra: 300 €
- quota Materi_ali: 700 €
- compensi insegnanti: 200 €
- risultato Materi_ali prima di altre spese: 500 €
Anche il supplemento gare segue il 30/70.
Possibilità di escludere singole allieve dalla ripartizione (100% ad Arianna).
Distinguere quota palestra, quota Materi_ali, compensi sostenuti, compensi pagati, trasferimenti ricevuti da Arianna e saldo da trasferire. Separare valori attesi da incassi effettivi.

11. Dashboard della responsabile
Allieve attive uniche, iscrizioni per corso, lezioni/ore lavorate, quote dovute, incassi effettivi, residui, compensi insegnanti, altre spese, quota palestra, risultato economico Materi_ali, saldo trasferimenti palestra-Arianna, ricavi/costi per corso.
Proiezione a 2 mesi etichettata come previsione. Dettaglio drill-down dei totali. Alert per presenze incomplete, duplicati, quote scadute, pagamenti da attribuire.

12. Funzionamento offline PWA
PWA installabile su smartphone con Service Worker per rendere disponibile offline l'interfaccia.
IndexedDB per conservare dati operativi e modifiche in attesa di sincronizzazione.
Anche senza rete deve essere possibile: consultare corsi e allieve, inserire nuove allieve, registrare lezioni, presenze, sostituzioni e ore assistente, chiudere e riaprire l'app senza perdere le operazioni in attesa.
La sincronizzazione deve partire quando l'app è aperta e torna la connessione, o alla riapertura, con pulsante manuale per riprovare (senza dipendere da background sync su iOS).
Stati chiari: “Salvato sul dispositivo”, “Da sincronizzare”, “Sincronizzato”, “Errore”.
Richiedere storage persistente (navigator.storage.persist()) dove supportato e segnalare problemi di spazio.
Idempotenza, conservazione dipendenze, gestione conflitti senza sovrascritture. Parte economica online-first.

13. Design e navigazione
Design sobrio, moderno e leggibile per scuola di danza aerea.
Schede a card: desktop con sezioni richiudibili e indice laterale; mobile a colonna singola con action bar in basso (Salva / Annulla).
Palette: anagrafiche azzurro, presenze verde, economico arancio/beige, avvisi rosa/rosso, impostazioni grigio/lilla.
Navigazione Arianna: Panoramica, Allieve, Corsi, Calendario/Presenze, Insegnanti, Economico, Impostazioni.
Insegnanti: navigazione ridotta ai soli corsi e allieve assegnati.
Interfaccia in italiano, date italiane, valuta Euro (€), fuso Europe/Rome.

14. Importazione e dati demo
Strumento di importazione dal vecchio gestionale Google Sheets/CSV con mappatura colonne, anteprima, controllo duplicati e riepilogo.
Utilizzare dati dimostrativi realistici e chiaramente identificati come demo. Ruoli e permessi sicuri.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c161a6af-e990-4199-87ee-d5967816ff00).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
