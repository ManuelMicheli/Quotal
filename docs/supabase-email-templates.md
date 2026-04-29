# Supabase Email Templates — Quotal

The Supabase CLI does not (yet) provide migration support for the auth email
templates, so we keep the canonical Italian copy here and the operator
copy/pastes it into the dashboard.

**Where to paste:** Supabase Dashboard → Authentication → Email Templates

For each template:

1. Switch the language tag if needed (most accounts have a single template
   slot; we use Italian copy as the default).
2. Replace both the **Subject** and **Message body** fields.
3. Save.

The templates use the standard Supabase placeholders:
`{{ .Email }}`, `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`.

---

## 1. Confirm signup

**Subject:**

```
Conferma il tuo account Quotal
```

**Message body (HTML):**

```html
<h2 style="font-family: Georgia, serif; font-weight: normal;">Benvenuto in Quotal</h2>
<p>Ciao {{ .Email }},</p>
<p>
  Grazie per esserti iscritto. Per completare la registrazione, conferma il
  tuo indirizzo email cliccando sul pulsante qui sotto:
</p>
<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display: inline-block; padding: 10px 20px; background: #0A0A0A; color: #FAFAFA; text-decoration: none; border-radius: 6px;"
    >Conferma email</a
  >
</p>
<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p style="word-break: break-all;"><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
<p>Se non hai richiesto questa registrazione, ignora pure questa email.</p>
<p>— Il team Quotal</p>
```

---

## 2. Reset password

**Subject:**

```
Reimposta la tua password Quotal
```

**Message body (HTML):**

```html
<h2 style="font-family: Georgia, serif; font-weight: normal;">Reimposta la tua password</h2>
<p>Ciao {{ .Email }},</p>
<p>
  Hai richiesto di reimpostare la password del tuo account Quotal. Clicca sul
  pulsante qui sotto per scegliere una nuova password:
</p>
<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display: inline-block; padding: 10px 20px; background: #0A0A0A; color: #FAFAFA; text-decoration: none; border-radius: 6px;"
    >Reimposta la password</a
  >
</p>
<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p style="word-break: break-all;"><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
<p>
  Se non hai richiesto questa modifica, ignora pure questa email — la tua
  password resterà quella attuale.
</p>
<p>— Il team Quotal</p>
```

---

## 3. Magic link

> Used in Phase 09. Drop-in template for when we wire up passwordless login.

**Subject:**

```
Il tuo link di accesso a Quotal
```

**Message body (HTML):**

```html
<h2 style="font-family: Georgia, serif; font-weight: normal;">Accedi a Quotal</h2>
<p>Ciao {{ .Email }},</p>
<p>
  Clicca sul pulsante qui sotto per accedere al tuo account Quotal. Il link è
  valido per pochi minuti e può essere usato una sola volta.
</p>
<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display: inline-block; padding: 10px 20px; background: #0A0A0A; color: #FAFAFA; text-decoration: none; border-radius: 6px;"
    >Accedi</a
  >
</p>
<p>Se non hai richiesto questo link, ignora pure questa email.</p>
<p>— Il team Quotal</p>
```

---

## URL configuration

In Supabase Dashboard → Authentication → URL Configuration set:

- **Site URL:** `http://localhost:3000` (dev) or the production URL
- **Redirect URLs (allowlist):**
  - `http://localhost:3000/auth/callback`
  - `https://<your-prod-domain>/auth/callback`

The auth callback handler at `app/auth/callback/route.ts` exchanges the
`code` query parameter for a session and redirects to the appropriate
landing page.
