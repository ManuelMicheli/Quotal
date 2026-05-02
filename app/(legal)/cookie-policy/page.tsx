/**
 * Cookie policy.
 *
 * Quotal MVP usa esclusivamente cookie tecnici essenziali (sessione di
 * autenticazione, CSRF, preferenze utente). Non ci sono cookie analitici né
 * di profilazione: per questo motivo non è richiesto un banner di consenso
 * preventivo (cfr. Linee guida cookie del Garante del 10 giugno 2021,
 * paragrafo 4.1).
 */
import type { Metadata } from 'next'

import { LegalDocument } from '@/components/shared/legal-document'
import { LEGAL_CONFIG } from '@/lib/legal/config'

export const metadata: Metadata = {
  title: 'Cookie policy',
  description:
    'Informativa sui cookie utilizzati da Quotal: solo cookie tecnici essenziali, nessuna profilazione.',
}

const TOC = [
  { id: 'cosa-sono', label: 'Cosa sono i cookie' },
  { id: 'utilizzati', label: 'Quali cookie utilizziamo' },
  { id: 'disabilitare', label: 'Disabilitare i cookie' },
  { id: 'aggiornamenti', label: 'Aggiornamenti' },
  { id: 'contatti', label: 'Contatti' },
]

export default function CookiePolicyPage() {
  const updatedAt = new Date('2026-04-29').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <LegalDocument
      eyebrow="Cookie policy"
      title="Cookie policy"
      updatedAt={updatedAt}
      toc={TOC}
    >
      <p>
        La presente policy descrive l&apos;uso di cookie e tecnologie simili
        sul sito {LEGAL_CONFIG.app.url} ai sensi del Provvedimento del
        Garante per la protezione dei dati personali del 10 giugno 2021
        (&quot;Linee guida cookie&quot;) e degli artt. 13 GDPR e 122 del
        Codice Privacy.
      </p>

      <h2 id="cosa-sono">1. Cosa sono i cookie</h2>
      <p>
        I cookie sono piccoli file di testo che i siti visitati inviano al
        terminale dell&apos;utente, dove vengono memorizzati per essere
        ritrasmessi al sito alla visita successiva. Possono essere{' '}
        <strong>tecnici</strong> (necessari al funzionamento del servizio) o{' '}
        <strong>di profilazione</strong> (utilizzati a fini pubblicitari o di
        analisi statistica avanzata).
      </p>

      <h2 id="utilizzati">2. Quali cookie utilizziamo</h2>
      <p>
        Quotal utilizza <strong>esclusivamente cookie tecnici</strong>{' '}
        essenziali al funzionamento del servizio. Per questi cookie non è
        richiesto il consenso preventivo dell&apos;utente (art. 122 Codice
        Privacy). Non utilizziamo cookie di profilazione, di marketing né
        strumenti di analisi statistica avanzata che richiederebbero
        consenso.
      </p>

      <h3>Cookie tecnici utilizzati</h3>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Finalità</th>
            <th>Durata</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>sb-*-auth-token</code>
            </td>
            <td>Mantenere la sessione di accesso autenticata (Supabase).</td>
            <td>1 anno (rolling)</td>
            <td>Prima parte, HttpOnly</td>
          </tr>
          <tr>
            <td>
              <code>quotal-cookie-notice</code>
            </td>
            <td>
              Memorizzare l&apos;avvenuta visualizzazione dell&apos;avviso
              informativo sui cookie tecnici.
            </td>
            <td>1 anno</td>
            <td>Prima parte</td>
          </tr>
          <tr>
            <td>
              <code>__stripe_mid</code>, <code>__stripe_sid</code>
            </td>
            <td>
              Anti-frode su pagamenti carta (Stripe Payments Europe Ltd.).
              Settati solo durante la sessione di pagamento.
            </td>
            <td>fino a 1 anno</td>
            <td>Terza parte (Stripe)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="disabilitare">3. Disabilitare i cookie</h2>
      <p>
        L&apos;utente può disabilitare i cookie attraverso le impostazioni
        del proprio browser. Tuttavia, la disabilitazione dei cookie tecnici
        comporta il malfunzionamento dell&apos;applicazione (impossibilità
        di mantenere la sessione di accesso e di completare i pagamenti).
        Istruzioni per i principali browser:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie"
            target="_blank"
            rel="noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/it-it/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noreferrer"
          >
            Apple Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/it-it/microsoft-edge"
            target="_blank"
            rel="noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2 id="aggiornamenti">4. Aggiornamenti</h2>
      <p>
        Qualora venissero introdotti cookie di terze parti che richiedono
        consenso (es. strumenti analitici), questa pagina sarà aggiornata e
        verrà mostrato un banner di consenso conforme alle linee guida del
        Garante.
      </p>

      <h2 id="contatti">5. Contatti</h2>
      <p>
        Per ulteriori informazioni sulla protezione dei dati e sui cookie:{' '}
        <a href={`mailto:${LEGAL_CONFIG.data_controller.email}`}>
          {LEGAL_CONFIG.data_controller.email}
        </a>
        . Si rimanda altresì all&apos;
        <a href="/privacy">informativa privacy</a>.
      </p>
    </LegalDocument>
  )
}
