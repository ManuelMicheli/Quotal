/**
 * Privacy Policy ai sensi del Reg. UE 2016/679 (GDPR) e del D.Lgs. 196/2003.
 *
 * Bozza redatta sulla base dei dati realmente trattati da Quotal (vedi
 * `lib/queries/*` per la mappa dei dati). Prima della messa in produzione,
 * il titolare deve revisionare i campi marcati come placeholder in
 * `lib/legal/config.ts` (P.IVA, sede legale, REA, PEC, ecc.).
 */
import type { Metadata } from 'next'

import { LEGAL_CONFIG } from '@/lib/legal/config'

export const metadata: Metadata = {
  title: 'Informativa sulla privacy',
  description:
    'Come Quotal raccoglie, utilizza e protegge i dati personali ai sensi del GDPR.',
}

export default function PrivacyPage() {
  const updatedAt = new Date('2026-04-29').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const c = LEGAL_CONFIG.company
  const dpc = LEGAL_CONFIG.data_controller
  const addr = c.headquarters

  return (
    <>
      <h1>Informativa sulla privacy</h1>
      <p className="text-sm text-muted-foreground">
        Ultimo aggiornamento: {updatedAt}
      </p>

      <p>
        La presente informativa è resa ai sensi dell&apos;art. 13 del
        Regolamento (UE) 2016/679 (&quot;GDPR&quot;) e del D.Lgs. 196/2003
        come modificato dal D.Lgs. 101/2018, a chi utilizza la piattaforma{' '}
        <strong>Quotal</strong> per gestire la propria iscrizione a una
        palestra.
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>
        Il <strong>Titolare del trattamento</strong> è {c.name} (
        {c.legal_form}), con sede in {addr.address}, {addr.postal_code}{' '}
        {addr.city} ({addr.province}), P.IVA {c.vat_number}
        {c.fiscal_code ? `, C.F. ${c.fiscal_code}` : ''}.
      </p>
      <p>
        Per qualsiasi richiesta in materia di protezione dei dati è possibile
        contattare {dpc.name} (
        {dpc.role}) all&apos;indirizzo{' '}
        <a href={`mailto:${dpc.email}`}>{dpc.email}</a>.
      </p>
      {LEGAL_CONFIG.dpo ? (
        <p>
          È stato nominato un Responsabile della Protezione dei Dati (DPO):{' '}
          {LEGAL_CONFIG.dpo.name},{' '}
          <a href={`mailto:${LEGAL_CONFIG.dpo.email}`}>
            {LEGAL_CONFIG.dpo.email}
          </a>
          .
        </p>
      ) : (
        <p>
          Non è stato nominato un Responsabile della Protezione dei Dati (DPO),
          non sussistendone l&apos;obbligo ai sensi dell&apos;art. 37 GDPR.
        </p>
      )}

      <h2>2. Categorie di dati trattati</h2>
      <ul>
        <li>
          <strong>Dati identificativi e di contatto:</strong> nome, cognome,
          email, telefono, data di nascita, indirizzo di residenza, codice
          fiscale (se necessario per fattura).
        </li>
        <li>
          <strong>Dati di abbonamento e pagamento:</strong> piano sottoscritto,
          data inizio/fine, importi, metodo di pagamento, IBAN ultime 4 cifre
          per addebiti SEPA, ID transazione Stripe. <em>Non conserviamo</em> i
          dati completi della carta di credito né l&apos;IBAN per esteso: tali
          dati sono gestiti direttamente da Stripe Payments Europe Ltd.
        </li>
        <li>
          <strong>Dati di accesso ai locali:</strong> data e ora degli ingressi
          rilevati dal QR personale, esito (consentito/negato), motivo
          dell&apos;eventuale rifiuto.
        </li>
        <li>
          <strong>Dati tecnici:</strong> indirizzo IP, identificatori di
          sessione, log degli errori, user-agent del browser. Solo cookie
          tecnici essenziali al funzionamento del servizio.
        </li>
        <li>
          <strong>Comunicazioni:</strong> email transazionali (ricevute,
          promemoria scadenza), notifiche push opzionali.
        </li>
      </ul>

      <h2>3. Finalità e basi giuridiche</h2>
      <ol>
        <li>
          <strong>Esecuzione del contratto</strong> di tesseramento e
          fornitura del servizio (art. 6.1.b GDPR): registrazione, gestione
          abbonamento, ingressi, ricevute, comunicazioni transazionali.
        </li>
        <li>
          <strong>Adempimento obblighi di legge</strong> (art. 6.1.c GDPR):
          conservazione dati fiscali per 10 anni ai sensi dell&apos;art. 2220
          c.c., emissione ricevute/fatture.
        </li>
        <li>
          <strong>Legittimo interesse</strong> (art. 6.1.f GDPR): sicurezza
          dell&apos;applicazione (rate limiting, log accessi anomali),
          prevenzione frodi sui pagamenti.
        </li>
        <li>
          <strong>Consenso</strong> (art. 6.1.a GDPR): notifiche push,
          comunicazioni opzionali. Il consenso è sempre revocabile dalle
          impostazioni del proprio profilo.
        </li>
      </ol>

      <h2>4. Modalità del trattamento</h2>
      <p>
        I dati sono trattati con strumenti elettronici, conservati su server
        gestiti da provider che garantiscono adeguate misure tecniche e
        organizzative (Supabase / AWS Frankfurt — UE; Vercel Inc. con
        Standard Contractual Clauses; Stripe Payments Europe Ltd. — Irlanda;
        Resend Inc. con Standard Contractual Clauses).
      </p>
      <p>
        Le password sono cifrate (bcrypt) e mai visibili al titolare.
        Comunicazioni cifrate in transito (TLS 1.2+) e a riposo (AES-256).
      </p>

      <h2>5. Periodo di conservazione</h2>
      <ul>
        <li>
          <strong>Dati anagrafici e di contatto:</strong> per tutta la durata
          del rapporto contrattuale e fino a 24 mesi dalla cessazione,
          successivamente cancellati o anonimizzati.
        </li>
        <li>
          <strong>Dati di pagamento e fiscali:</strong>{' '}
          <strong>10 anni</strong> dalla data di emissione del documento ai
          sensi dell&apos;art. 2220 c.c.
        </li>
        <li>
          <strong>Log di accesso ai locali:</strong> 24 mesi.
        </li>
        <li>
          <strong>Log tecnici / errori:</strong> 90 giorni.
        </li>
      </ul>

      <h2>6. Comunicazione e diffusione dei dati</h2>
      <p>
        I dati non sono diffusi né ceduti a terzi per finalità commerciali.
        Vengono comunicati esclusivamente a:
      </p>
      <ul>
        <li>
          dipendenti/collaboratori del Titolare autorizzati al trattamento;
        </li>
        <li>
          fornitori di servizi designati come Responsabili del trattamento ai
          sensi dell&apos;art. 28 GDPR (hosting, gestione pagamenti, invio
          email);
        </li>
        <li>
          Autorità giudiziarie e di controllo, su richiesta legittima.
        </li>
      </ul>

      <h2>7. Diritti dell&apos;interessato</h2>
      <p>
        In ogni momento è possibile esercitare i diritti previsti dagli artt.
        15-22 GDPR:
      </p>
      <ul>
        <li>accesso ai propri dati (art. 15);</li>
        <li>rettifica (art. 16);</li>
        <li>
          cancellazione / &quot;diritto all&apos;oblio&quot; (art. 17), nei
          limiti previsti dagli obblighi di conservazione fiscale;
        </li>
        <li>limitazione del trattamento (art. 18);</li>
        <li>portabilità dei dati in formato strutturato (art. 20);</li>
        <li>opposizione (art. 21);</li>
        <li>revoca del consenso in qualsiasi momento.</li>
      </ul>
      <p>
        L&apos;esportazione e la richiesta di cancellazione dei dati sono
        disponibili in autonomia dalla sezione <em>Privacy</em> del proprio
        profilo. In alternativa è possibile scrivere a{' '}
        <a href={`mailto:${dpc.email}`}>{dpc.email}</a>: la risposta arriverà
        entro 30 giorni.
      </p>
      <p>
        È sempre possibile proporre reclamo al{' '}
        <a
          href="https://www.garanteprivacy.it/"
          target="_blank"
          rel="noreferrer"
        >
          Garante per la protezione dei dati personali
        </a>{' '}
        (art. 77 GDPR).
      </p>

      <h2>8. Trasferimento dati extra UE</h2>
      <p>
        Alcuni fornitori (Vercel Inc., Resend Inc.) hanno sede negli Stati
        Uniti d&apos;America. Il trasferimento avviene sulla base delle
        Clausole Contrattuali Standard approvate dalla Commissione Europea
        (decisione 2021/914) e/o di certificazioni Data Privacy Framework, a
        garanzia di un livello di protezione adeguato.
      </p>

      <h2>9. Conferimento dei dati e conseguenze del rifiuto</h2>
      <p>
        Il conferimento dei dati indicati in fase di registrazione è
        necessario per fruire del servizio: il rifiuto comporta
        l&apos;impossibilità di sottoscrivere e mantenere
        l&apos;abbonamento. Il conferimento di dati come la data di nascita o
        il codice fiscale è obbligatorio solo se richiesto dalla normativa
        fiscale per emissione fattura.
      </p>

      <h2>10. Modifiche alla presente informativa</h2>
      <p>
        La presente informativa può essere aggiornata: ogni modifica
        sostanziale verrà notificata via email e in app.
      </p>
    </>
  )
}
