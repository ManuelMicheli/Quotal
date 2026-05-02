/**
 * Termini di servizio.
 *
 * Quotal opera come piattaforma SaaS B2B verso le palestre. Il rapporto
 * contrattuale per il singolo abbonamento è tra il membro e la palestra
 * (la palestra resta titolare del trattamento dei dati dei propri membri).
 * Quotal di Manuel Micheli è fornitore tecnico (responsabile esterno del
 * trattamento ex art. 28 GDPR per conto della palestra cliente).
 *
 * Bozza redatta ai sensi del Codice del Consumo (D.Lgs. 206/2005) e del
 * D.Lgs. 70/2003 sul commercio elettronico.
 */
import type { Metadata } from 'next'

import { LegalDocument } from '@/components/shared/legal-document'
import { LEGAL_CONFIG } from '@/lib/legal/config'

export const metadata: Metadata = {
  title: 'Termini e condizioni',
  description:
    'Termini e condizioni di utilizzo della piattaforma Quotal per la gestione degli abbonamenti palestra.',
}

const TOC = [
  { id: 'definizioni', label: 'Definizioni' },
  { id: 'oggetto', label: 'Oggetto del servizio' },
  { id: 'registrazione', label: 'Registrazione e account' },
  { id: 'pagamenti', label: 'Pagamenti' },
  { id: 'ripensamento', label: 'Diritto di ripensamento' },
  { id: 'uso', label: 'Uso accettabile' },
  { id: 'disponibilita', label: 'Disponibilità del servizio' },
  { id: 'responsabilita', label: 'Limitazione di responsabilità' },
  { id: 'modifiche', label: 'Modifiche dei Termini' },
  { id: 'foro', label: 'Legge applicabile e foro' },
  { id: 'odr', label: 'Risoluzione delle controversie' },
  { id: 'contatti', label: 'Contatti' },
]

export default function TerminiPage() {
  const updatedAt = new Date('2026-04-29').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const c = LEGAL_CONFIG.company

  return (
    <LegalDocument
      eyebrow="Termini di servizio"
      title="Termini e condizioni di utilizzo"
      updatedAt={updatedAt}
      toc={TOC}
    >
      <h2 id="definizioni">1. Definizioni</h2>
      <ul>
        <li>
          <strong>Quotal</strong>: la piattaforma software accessibile da{' '}
          {LEGAL_CONFIG.app.url}, gestita da {c.name} (P.IVA {c.vat_number}),
          di seguito anche &quot;il Fornitore&quot;.
        </li>
        <li>
          <strong>Palestra</strong>: il soggetto che, in qualità di cliente
          B2B, utilizza Quotal per gestire i propri membri.
        </li>
        <li>
          <strong>Membro</strong>: la persona fisica iscritta a una Palestra
          che utilizza Quotal per consultare il proprio abbonamento, pagare e
          accedere ai locali.
        </li>
      </ul>

      <h2 id="oggetto">2. Oggetto del servizio</h2>
      <p>
        Quotal è una piattaforma SaaS che consente alla Palestra di gestire
        anagrafica membri, piani di abbonamento, pagamenti, ricevute,
        notifiche e accessi. Il Membro accede ad un&apos;area riservata per
        consultare il proprio stato, ricevere comunicazioni e mostrare il QR
        di accesso.
      </p>
      <p>
        Il rapporto contrattuale relativo all&apos;abbonamento (corrispettivo,
        durata, regole della palestra) intercorre direttamente fra Membro e
        Palestra. Il Fornitore agisce esclusivamente come fornitore tecnico
        della Palestra.
      </p>

      <h2 id="registrazione">3. Registrazione e account</h2>
      <p>
        La registrazione richiede la fornitura dei dati anagrafici corretti e
        l&apos;accettazione della presente informativa e della{' '}
        <a href="/privacy">Privacy Policy</a>. Il Membro è responsabile della
        custodia delle credenziali di accesso e si impegna a comunicare
        tempestivamente alla Palestra ogni accesso non autorizzato.
      </p>

      <h2 id="pagamenti">4. Pagamenti</h2>
      <p>
        I pagamenti online sono processati da Stripe Payments Europe Ltd.
        Quotal non conserva dati completi di carta o IBAN. Le ricevute sono
        emesse dalla Palestra e disponibili in formato PDF nell&apos;area
        riservata.
      </p>
      <p>
        Per gli addebiti SEPA il Membro autorizza un mandato a favore della
        Palestra; il mandato può essere revocato in qualsiasi momento secondo
        la normativa SEPA.
      </p>

      <h2 id="ripensamento">5. Diritto di ripensamento</h2>
      <p>
        Ai sensi dell&apos;art. 59 del Codice del Consumo, il diritto di
        recesso non si applica ai contratti di prestazione di servizi
        completamente eseguiti durante il periodo di recesso quando il
        Consumatore abbia espressamente richiesto l&apos;inizio
        dell&apos;esecuzione (es. accesso immediato ai locali della Palestra).
      </p>
      <p>
        Diritti diversi specifici della singola Palestra (es. politica di
        rimborso quote) sono disciplinati direttamente dal regolamento della
        Palestra.
      </p>

      <h2 id="uso">6. Uso accettabile</h2>
      <p>Il Membro si impegna a:</p>
      <ul>
        <li>non condividere il proprio QR di accesso con terzi;</li>
        <li>
          non accedere o tentare di accedere a dati di altri membri o sezioni
          riservate alla Palestra;
        </li>
        <li>
          non utilizzare il servizio per attività illecite o lesive di
          diritti di terzi;
        </li>
        <li>
          non interferire con il funzionamento del servizio (es. tentativi di
          intrusione, scraping massivo, attacchi di forza bruta).
        </li>
      </ul>

      <h2 id="disponibilita">7. Disponibilità del servizio e manutenzione</h2>
      <p>
        Il Fornitore si impegna a garantire la disponibilità del servizio
        secondo i migliori standard di mercato (best effort), senza tuttavia
        poter offrire garanzia assoluta di assenza di interruzioni.
        Interventi di manutenzione programmata saranno preavvisati ove
        possibile.
      </p>

      <h2 id="responsabilita">8. Limitazione di responsabilità</h2>
      <p>
        Nei limiti consentiti dalla legge, il Fornitore non risponde di danni
        indiretti, perdita di dati o di profitto derivanti dall&apos;utilizzo
        del servizio. Resta ferma la responsabilità della Palestra nei
        confronti del Membro per il rapporto associativo.
      </p>

      <h2 id="modifiche">9. Modifiche dei Termini</h2>
      <p>
        Il Fornitore può modificare i presenti Termini per adeguamenti
        normativi o di servizio. Le modifiche saranno comunicate via email
        e/o all&apos;interno dell&apos;applicazione almeno 30 giorni prima
        dell&apos;entrata in vigore. Il proseguimento dell&apos;utilizzo
        equivale ad accettazione.
      </p>

      <h2 id="foro">10. Legge applicabile e foro competente</h2>
      <p>
        I presenti Termini sono regolati dalla legge italiana. Per le
        controversie con consumatori si applica il foro di residenza o
        domicilio del Consumatore, ai sensi dell&apos;art. 66-bis del Codice
        del Consumo. Per ogni altra controversia è competente in via
        esclusiva il Foro di {c.headquarters.city}.
      </p>

      <h2 id="odr">11. Risoluzione alternativa delle controversie (ODR)</h2>
      <p>
        Ai sensi dell&apos;art. 14 del Reg. UE 524/2013, è disponibile la
        piattaforma europea per la risoluzione delle controversie online
        all&apos;indirizzo{' '}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noreferrer"
        >
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      <h2 id="contatti">12. Contatti</h2>
      <p>
        Per qualsiasi richiesta è possibile scrivere a{' '}
        <a href={`mailto:${LEGAL_CONFIG.app.support_email}`}>
          {LEGAL_CONFIG.app.support_email}
        </a>
        .
      </p>
    </LegalDocument>
  )
}
