"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import Switch from "@/components/dashboard/Switch";
import { createClient } from "@/lib/supabase/client";
import type { BusinessRow } from "@/lib/types";
import { BUSINESS_SETTINGS_COLUMNS, phone } from "@/components/dashboard/calls/shared";
import {
  DEFAULT_BOOKED_TEMPLATE,
  DEFAULT_FOLLOWUP_TEMPLATE,
  PLACEHOLDERS,
  PREVIEW_VALUES,
  TEMPLATE_MAX,
  renderTemplate,
  segments,
  toE164,
} from "@/lib/dispatcher/templates";

const input =
  "mt-2 w-full rounded-xl border border-white/15 bg-ink/60 px-3 py-2.5 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60";

type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; lines: BusinessRow[] };

export default function CallSettingsPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    createClient()
      .from("businesses")
      .select(BUSINESS_SETTINGS_COLUMNS)
      .order("created_at")
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setState({ kind: "error", message: error.message });
        else setState({ kind: "ready", lines: (data ?? []) as BusinessRow[] });
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <PageShell
      title="Call settings"
      summary="Who hears about each call, and the text Jessica sends the caller afterwards."
      action={
        <Link href="/dashboard/calls" className="rounded-full border border-white/15 px-4 py-2 text-[14px] text-fog transition-colors hover:bg-white/5">
          View calls
        </Link>
      }
    >
      {state.kind === "loading" && <p role="status" className="text-[15px] text-mist">Loading settings…</p>}
      {state.kind === "error" && (
        <p role="alert" className="text-[15px] text-[#ffc6bd]">Couldn&apos;t load your settings: {state.message}</p>
      )}
      {state.kind === "ready" && state.lines.length === 0 && (
        <div className="rounded-card border border-white/10 bg-panel/60 p-8">
          <p className="text-[19px] font-medium">Your line isn&apos;t connected yet</p>
          <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-mist">
            These settings appear once we&apos;ve set Jessica up for your shop. Questions: support@getnovaai.app
          </p>
        </div>
      )}
      {state.kind === "ready" && (
        <div className="space-y-12">
          {state.lines.map((b) => (
            <LineSettings key={b.id} business={b} showAgent={state.lines.length > 1} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function LineSettings({ business, showAgent }: { business: BusinessRow; showAgent: boolean }) {
  const [name, setName] = useState(business.name);
  const [ownerPhone, setOwnerPhone] = useState(business.owner_phone ? phone(business.owner_phone) : "");
  const [smsOn, setSmsOn] = useState(business.sms_enabled);
  const [email, setEmail] = useState(business.notify_email ?? "");
  const [emailOn, setEmailOn] = useState(business.email_enabled);
  const [callerOn, setCallerOn] = useState(business.caller_sms_enabled);
  const [booked, setBooked] = useState(business.caller_sms_booked_template || DEFAULT_BOOKED_TEMPLATE);
  const [followup, setFollowup] = useState(business.caller_sms_followup_template || DEFAULT_FOLLOWUP_TEMPLATE);
  const [link, setLink] = useState(business.followup_link);
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; text: string }>({
    kind: "idle",
  });

  const touch = () => status.kind !== "idle" && status.kind !== "saving" && setStatus({ kind: "idle" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fail = (text: string) => setStatus({ kind: "error", text });
    const e164 = ownerPhone.trim() ? toE164(ownerPhone) : "";
    if (ownerPhone.trim() && !e164) return fail("Enter your mobile number with area code, e.g. (512) 555-0100.");
    if (smsOn && !e164) return fail("Add your mobile number, or turn off texts to you.");
    const mail = email.trim();
    if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return fail("Enter a valid email address.");
    if (emailOn && !mail) return fail("Add your email address, or turn off emails to you.");
    if (!name.trim()) return fail("Enter your business name.");
    const url = link.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) return fail("The follow-up link must start with https://");
    for (const [label, t] of [["booking confirmation", booked], ["follow-up", followup]] as const) {
      if (t.length > TEMPLATE_MAX) return fail(`The ${label} text is over ${TEMPLATE_MAX} characters.`);
      if (callerOn && !t.trim()) return fail(`Write the ${label} text, or reset it to the default.`);
    }

    setStatus({ kind: "saving" });
    const { error } = await createClient()
      .from("businesses")
      .update({
        name: name.trim().slice(0, 80),
        owner_phone: e164 || null,
        sms_enabled: smsOn,
        notify_email: mail || null,
        email_enabled: emailOn,
        caller_sms_enabled: callerOn,
        // The defaults are stored as null, so they improve with future versions.
        caller_sms_booked_template: booked.trim() === DEFAULT_BOOKED_TEMPLATE ? null : booked.trim(),
        caller_sms_followup_template: followup.trim() === DEFAULT_FOLLOWUP_TEMPLATE ? null : followup.trim(),
        followup_link: url,
      })
      .eq("id", business.id);
    if (error) return fail(`Couldn't save: ${error.message}`);
    if (e164) setOwnerPhone(phone(e164));
    setStatus({ kind: "saved" });
  }

  const values = { ...PREVIEW_VALUES, business: name.trim() || "your business", link: link.trim() };

  return (
    <form onSubmit={save} onChange={touch} className="space-y-10" noValidate>
      {showAgent && <p className="text-[13px] text-mist">Line {business.retell_agent_id}</p>}

      <Section title="Your business" summary="The name Jessica uses in texts and emails.">
        <label className="block max-w-[28rem] text-[14px] text-mist">
          Business name
          <input className={input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
      </Section>

      <Section title="After every call, tell me" summary="You get the caller's details, Jessica's summary and a link to the recording.">
        <div className="grid gap-6 md:grid-cols-2">
          <Toggleable label="Text me" checked={smsOn} onToggle={() => { setSmsOn(!smsOn); touch(); }}>
            <label className="block text-[14px] text-mist">
              Mobile number
              <input className={input} type="tel" autoComplete="tel" placeholder="(512) 555-0100" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
            </label>
          </Toggleable>
          <Toggleable label="Email me" checked={emailOn} onToggle={() => { setEmailOn(!emailOn); touch(); }}>
            <label className="block text-[14px] text-mist">
              Email address
              <input className={input} type="email" autoComplete="email" placeholder="you@yourshop.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </Toggleable>
        </div>
      </Section>

      <Section
        title="Text the caller after the call"
        summary="A confirmation when Jessica books a job, or a follow-up when she takes a message. Callers can reply STOP at any time."
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-panel/60 p-4">
          <div>
            <p className="text-[15px] font-medium">Send texts to callers</p>
            <p className="mt-1 text-[13px] text-mist">
              Turn this on once your NovaAI number is registered for texting. Jessica tells callers they&apos;ll get a text.
            </p>
          </div>
          <Switch checked={callerOn} onChange={() => { setCallerOn(!callerOn); touch(); }} label="Send texts to callers" />
        </div>

        <div className={`mt-6 grid gap-8 lg:grid-cols-2 ${callerOn ? "" : "opacity-60"}`}>
          <TemplateEditor
            title="When a job is booked"
            value={booked}
            onChange={setBooked}
            fallback={DEFAULT_BOOKED_TEMPLATE}
            preview={renderTemplate(booked, values)}
          />
          <div>
            <TemplateEditor
              title="When Jessica takes a message"
              value={followup}
              onChange={setFollowup}
              fallback={DEFAULT_FOLLOWUP_TEMPLATE}
              preview={renderTemplate(followup, values)}
            />
            <label className="mt-4 block text-[14px] text-mist">
              Follow-up link <span className="text-ghost">({"{link}"}: booking page, website or review page)</span>
              <input className={input} type="url" inputMode="url" placeholder="https://yourshop.com/book" value={link} onChange={(e) => setLink(e.target.value)} />
            </label>
          </div>
        </div>

        <details className="mt-6 text-[14px] text-mist">
          <summary className="cursor-pointer text-fog">Fields you can use</summary>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {PLACEHOLDERS.map((p) => (
              <li key={p.key}>
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-[13px] text-fog">{`{${p.key}}`}</code> {p.label}
              </li>
            ))}
          </ul>
          <p className="mt-3">A line whose field is empty is left out, so put the time or the link on its own line.</p>
        </details>
      </Section>

      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
        <button
          type="submit"
          disabled={status.kind === "saving"}
          className="rounded-full bg-fog px-6 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-white disabled:opacity-60"
        >
          {status.kind === "saving" ? "Saving…" : "Save settings"}
        </button>
        <p aria-live="polite" className={`text-[14px] ${status.kind === "error" ? "text-[#ffc6bd]" : "text-mist"}`}>
          {status.kind === "saved" ? "Settings saved." : status.kind === "error" ? status.text : ""}
        </p>
      </div>
    </form>
  );
}

function Section({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[19px] font-medium">{title}</h2>
      <p className="mt-1 max-w-[62ch] text-[14px] text-mist">{summary}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggleable({
  label,
  checked,
  onToggle,
  children,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel/60 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-medium">{label}</p>
        <Switch checked={checked} onChange={onToggle} label={label} />
      </div>
      <div className={`mt-3 ${checked ? "" : "opacity-60"}`}>{children}</div>
    </div>
  );
}

function TemplateEditor({
  title,
  value,
  onChange,
  fallback,
  preview,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  fallback: string;
  preview: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const over = value.length > TEMPLATE_MAX;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`tpl-${title}`} className="text-[15px] font-medium">{title}</label>
        {value !== fallback && (
          <button type="button" onClick={() => onChange(fallback)} className="text-[13px] text-mist underline decoration-white/30 underline-offset-4 hover:text-fog">
            Reset to default
          </button>
        )}
      </div>
      <textarea
        id={`tpl-${title}`}
        ref={ref}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${input} resize-y font-[inherit] leading-relaxed ${over ? "border-[#ffb4a8]/60" : ""}`}
      />
      <p className={`mt-1 text-right text-[12px] ${over ? "text-[#ffc6bd]" : "text-ghost"}`}>
        {value.length}/{TEMPLATE_MAX}
      </p>
      <div className="mt-2 rounded-2xl bg-ink/60 p-3">
        <p className="text-[12px] text-mist">
          Preview · {preview.length} characters, {segments(preview)} SMS {segments(preview) === 1 ? "segment" : "segments"}
        </p>
        <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-fog">{preview || "Nothing would be sent."}</p>
      </div>
    </div>
  );
}
