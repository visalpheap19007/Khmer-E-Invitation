import React, { useEffect, useRef, useState } from "react";
import { WEDDING_DATE, images, contacts, mapUrl, content, music } from "./config.js";

const KIT = "/kit/elements";
const TEX = "/kit/textures";

const KH_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const toKhmer = (n) =>
  String(n)
    .split("")
    .map((d) => (/\d/.test(d) ? KH_DIGITS[Number(d)] : d))
    .join("");

function useCountdown(target) {
  const calc = () => {
    const diff = Math.max(0, new Date(target).getTime() - Date.now());
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

function useReveal(deps) {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in)");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps);
}

/* Background music. Browsers only allow sound after a tap, so play() is
   called from the envelope seal click (the first user gesture). */
function useMusic() {
  const ref = useRef(null);
  const raf = useRef(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio(music.src);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    ref.current = a;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    a.addEventListener("play", on);
    a.addEventListener("pause", off);
    return () => {
      cancelAnimationFrame(raf.current);
      a.pause();
      a.removeEventListener("play", on);
      a.removeEventListener("pause", off);
    };
  }, []);

  const fade = (to, ms, done) => {
    const a = ref.current;
    cancelAnimationFrame(raf.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) raf.current = requestAnimationFrame(step);
      else if (done) done();
    };
    raf.current = requestAnimationFrame(step);
  };

  const play = () => {
    const a = ref.current;
    if (!a) return;
    const p = a.play();
    if (p && p.catch) p.catch(() => setPlaying(false));
    fade(music.volume, 1800);
  };
  const stop = () => {
    const a = ref.current;
    if (a) fade(0, 500, () => a.pause());
  };
  const toggle = () => (ref.current && ref.current.paused ? play() : stop());

  // pause while the tab is hidden, resume afterwards if it was playing
  useEffect(() => {
    let was = false;
    const onVis = () => {
      const a = ref.current;
      if (!a) return;
      if (document.hidden) {
        was = !a.paused;
        a.pause();
      } else if (was) {
        a.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return { playing, play, toggle };
}

/* Floating play / close (mute) button */
function MusicButton({ playing, onToggle, lang }) {
  const label = playing ? (lang === "km" ? "បិទតន្ត្រី" : "Close music") : lang === "km" ? "បើកតន្ត្រី" : "Play music";
  return (
    <button className={`music ${playing ? "on" : ""}`} onClick={onToggle} aria-label={label} title={label}>
      <span className="music-ring" />
      {playing ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" />
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      )}
    </button>
  );
}

/* Gold corner ornaments (kit corner.svg is top-left; the others are mirrored in CSS) */
function Corners() {
  return (
    <>
      {["tl", "tr", "bl", "br"].map((c) => (
        <img key={c} src={`${KIT}/corner.svg`} alt="" className={`corner corner-${c}`} aria-hidden="true" />
      ))}
    </>
  );
}

function Divider() {
  return <img src={`${KIT}/divider.svg`} alt="" className="divider reveal" aria-hidden="true" />;
}

/* Name logo with the kit butterfly between the two names */
function NameLogo({ t, className = "", style }) {
  return (
    <div className={`namelogo ${className}`} style={style}>
      <span>{t.brideName}</span>
      <img src={`${KIT}/butterfly.svg`} alt="&" className="butterfly" />
      <span>{t.groomName}</span>
    </div>
  );
}

/* Guest name comes from the end of the URL:  https://your-site.com/ដារ៉ា  (or ?name=ដារ៉ា) */
function readGuestFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search).get("name");
    if (q) return q.trim();
    const seg = window.location.pathname.split("/").filter(Boolean).pop() || "";
    const name = decodeURIComponent(seg.replace(/\+/g, " ")).trim();
    return /\.[a-z0-9]{2,5}$/i.test(name) ? "" : name; // ignore index.html etc.
  } catch {
    return "";
  }
}

/* Envelope cover: embossed cream paper, gold foil, guest-name frame, open button */
function Envelope({ onOpen, t, opening, guest, setGuest }) {
  const len = guest.length;
  const size = len > 26 ? "1.05rem" : len > 16 ? "1.3rem" : "1.65rem";
  const submit = (e) => {
    e.preventDefault();
    onOpen();
  };
  return (
    <div className={`envelope ${opening ? "opening" : ""}`}>
      <div className="cv-emboss" aria-hidden="true" />
      <div className="cv-dots" aria-hidden="true" />

      <form className="cv" onSubmit={submit}>
        <h2 className="cv-title cv-in" style={{ "--i": 0 }}>
          <span className="foil-text">{t.title}</span>
        </h2>

        <NameLogo t={t} className="foil big cv-in" style={{ "--i": 1 }} />

        <p className="cv-pre cv-in" style={{ "--i": 2 }}>
          {t.invitePre}
        </p>

        <label className={`guest-box cv-in ${guest ? "filled" : ""}`} style={{ "--i": 3 }}>
          <img src={`${KIT}/divider.svg`} alt="" className="gb-orn gb-top" aria-hidden="true" />
          <input
            type="text"
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
            placeholder={t.guestLabel}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="go"
            aria-label={t.guestLabel}
            style={{ fontSize: size }}
          />
          <svg className="gb-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20l4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" />
            <path d="M13.5 7.5l3 3" />
          </svg>
          <img src={`${KIT}/divider.svg`} alt="" className="gb-orn gb-bottom" aria-hidden="true" />
        </label>

        <div className="cv-info cv-in" style={{ "--i": 4 }}>
          <p>{t.dateLine}</p>
          <p>{t.venueName}</p>
          <p>{t.venueAddress}</p>
        </div>

        <button type="submit" className="open-btn cv-in" style={{ "--i": 5 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5.5" width="18" height="13" rx="2" />
            <path d="M3.5 7l8.5 6.2L20.5 7" />
          </svg>
          <span>{t.openBtn}</span>
          <i className="open-arrow" aria-hidden="true">
            →
          </i>
        </button>
      </form>

      <div className="cv-flash" aria-hidden="true" />
    </div>
  );
}

function Countdown({ t, lang }) {
  const c = useCountdown(WEDDING_DATE);
  const vals = [c.d, c.h, c.m, c.s].map((v) => {
    const s = String(v).padStart(2, "0");
    return lang === "km" ? toKhmer(s) : s;
  });
  return (
    <div className="countdown reveal">
      {vals.map((v, i) => (
        <div className="cd-box" key={i}>
          <span className="cd-num">{v}</span>
          <span className="cd-unit">{t.units[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Lightbox({ index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const touch = useRef(null);
  return (
    <div
      className="lightbox"
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) (dx > 0 ? onPrev : onNext)();
        touch.current = null;
      }}
    >
      <button className="lb-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <button
        className="lb-nav lb-prev"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        aria-label="Previous"
      >
        ‹
      </button>
      <img src={images.gallery[index]} alt="" onClick={(e) => e.stopPropagation()} />
      <button
        className="lb-nav lb-next"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("km");
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("closed"); // closed -> opening -> open
  const [lb, setLb] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [guest, setGuestState] = useState(readGuestFromUrl);
  const { playing, play, toggle } = useMusic();
  // [left %, top %, size px, delay s]
const SPARKS = [
  [8, 14, 14, 0], [90, 10, 11, 0.8], [18, 30, 9, 1.6], [80, 26, 13, 0.4],
  [6, 52, 10, 2.2], [93, 48, 14, 1.1], [24, 66, 12, 0.3], [75, 62, 9, 1.9],
  [12, 82, 13, 1.4], [88, 80, 10, 0.6], [50, 8, 9, 2.4], [38, 44, 8, 1.2],
  [64, 40, 10, 2.8], [30, 90, 9, 0.9], [70, 92, 12, 2],
];
//swipe gallery
function Gallery({ items, onOpen, num, hint }) {
  const n = items.length;
  const [cur, setCur] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState(false);
  const wrap = useRef(null);
  const startX = useRef(null);
  const moved = useRef(false);
  const captured = useRef(false);
  const resume = useRef(0);

  const go = (d) => setCur((v) => (v + d + n) % n);

  // reveal when scrolled into view (own observer, not the global .reveal one)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // autoplay (after it has been seen); pauses while the guest touches it
  useEffect(() => {
    if (!seen || paused) return;
    const id = setInterval(() => go(1), 4500);
    return () => clearInterval(id);
  }, [seen, paused, n]);

  const pause = () => {
    setPaused(true);
    clearTimeout(resume.current);
    resume.current = setTimeout(() => setPaused(false), 7000);
  };

  const down = (e) => {
    startX.current = e.clientX;
    moved.current = false;
    captured.current = false;
    pause();
  };
  const move = (e) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 6) {
      moved.current = true;
      setDragging(true);
      if (!captured.current) {
        e.currentTarget.setPointerCapture(e.pointerId);
        captured.current = true;
      }
    }
    setDrag(dx);
  };
  const up = () => {
    if (startX.current == null) return;
    if (drag < -50) go(1);
    else if (drag > 50) go(-1);
    startX.current = null;
    setDrag(0);
    setDragging(false);
  };
  const key = (e) => {
    if (e.key === "ArrowLeft") (go(-1), pause());
    if (e.key === "ArrowRight") (go(1), pause());
  };

  const half = Math.floor(n / 2);
  return (
    <div ref={wrap} className={`g-wrap ${seen ? "seen" : ""}`}>
      <div className="g-ambient" key={cur} style={{ backgroundImage: `url(${items[cur]})` }} aria-hidden="true" />

      <div
        className={`g-stage ${dragging ? "dragging" : ""}`}
        tabIndex={0}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-roledescription="carousel"
      >
        {items.map((src, idx) => {
          const o = seen ? ((idx - cur + n + half) % n) - half : 0; // circular offset from the centre
          const a = Math.abs(o);
          const on = o === 0 && seen;
          const style = {
            transform: `translateX(calc(-50% + ${o * 58}% + ${drag * 0.7}px)) rotateY(${o * -16}deg) scale(${o === 0 ? 1 : 0.82 - (a - 1) * 0.08})`,
            opacity: !seen ? (idx === cur ? 1 : 0) : a > 2 ? 0 : 1 - a * 0.25,
            zIndex: 10 - a,
            filter: o === 0 ? "none" : "brightness(.55) saturate(.8)",
            pointerEvents: a > 2 ? "none" : "auto",
          };
          return (
            <button
              key={idx}
              className={`g-slide ${on ? "on" : ""}`}
              style={style}
              aria-label={`${idx + 1} / ${n}`}
              onClick={() => {
                if (moved.current) return;
                on ? onOpen(idx) : (setCur(idx), pause());
              }}
            >
              <img src={src} alt="" draggable="false" />
              {on && <i className="g-shine" />}
              {["tl", "tr", "bl", "br"].map((c) => (
                <img key={c} src={`${KIT}/corner.svg`} alt="" className={`g-c g-c-${c}`} aria-hidden="true" draggable="false" />
              ))}
            </button>
          );
        })}
      </div>

      <div className="g-ctrl">
        <button className="g-btn" onClick={() => (go(-1), pause())} aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="g-dots">
          {items.map((_, idx) => (
            <button key={idx} className={`g-dot ${idx === cur ? "on" : ""}`} onClick={() => (setCur(idx), pause())} aria-label={`${idx + 1}`} />
          ))}
        </div>
        <button className="g-btn" onClick={() => (go(1), pause())} aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <p className="g-count">
        {num(cur + 1)} / {num(n)}
      </p>
      <p className="g-hint">
        <span className="g-arrows" aria-hidden="true">‹ ›</span> {hint}
      </p>
    </div>
  );
}

  // typing in the name box keeps the URL in sync:  /ដារ៉ា
  const setGuest = (v) => {
    setGuestState(v);
    try {
      window.history.replaceState(null, "", v.trim() ? `/${encodeURIComponent(v.trim())}` : "/");
    } catch {}
  };
  const t = content[lang];
  const total = images.gallery.length;
  const open = stage === "open";

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "km" ? "km" : "en";
  }, [lang]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = !open || lb !== null ? "hidden" : "";
  }, [open, lb]);

  useReveal([open, lang]);

  const openEnvelope = () => {
    if (stage !== "closed") return;
    play(); // music starts the moment the seal is tapped
    setStage("opening");
    setTimeout(() => setStage("open"), 1500);
  };

  const prev = () => setLb((i) => (i + total - 1) % total);
  const next = () => setLb((i) => (i + 1) % total);
  const close = () => setLb(null);
  const toggleLang = () => setLang((l) => (l === "km" ? "en" : "km"));

  return (
    <div className={`app lang-${lang} ${open ? "ready" : ""}`}>
      {stage !== "closed" && <MusicButton playing={playing} onToggle={toggle} lang={lang} />}
      {loading && (
        <div className="loader" style={{ backgroundImage: `url(${TEX}/paper-olive.webp)` }}>
          <img src={`${KIT}/lotus.svg`} alt="" className="loader-lotus" />
        </div>
      )}

      {!open && <Envelope onOpen={openEnvelope} t={t} opening={stage === "opening"} guest={guest} setGuest={setGuest} />}

      <header className={`topbar ${scrolled ? "solid" : ""}`}>
        <a href="#top" className="brand">
          <img src={`${KIT}/lotus.svg`} alt="" />
        </a>
        <nav>
          <a href="#words">{t.wordsTitle}</a>
          <a href="#venue">{t.venueTitle}</a>
          <a href="#gallery">{t.galleryTitle}</a>
        </nav>
        <button className="lang" onClick={toggleLang}>
          {t.langLabel}
        </button>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <img src={images.hero} alt={t.heroAlt} className="hero-img" />
          <div className="hero-shade" />

          <div className="hero-frame" aria-hidden="true">
            {["tl", "tr", "bl", "br"].map((c) => (
              <img key={c} src={`${KIT}/corner.svg`} alt="" className={`hc hc-${c}`} />
            ))}
          </div>

          <div className="sparks" aria-hidden="true">
            {SPARKS.map(([x, y, s, d], i) => (
              <i key={i} style={{ left: `${x}%`, top: `${y}%`, "--s": `${s}px`, "--d": `${d}s` }} />
            ))}
          </div>

          <img src={`${KIT}/butterfly.svg`} alt="" className="fly fly-1" aria-hidden="true" />
          <img src={`${KIT}/butterfly.svg`} alt="" className="fly fly-2" aria-hidden="true" />

          <div className="hero-text">
            <div className="hh-title h-in" style={{ "--i": 0 }}>
              <img src={`${KIT}/crest.svg`} alt="" className="hh-orn" aria-hidden="true" />
              <h1 className="hh-h1 gold-bright">{t.title}</h1>
              <img src={`${KIT}/divider.svg`} alt="" className="hh-div" aria-hidden="true" />
            </div>

            <div className="hh-parents h-in" style={{ "--i": 1 }}>
              <div>{t.hero.groomParents.map((p) => <p key={p}>{p}</p>)}</div>
              <div>{t.hero.brideParents.map((p) => <p key={p}>{p}</p>)}</div>
            </div>

            <p className="hh-honor gold-bright h-in" style={{ "--i": 2 }}>{t.hero.honor}</p>
            <p className="hh-guests h-in" style={{ "--i": 3 }}>{t.hero.guests}</p>

            <div className="mono h-in" style={{ "--i": 4 }}>
              <svg className="mono-ring" viewBox="0 0 100 100" aria-hidden="true">
                <defs>
                  <linearGradient id="heroGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f7e3a1" />
                    <stop offset=".5" stopColor="#c8963a" />
                    <stop offset="1" stopColor="#fff0b8" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="47.5" fill="none" stroke="url(#heroGold)" strokeWidth="1" />
                <circle cx="50" cy="50" r="43" fill="none" stroke="url(#heroGold)" strokeWidth="2.4" strokeDasharray="0.8 3.4" strokeLinecap="round" />
              </svg>
              <img src={`${KIT}/crest.svg`} alt="" aria-hidden="true" />
            </div>

            <div className="hh-names h-in" style={{ "--i": 5 }}>
              <div>
                <span>{t.hero.brideLabel}</span>
                <b className="gold-bright">{t.brideName}</b>
              </div>
              <div>
                <span>{t.hero.groomLabel}</span>
                
                <b className="gold-bright">{t.groomName}</b>
              </div>
            </div>

            <p className="hh-event h-in" style={{ "--i": 6 }}>
              {t.hero.eventPre}
              <br />
              {t.dateLine}
              <br />
              {t.venueAddress}
            </p>

            <a href="#invite" className="scroll-cue h-in" style={{ "--i": 7 }} aria-label="Scroll">
              <span />
            </a>
          </div>
        </section>

        {/* INVITE + COUNTDOWN — cream paper card */}
        <section id="invite" className="band olive-band">
          <div className="card paper reveal" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
            <Corners />
            {guest.trim() && (
              <p className="guest-line">
                {t.invitePre} <b>{guest.trim()}</b>
              </p>
            )}
            <p className="invite">{t.invite}</p>
            <Divider />
            <h2 className="h2">{t.countdownTitle}</h2>
            <Countdown t={t} lang={lang} />
            <p className="card-date">{t.dateLine}</p>
          </div>
        </section>

        {/* WORDS */}
        <section id="words" className="band cream-band" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
          <div className="words-grid">
            <div className="words-photos reveal">
              <img src={images.words} alt="" className="ph ph-a" />
              <img src={images.cozy} alt="" className="ph ph-b" />
            </div>
            <div className="words-copy reveal">
              <h2 className="h2">{t.wordsTitle}</h2>
              <img src={`${KIT}/divider.svg`} alt="" className="divider left" aria-hidden="true" />
              {t.words.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
              <div className="signoff">
                {t.brideName} <img src={`${KIT}/butterfly.svg`} alt="&" className="butterfly sm" /> {t.groomName}
              </div>
            </div>
          </div>
        </section>

        {/* VENUE */}
        <section id="venue" className="venue">
          <img src={images.pond} alt="" className="venue-bg" />
          <div className="venue-shade" />
          <div className="card paper venue-card reveal" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
            <Corners />
            <img src={`${KIT}/crest.svg`} alt="" className="card-crest" aria-hidden="true" />
            <h2 className="h2">{t.venueTitle}</h2>
            <h3 className="venue-name">{t.venueName}</h3>
            <p className="venue-addr">{t.venueAddress}</p>
            <Divider />
            <ul className="schedule">
              {t.schedule.map((s, i) => (
                <li key={i}>
                  <b>{s.time}</b>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
            <a className="btn dark" href={mapUrl} target="_blank" rel="noreferrer">
              {t.mapLabel}
            </a>
          </div>
        </section>

        {/* GALLERY */}
        <section id="gallery" className="band olive-band gallery" style={{ backgroundImage: `url(${TEX}/paper-olive.webp)` }}>
          <h2 className="h2 gold reveal">{t.galleryTitle}</h2>
          <img src={`${KIT}/divider.svg`} alt="" className="divider reveal" aria-hidden="true" />
          <Gallery
            items={images.gallery}
            onOpen={setLb}
            num={(v) => (lang === "km" ? toKhmer(String(v).padStart(2, "0")) : String(v).padStart(2, "0"))}
            hint={lang === "km" ? "អូសទៅឆ្វេង ឬស្តាំ" : "Swipe left or right"}
          />
        </section>

        {/* CONTACT */}
        <section className="band cream-band contact" style={{ backgroundImage: `url(${TEX}/paper-cream.webp)` }}>
          <h2 className="h2 reveal">{t.contactTitle}</h2>
          <div className="links reveal">
            <a href={contacts.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <a href={contacts.messenger} target="_blank" rel="noreferrer">
              Tel
            </a>
            <a href={contacts.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
          </div>
          <img src={`${KIT}/wax-seal.svg`} alt="" className="foot-seal reveal" aria-hidden="true" />
          <p className="thanks reveal">{t.thanks}</p>
          <p className="foot reveal">
            {t.footer} · {t.brideName} &amp; {t.groomName}
          </p>
        </section>
      </main>

      {lb !== null && <Lightbox index={lb} onClose={close} onPrev={prev} onNext={next} />}
    </div>
  );
}
