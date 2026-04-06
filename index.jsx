import { useState } from "react";
 
// ─── PROMPT SYSTEM ────────────────────────────────────────────────────────────
 
const BRAND_VOICES = {
  "Authority": "Write with commanding expertise. Use data, cite trends, make bold declarative statements. Tone: confident, direct, no fluff. The agency sounds like the smartest person in the room.",
  "Conversational": "Write like a trusted industry friend. Use contractions, short sentences, occasional questions to the reader. Tone: warm, approachable, relatable. Zero corporate speak.",
  "Bold & Edgy": "Challenge conventions. Open with a contrarian take. Use provocative hooks. Don't hedge. Tone: disruptive, fearless, sharp. The agency has opinions and isn't afraid to share them.",
  "Educational": "Break complex marketing concepts into clear, digestible steps. Use numbered lists, examples, and analogies. Tone: patient, thorough, helpful. The agency is a great teacher.",
};
 
const ARTICLE_TYPES = {
  "SEO Deep-Dive": {
    desc: "1,500-word pillar article targeting a high-volume keyword",
    structure: "Hook → Problem framing → 5 detailed sections with H2s → Practical takeaways → CTA",
  },
  "Thought Leadership": {
    desc: "Opinion piece positioning the agency as an industry voice",
    structure: "Bold opening claim → Supporting argument × 3 → Industry trend tie-in → Forward-looking close",
  },
  "How-To Guide": {
    desc: "Step-by-step tactical guide clients can implement immediately",
    structure: "Problem → Why this matters → 7 actionable steps → Common mistakes → Result they can expect",
  },
  "Case Study Story": {
    desc: "Narrative case study showing client transformation",
    structure: "Before state → The challenge → The approach → The results (with numbers) → What this means for you",
  },
};
 
// ─── MASTER PROMPT BUILDER ────────────────────────────────────────────────────
 
function buildPrompt({ agencyName, agencySpecialty, targetAudience, topic, keyword, brandVoice, articleType }) {
  const voice = BRAND_VOICES[brandVoice];
  const type = ARTICLE_TYPES[articleType];
 
  return `You are a senior content strategist writing for ${agencyName}, a marketing agency specializing in ${agencySpecialty}.
 
BRAND VOICE: ${voice}
 
TARGET AUDIENCE: ${targetAudience} — these are the people reading this article. Write directly to them. Understand their pain points, their jargon, their goals.
 
ARTICLE TYPE: ${articleType}
Description: ${type.desc}
Structure to follow: ${type.structure}
 
TOPIC: ${topic}
PRIMARY KEYWORD: "${keyword}" — include naturally 4–6 times. Never keyword-stuff.
 
─── DELIVERABLE FORMAT ───
 
Produce the following complete package. Use these exact headers:
 
## ARTICLE TITLE
(Write 3 title options. Mark the strongest with ★)
 
## META DESCRIPTION
(155 characters max. Include keyword. Compelling enough to earn the click.)
 
## FULL ARTICLE
(Write the complete article following the structure above. Minimum 1,400 words. Use H2 and H3 subheadings. Open with a hook that stops the scroll. Close with a clear CTA relevant to ${agencyName}.)
 
## 5 SOCIAL POSTS
(One for each platform: LinkedIn, Twitter/X, Instagram caption, Facebook, and a short-form TikTok/Reels hook. Each must stand alone. Do not just copy the article intro.)
 
## EMAIL NEWSLETTER SUMMARY
(150–200 words. Written as if the agency is emailing their list. Warm, personal opener. Tease the article's value. End with a link placeholder: [READ THE FULL ARTICLE →])
 
─── QUALITY RULES ───
- No filler phrases: "In today's digital landscape", "In conclusion", "It's important to note"
- No passive voice more than once per section
- Every section must deliver one concrete, actionable insight
- The article must make ${agencyName} look like the definitive expert on this topic`;
}
 
// ─── COMPONENT ────────────────────────────────────────────────────────────────
 
const STEPS = ["Agency Profile", "Article Setup", "Generate"];
 
export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
 
  const [form, setForm] = useState({
    agencyName: "",
    agencySpecialty: "",
    targetAudience: "",
    topic: "",
    keyword: "",
    brandVoice: "Authority",
    articleType: "SEO Deep-Dive",
  });
 
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
 
  const canNext = () => {
    if (step === 0) return form.agencyName && form.agencySpecialty && form.targetAudience;
    if (step === 1) return form.topic && form.keyword;
    return true;
  };
 
  const generate = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    setActiveSection(null);
    try {
      const prompt = buildPrompt(form);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.find(b => b.type === "text")?.text || "";
      setOutput(parseOutput(text));
    } catch (e) {
      setError(e.message || "Generation failed. Check your API key.");
    } finally {
      setLoading(false);
    }
  };
 
  const parseOutput = (raw) => {
    const sections = {};
    const markers = [
      { key: "titles", label: "ARTICLE TITLE" },
      { key: "meta", label: "META DESCRIPTION" },
      { key: "article", label: "FULL ARTICLE" },
      { key: "social", label: "5 SOCIAL POSTS" },
      { key: "email", label: "EMAIL NEWSLETTER SUMMARY" },
    ];
    for (let i = 0; i < markers.length; i++) {
      const start = raw.indexOf(`## ${markers[i].label}`);
      const end = i + 1 < markers.length ? raw.indexOf(`## ${markers[i + 1].label}`) : raw.length;
      if (start !== -1) {
        sections[markers[i].key] = raw.slice(start + markers[i].label.length + 4, end).trim();
      }
    }
    sections.raw = raw;
    return sections;
  };
 
  const copyAll = () => {
    navigator.clipboard.writeText(output?.raw || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  const sectionLabels = [
    { key: "titles", icon: "◈", label: "Titles" },
    { key: "meta", icon: "◉", label: "Meta" },
    { key: "article", icon: "▤", label: "Article" },
    { key: "social", icon: "◎", label: "Social" },
    { key: "email", icon: "◻", label: "Email" },
  ];
 
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F5F2EB",
      fontFamily: "'DM Serif Display', Georgia, serif",
      color: "#1a1a1a",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
        input, textarea, select {
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          background: #fff;
          border: 1.5px solid #E0DAD0;
          color: #1a1a1a;
          padding: 12px 14px;
          width: 100%;
          outline: none;
          border-radius: 0;
          transition: border-color 0.2s;
          -webkit-appearance: none;
        }
        input:focus, textarea:focus, select:focus { border-color: #1a1a1a; }
        textarea { resize: vertical; line-height: 1.7; }
        .btn-primary {
          background: #1a1a1a; color: #F5F2EB;
          font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 3px;
          text-transform: uppercase; padding: 14px 32px; border: none; cursor: pointer;
          transition: all 0.2s; width: 100%;
        }
        .btn-primary:hover:not(:disabled) { background: #2d2d2d; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-sec {
          background: transparent; color: #888;
          font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 2px;
          text-transform: uppercase; padding: 14px 32px; border: 1.5px solid #ddd; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-sec:hover { border-color: #999; color: #1a1a1a; }
        .voice-card {
          border: 1.5px solid #E0DAD0; padding: 14px 16px; cursor: pointer;
          transition: all 0.2s; background: #fff;
        }
        .voice-card:hover { border-color: #999; }
        .voice-card.active { border-color: #1a1a1a; background: #1a1a1a; color: #F5F2EB; }
        .section-tab {
          font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 2px;
          text-transform: uppercase; padding: 10px 16px; cursor: pointer;
          border-bottom: 2px solid transparent; background: none; border-top: none;
          border-left: none; border-right: none; color: #999; transition: all 0.2s;
        }
        .section-tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; }
        .section-tab:hover { color: #1a1a1a; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
        .progress-dot { width: 8px; height: 8px; border-radius: 50%; transition: all 0.3s; }
      `}</style>
 
      {/* Header */}
      <div style={{ borderBottom: "1.5px solid #E0DAD0", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F5F2EB" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 4, color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Content Engine · Marketing Agencies</div>
          <div style={{ fontSize: 22, fontStyle: "italic", color: "#1a1a1a" }}>The Content Factory</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="progress-dot" style={{
                  background: i < step ? "#1a1a1a" : i === step ? "#C8A45A" : "#E0DAD0",
                  width: i === step ? 10 : 8, height: i === step ? 10 : 8,
                }} />
                <span style={{ fontFamily: "'DM Mono'", fontSize: 10, color: i === step ? "#1a1a1a" : "#bbb", letterSpacing: 1, textTransform: "uppercase" }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: "#E0DAD0" }} />}
            </div>
          ))}
        </div>
      </div>
 
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
 
        {/* STEP 0 — Agency Profile */}
        {step === 0 && (
          <div className="fade-up">
            <h2 style={{ fontSize: 32, fontStyle: "italic", marginBottom: 8 }}>Agency Profile</h2>
            <p style={{ fontFamily: "'DM Mono'", fontSize: 12, color: "#999", marginBottom: 40, lineHeight: 1.7 }}>
              This profile is saved once per client. The engine uses it on every content run.
            </p>
 
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Agency Name</label>
                <input value={form.agencyName} onChange={e => set("agencyName", e.target.value)} placeholder="e.g. Bold & Co. Marketing" />
              </div>
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Agency Specialty</label>
                <input value={form.agencySpecialty} onChange={e => set("agencySpecialty", e.target.value)} placeholder="e.g. performance marketing for D2C e-commerce brands" />
              </div>
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Their Target Audience</label>
                <input value={form.targetAudience} onChange={e => set("targetAudience", e.target.value)} placeholder="e.g. CMOs at B2B SaaS companies with $5M–$50M ARR" />
              </div>
 
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 12 }}>Brand Voice</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.keys(BRAND_VOICES).map(v => (
                    <div key={v} className={`voice-card ${form.brandVoice === v ? "active" : ""}`} onClick={() => set("brandVoice", v)}>
                      <div style={{ fontFamily: "'DM Mono'", fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{v}</div>
                      <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.5, fontFamily: "'DM Mono'" }}>
                        {BRAND_VOICES[v].split(".")[0]}.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
 
            <div style={{ marginTop: 40 }}>
              <button className="btn-primary" disabled={!canNext()} onClick={() => setStep(1)}>
                Next → Article Setup
              </button>
            </div>
          </div>
        )}
 
        {/* STEP 1 — Article Setup */}
        {step === 1 && (
          <div className="fade-up">
            <h2 style={{ fontSize: 32, fontStyle: "italic", marginBottom: 8 }}>Article Setup</h2>
            <p style={{ fontFamily: "'DM Mono'", fontSize: 12, color: "#999", marginBottom: 40, lineHeight: 1.7 }}>
              One topic. One keyword. One article type. The engine handles the rest.
            </p>
 
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Article Topic</label>
                <textarea value={form.topic} onChange={e => set("topic", e.target.value)} rows={3}
                  placeholder="e.g. Why most agencies fail at retainer pricing — and how to fix it" />
              </div>
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Primary SEO Keyword</label>
                <input value={form.keyword} onChange={e => set("keyword", e.target.value)} placeholder="e.g. marketing agency retainer pricing" />
              </div>
 
              <div>
                <label style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 12 }}>Article Type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Object.entries(ARTICLE_TYPES).map(([k, v]) => (
                    <div key={k} className={`voice-card ${form.articleType === k ? "active" : ""}`}
                      onClick={() => set("articleType", k)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "'DM Mono'", fontSize: 11, letterSpacing: 1, marginBottom: 3 }}>{k}</div>
                        <div style={{ fontSize: 11, opacity: 0.6, fontFamily: "'DM Mono'" }}>{v.desc}</div>
                      </div>
                      {form.articleType === k && <div style={{ fontSize: 18, opacity: 0.6 }}>✓</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
 
            <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
              <button className="btn-sec" onClick={() => setStep(0)} style={{ width: "30%" }}>← Back</button>
              <button className="btn-primary" style={{ width: "70%" }} disabled={!canNext()} onClick={() => { setStep(2); generate(); }}>
                Generate Package →
              </button>
            </div>
          </div>
        )}
 
        {/* STEP 2 — Output */}
        {step === 2 && (
          <div className="fade-up">
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{
                  width: 40, height: 40, border: "2px solid #E0DAD0", borderTop: "2px solid #1a1a1a",
                  borderRadius: "50%", margin: "0 auto 24px",
                }} className="spinner" />
                <div style={{ fontFamily: "'DM Mono'", fontSize: 11, letterSpacing: 3, color: "#999", textTransform: "uppercase" }}>
                  Generating full content package…
                </div>
                <div style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#bbb", marginTop: 12 }}>
                  Article · Meta · 5 Social Posts · Newsletter
                </div>
              </div>
            )}
 
            {error && (
              <div style={{ padding: "32px", background: "#fff0f0", border: "1.5px solid #ffcccc" }}>
                <div style={{ fontFamily: "'DM Mono'", fontSize: 11, color: "#cc3333", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Generation Error</div>
                <div style={{ fontFamily: "'DM Mono'", fontSize: 12, color: "#666" }}>{error}</div>
                <button className="btn-sec" style={{ marginTop: 20 }} onClick={() => { setStep(1); setError(null); }}>← Try Again</button>
              </div>
            )}
 
            {output && !loading && (
              <div className="fade-up">
                {/* Header bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Content Package Ready</div>
                    <div style={{ fontSize: 22, fontStyle: "italic" }}>{form.agencyName}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-sec" style={{ padding: "10px 20px", fontSize: 10 }} onClick={copyAll}>
                      {copied ? "✓ Copied" : "Copy All"}
                    </button>
                    <button className="btn-sec" style={{ padding: "10px 20px", fontSize: 10 }} onClick={() => { setStep(0); setOutput(null); setForm({ agencyName: "", agencySpecialty: "", targetAudience: "", topic: "", keyword: "", brandVoice: "Authority", articleType: "SEO Deep-Dive" }); }}>
                      New Client
                    </button>
                    <button className="btn-sec" style={{ padding: "10px 20px", fontSize: 10 }} onClick={() => { setStep(1); setOutput(null); }}>
                      New Article
                    </button>
                  </div>
                </div>
 
                {/* Section tabs */}
                <div style={{ borderBottom: "1.5px solid #E0DAD0", display: "flex", gap: 0, overflowX: "auto", marginBottom: 0 }}>
                  <button className={`section-tab ${activeSection === null ? "active" : ""}`} onClick={() => setActiveSection(null)}>All</button>
                  {sectionLabels.map(s => (
                    <button key={s.key} className={`section-tab ${activeSection === s.key ? "active" : ""}`} onClick={() => setActiveSection(s.key)}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
 
                {/* Content */}
                <div style={{ background: "#fff", border: "1.5px solid #E0DAD0", borderTop: "none", padding: "32px" }}>
                  {(activeSection === null || activeSection === "titles") && output.titles && (
                    <Section label="Article Titles" accent="#C8A45A">
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono'", fontSize: 12, lineHeight: 1.9, color: "#333" }}>{output.titles}</pre>
                    </Section>
                  )}
                  {(activeSection === null || activeSection === "meta") && output.meta && (
                    <Section label="Meta Description" accent="#6AB8A0">
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono'", fontSize: 12, lineHeight: 1.9, color: "#333" }}>{output.meta}</pre>
                    </Section>
                  )}
                  {(activeSection === null || activeSection === "article") && output.article && (
                    <Section label="Full Article" accent="#1a1a1a">
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono'", fontSize: 12, lineHeight: 2, color: "#333" }}>{output.article}</pre>
                    </Section>
                  )}
                  {(activeSection === null || activeSection === "social") && output.social && (
                    <Section label="5 Social Posts" accent="#8A6AFF">
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono'", fontSize: 12, lineHeight: 2, color: "#333" }}>{output.social}</pre>
                    </Section>
                  )}
                  {(activeSection === null || activeSection === "email") && output.email && (
                    <Section label="Email Newsletter" accent="#D4634A">
                      <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono'", fontSize: 12, lineHeight: 2, color: "#333" }}>{output.email}</pre>
                    </Section>
                  )}
                </div>
 
                {/* Package summary */}
                <div style={{ marginTop: 16, padding: "16px 24px", background: "#1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>
                    {form.articleType} · {form.brandVoice} Voice · "{form.keyword}"
                  </div>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 2, color: "#4a8a4a", textTransform: "uppercase" }}>
                    ✓ Package Complete
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
 
function Section({ label, accent, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 3, height: 20, background: accent, flexShrink: 0 }} />
        <div style={{ fontFamily: "'DM Mono'", fontSize: 10, letterSpacing: 3, color: "#999", textTransform: "uppercase" }}>{label}</div>
      </div>
      {children}
    </div>
  );
}
