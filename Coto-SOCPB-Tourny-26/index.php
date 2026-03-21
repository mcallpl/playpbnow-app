<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>South Orange County Pickleball Community Tournament — March 28 at Coto Pickleball Club</title>
<meta name="description" content="The biggest pickleball event in South Orange County is back. March 28 at Coto Pickleball Club. Doubles, DUPR Rated, Mixed. Register now before spots fill up.">
<meta property="og:title" content="SOCPB Community Tournament — March 28">
<meta property="og:description" content="It's going down March 28th at Coto Pickleball Club. Non-DUPR Doubles, DUPR Rated Doubles, Mixed Doubles. Register now.">
<meta property="og:image" content="images/abe-chip-mib.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#080e1a;
  --surface:#0d1929;
  --card:#111f35;
  --card-border:rgba(135,202,55,0.12);
  --accent:#87ca37;
  --accent-dim:rgba(135,202,55,0.08);
  --accent-glow:rgba(135,202,55,0.3);
  --gold:#f0b429;
  --gold-dim:rgba(240,180,41,0.1);
  --gold-glow:rgba(240,180,41,0.3);
  --amber:#ff8c38;
  --text:#f0f4f8;
  --muted:rgba(240,244,248,0.5);
  --soft:rgba(240,244,248,0.75);
  --border:rgba(255,255,255,0.06);
  --radius:16px;
}

html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.7;overflow-x:hidden}
h1,h2,h3,h4,h5,h6{font-family:'Outfit',sans-serif;line-height:1.15}
.bebas{font-family:'Bebas Neue',sans-serif}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}

/* ═══════════ NOISE OVERLAY ═══════════ */
body::after{
  content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;
  opacity:0.025;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size:128px 128px;
}

/* ═══════════ SCROLL ANIMATIONS ═══════════ */
.reveal{opacity:0;transform:translateY(50px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-scale{opacity:0;transform:scale(0.92);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
.reveal-scale.visible{opacity:1;transform:scale(1)}
.stagger-1{transition-delay:.1s}.stagger-2{transition-delay:.2s}.stagger-3{transition-delay:.3s}
.stagger-4{transition-delay:.4s}.stagger-5{transition-delay:.5s}.stagger-6{transition-delay:.6s}

/* ═══════════ LAYOUT ═══════════ */
.container{max-width:1100px;margin:0 auto;padding:0 24px}
.section{padding:100px 0}

/* ═══════════ STICKY NAV ═══════════ */
.topbar{
  position:fixed;top:0;left:0;right:0;z-index:100;
  padding:14px 0;
  background:rgba(8,14,26,0.6);
  backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border-bottom:1px solid var(--border);
  transition:all .3s;
}
.topbar.scrolled{padding:8px 0;background:rgba(8,14,26,0.92)}
.topbar-inner{display:flex;align-items:center;justify-content:space-between}
.topbar-title{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:var(--accent)}
.topbar-cta{
  background:var(--accent);color:var(--bg);font-family:'Outfit',sans-serif;
  font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;
  padding:10px 24px;border-radius:10px;border:none;cursor:pointer;
  box-shadow:0 2px 20px var(--accent-glow);transition:all .3s;
  text-decoration:none;
}
.topbar-cta:hover{transform:translateY(-2px);box-shadow:0 8px 32px var(--accent-glow)}

/* ═══════════ HERO ═══════════ */
.hero{
  min-height:100vh;display:flex;flex-direction:column;align-items:center;
  justify-content:center;position:relative;overflow:hidden;
  padding:120px 24px 60px;text-align:center;
}
.hero-bg{
  position:absolute;inset:0;z-index:0;
  background:
    radial-gradient(ellipse 800px 600px at 50% 30%,rgba(135,202,55,0.06) 0%,transparent 70%),
    radial-gradient(ellipse 600px 800px at 20% 80%,rgba(30,60,120,0.15) 0%,transparent 70%),
    radial-gradient(ellipse 600px 800px at 80% 80%,rgba(240,180,41,0.05) 0%,transparent 70%);
}
.hero-lines{
  position:absolute;inset:0;z-index:0;overflow:hidden;
}
.hero-lines::before,.hero-lines::after{
  content:'';position:absolute;
  width:200%;height:1px;
  background:linear-gradient(90deg,transparent,rgba(135,202,55,0.15),transparent);
  animation:lineSweep 8s ease-in-out infinite;
}
.hero-lines::before{top:30%;left:-50%;animation-delay:0s}
.hero-lines::after{top:70%;left:-50%;animation-delay:4s}
@keyframes lineSweep{
  0%,100%{transform:translateX(-10%)}
  50%{transform:translateX(10%)}
}
.hero-content{position:relative;z-index:1;max-width:900px}
.hero-date-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(240,180,41,0.1);border:1px solid rgba(240,180,41,0.25);
  padding:8px 22px;border-radius:100px;margin-bottom:28px;
  font-family:'Outfit',sans-serif;font-weight:600;font-size:13px;
  letter-spacing:2px;text-transform:uppercase;color:var(--gold);
  animation:badgePulse 3s ease-in-out infinite;
}
@keyframes badgePulse{
  0%,100%{box-shadow:0 0 0 0 rgba(240,180,41,0.15)}
  50%{box-shadow:0 0 0 12px rgba(240,180,41,0)}
}
.hero-date-badge .dot{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:dotBlink 2s ease-in-out infinite}
@keyframes dotBlink{0%,100%{opacity:1}50%{opacity:0.3}}

.hero-title{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(3.2rem,8vw,7rem);
  letter-spacing:3px;
  line-height:0.95;
  margin-bottom:8px;
  background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,0.6));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}
.hero-subtitle{
  font-family:'Bebas Neue',sans-serif;
  font-size:clamp(1.2rem,3.5vw,2.2rem);
  letter-spacing:6px;
  color:var(--accent);
  margin-bottom:6px;
}
.hero-venue{
  font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;
  color:var(--muted);letter-spacing:2px;text-transform:uppercase;
  margin-bottom:40px;
}
.hero-venue a{color:var(--soft);border-bottom:1px solid rgba(255,255,255,0.15);transition:color .3s}
.hero-venue a:hover{color:var(--accent)}

/* Hero Image */
.hero-image-wrap{
  position:relative;max-width:720px;margin:0 auto 44px;
  border-radius:20px;overflow:hidden;
  box-shadow:
    0 0 0 1px rgba(135,202,55,0.1),
    0 20px 60px rgba(0,0,0,0.5),
    0 0 120px rgba(135,202,55,0.08);
}
.hero-image-wrap::before{
  content:'';position:absolute;inset:0;z-index:1;
  background:linear-gradient(180deg,transparent 50%,rgba(8,14,26,0.8));
  pointer-events:none;
}
.hero-image-wrap img{width:100%;display:block}
.hero-image-caption{
  position:absolute;bottom:20px;left:0;right:0;z-index:2;
  font-family:'Bebas Neue',sans-serif;font-size:clamp(1.4rem,4vw,2.4rem);
  letter-spacing:4px;color:var(--amber);
  text-shadow:0 2px 20px rgba(0,0,0,0.8);
}

/* Countdown */
.countdown{
  display:flex;justify-content:center;gap:20px;margin-bottom:44px;
}
.countdown-unit{
  display:flex;flex-direction:column;align-items:center;
  background:rgba(255,255,255,0.04);border:1px solid var(--border);
  border-radius:14px;padding:16px 20px;min-width:80px;
  backdrop-filter:blur(8px);
}
.countdown-num{
  font-family:'Bebas Neue',sans-serif;font-size:2.4rem;
  color:var(--accent);line-height:1;
}
.countdown-label{
  font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;
  color:var(--muted);margin-top:4px;
}

/* Hero CTAs */
.hero-ctas{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-primary{
  display:inline-flex;align-items:center;gap:8px;
  background:var(--accent);color:var(--bg);
  font-family:'Outfit',sans-serif;font-weight:800;font-size:15px;
  letter-spacing:1.5px;text-transform:uppercase;
  padding:18px 40px;border-radius:14px;border:none;cursor:pointer;
  box-shadow:0 4px 30px var(--accent-glow);
  transition:all .3s;position:relative;overflow:hidden;
  text-decoration:none;
}
.btn-primary::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);
  transform:translateX(-100%);transition:transform .6s;
}
.btn-primary:hover::before{transform:translateX(100%)}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 8px 40px var(--accent-glow)}

.btn-secondary{
  display:inline-flex;align-items:center;gap:8px;
  background:transparent;color:var(--text);
  font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;
  letter-spacing:1px;text-transform:uppercase;
  padding:18px 36px;border-radius:14px;
  border:1px solid rgba(255,255,255,0.15);cursor:pointer;
  transition:all .3s;text-decoration:none;
}
.btn-secondary:hover{
  border-color:var(--accent);color:var(--accent);
  box-shadow:0 0 30px var(--accent-dim);
  transform:translateY(-2px);
}

/* CTA pulse animation */
@keyframes ctaPulse{
  0%,100%{box-shadow:0 4px 30px var(--accent-glow)}
  50%{box-shadow:0 4px 50px rgba(135,202,55,0.45)}
}
.btn-primary{animation:ctaPulse 3s ease-in-out infinite}
.btn-primary:hover{animation:none}

/* ═══════════ PERSONAL MESSAGE ═══════════ */
.message-section{
  position:relative;
  background:linear-gradient(180deg,var(--bg) 0%,var(--surface) 50%,var(--bg) 100%);
}
.message-section::before{
  content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:1px;height:80px;
  background:linear-gradient(180deg,transparent,var(--accent),transparent);
}
.message-inner{
  max-width:680px;margin:0 auto;text-align:center;
}
.message-label{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:11px;
  letter-spacing:4px;text-transform:uppercase;color:var(--accent);
  margin-bottom:32px;
}
.message-inner p{
  font-size:18px;line-height:1.85;color:var(--soft);margin-bottom:24px;
  font-weight:400;
}
.message-inner p.highlight{
  font-family:'Outfit',sans-serif;font-weight:600;font-size:22px;
  color:var(--text);line-height:1.6;
}
.message-inner p em{
  color:var(--accent);font-style:normal;font-weight:600;
}
.message-inner p strong{color:var(--text);font-weight:700}
.message-divider{
  width:60px;height:3px;background:var(--accent);
  border-radius:3px;margin:40px auto;opacity:0.5;
}

/* ═══════════ SCHEDULE ═══════════ */
.schedule-section{
  position:relative;
  background:var(--bg);
}
.section-heading{
  text-align:center;margin-bottom:60px;
}
.section-heading .eyebrow{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:11px;
  letter-spacing:5px;text-transform:uppercase;color:var(--gold);
  margin-bottom:12px;
}
.section-heading h2{
  font-family:'Bebas Neue',sans-serif;font-size:clamp(2.4rem,5vw,4rem);
  letter-spacing:3px;
  background:linear-gradient(180deg,#fff 20%,rgba(255,255,255,0.55));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}
.schedule-grid{
  display:grid;gap:20px;max-width:800px;margin:0 auto 48px;
}
.schedule-card{
  background:var(--card);
  border:1px solid var(--card-border);
  border-radius:var(--radius);
  padding:32px;
  display:grid;grid-template-columns:auto 1fr auto;gap:20px;align-items:center;
  transition:all .4s;position:relative;overflow:hidden;
}
.schedule-card::before{
  content:'';position:absolute;top:0;left:0;bottom:0;width:4px;
  border-radius:4px 0 0 4px;
}
.schedule-card:nth-child(1)::before{background:var(--accent)}
.schedule-card:nth-child(2)::before{background:var(--gold)}
.schedule-card:nth-child(3)::before{background:var(--amber)}
.schedule-card:hover{
  transform:translateY(-4px);
  box-shadow:0 12px 40px rgba(0,0,0,0.3);
  border-color:rgba(135,202,55,0.25);
}
.schedule-time{
  font-family:'Bebas Neue',sans-serif;font-size:1.6rem;
  letter-spacing:1px;white-space:nowrap;
}
.schedule-card:nth-child(1) .schedule-time{color:var(--accent)}
.schedule-card:nth-child(2) .schedule-time{color:var(--gold)}
.schedule-card:nth-child(3) .schedule-time{color:var(--amber)}
.schedule-info h3{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:17px;
  margin-bottom:4px;
}
.schedule-info .levels{
  font-size:13px;color:var(--muted);font-weight:500;
}
.schedule-badge{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:10px;
  letter-spacing:1.5px;text-transform:uppercase;
  padding:6px 14px;border-radius:8px;white-space:nowrap;
}
.schedule-card:nth-child(1) .schedule-badge{background:rgba(135,202,55,0.1);color:var(--accent)}
.schedule-card:nth-child(2) .schedule-badge{background:rgba(240,180,41,0.1);color:var(--gold)}
.schedule-card:nth-child(3) .schedule-badge{background:rgba(255,140,56,0.1);color:var(--amber)}

/* Entry prices */
.entry-row{
  display:flex;justify-content:center;gap:32px;flex-wrap:wrap;
  margin-bottom:20px;
}
.entry-price{
  display:flex;align-items:baseline;gap:10px;
  background:rgba(255,255,255,0.03);border:1px solid var(--border);
  border-radius:14px;padding:20px 32px;
}
.entry-price .amount{
  font-family:'Bebas Neue',sans-serif;font-size:2.6rem;
  color:var(--accent);line-height:1;
}
.entry-price .label{
  font-family:'Outfit',sans-serif;font-weight:600;font-size:13px;
  letter-spacing:1px;text-transform:uppercase;color:var(--muted);
}

/* Flyer section */
.flyer-section{
  display:flex;justify-content:center;align-items:center;
  gap:48px;flex-wrap:wrap;
  padding:60px 0 0;
}
.flyer-image{
  max-width:380px;border-radius:16px;overflow:hidden;
  box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05);
  transform:rotate(-1deg);transition:transform .4s;
}
.flyer-image:hover{transform:rotate(0deg) scale(1.02)}
.flyer-image img{width:100%;display:block}

/* ═══════════ WHY SECTION ═══════════ */
.why-section{
  position:relative;
  background:linear-gradient(180deg,var(--bg) 0%,rgba(135,202,55,0.02) 50%,var(--bg) 100%);
}
.why-inner{max-width:700px;margin:0 auto;text-align:center}
.why-inner p{
  font-size:19px;line-height:1.85;color:var(--soft);margin-bottom:20px;
}
.why-inner p.punch{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:24px;
  color:var(--text);line-height:1.5;margin:32px 0;
}
.why-inner p.action{
  font-family:'Outfit',sans-serif;font-weight:600;font-size:20px;
  color:var(--accent);
}

/* ═══════════ URGENCY / CTA ═══════════ */
.cta-section{
  position:relative;overflow:hidden;
  background:var(--surface);
  border-top:1px solid var(--border);
  border-bottom:1px solid var(--border);
}
.cta-section::before{
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(ellipse 600px 400px at 30% 50%,rgba(135,202,55,0.06),transparent),
    radial-gradient(ellipse 600px 400px at 70% 50%,rgba(240,180,41,0.04),transparent);
}
.cta-inner{
  position:relative;z-index:1;
  max-width:700px;margin:0 auto;text-align:center;
}
.urgency-badge{
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(255,80,60,0.1);border:1px solid rgba(255,80,60,0.25);
  padding:8px 22px;border-radius:100px;margin-bottom:24px;
  font-family:'Outfit',sans-serif;font-weight:700;font-size:12px;
  letter-spacing:2px;text-transform:uppercase;color:#ff5040;
}
.cta-inner h2{
  font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,5vw,3.6rem);
  letter-spacing:3px;margin-bottom:12px;
  background:linear-gradient(180deg,#fff 20%,rgba(255,255,255,0.6));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}
.cta-inner p{
  font-size:17px;color:var(--soft);margin-bottom:36px;line-height:1.7;
}
.cta-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}

/* ═══════════ CLOSING ═══════════ */
.closing-section{
  text-align:center;
  padding:80px 24px 40px;
}
.closing-section p{
  font-size:18px;color:var(--soft);line-height:1.8;
  max-width:600px;margin:0 auto;
}
.closing-section p strong{color:var(--text)}
.closing-section .signoff{
  font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;
  color:var(--accent);letter-spacing:1px;text-transform:uppercase;
  margin-top:32px;
}

/* ═══════════ COMMUNITY CTA ═══════════ */
.community-section{
  padding:40px 24px 100px;text-align:center;
}
.community-card{
  max-width:600px;margin:0 auto;
  background:var(--card);border:1px solid var(--card-border);
  border-radius:20px;padding:40px;
  position:relative;overflow:hidden;
}
.community-card::before{
  content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
  background:conic-gradient(from 0deg,transparent,rgba(135,202,55,0.04),transparent,rgba(240,180,41,0.03),transparent);
  animation:cardSpin 20s linear infinite;
}
@keyframes cardSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.community-card-inner{position:relative;z-index:1}
.community-card h3{
  font-family:'Outfit',sans-serif;font-weight:800;font-size:20px;
  margin-bottom:10px;
}
.community-card p{
  font-size:15px;color:var(--muted);margin-bottom:24px;
}
.community-card .btn-secondary{font-size:12px;padding:14px 28px}

/* ═══════════ FOOTER ═══════════ */
.footer{
  text-align:center;padding:24px;
  border-top:1px solid var(--border);
}
.footer p{font-size:12px;color:var(--muted);letter-spacing:1px}
.footer a{color:var(--accent);transition:color .3s}

/* ═══════════ RESPONSIVE ═══════════ */
@media(max-width:768px){
  .section{padding:72px 0}
  .hero{padding:100px 20px 50px}
  .countdown{gap:10px}
  .countdown-unit{min-width:60px;padding:12px 14px}
  .countdown-num{font-size:1.8rem}
  .schedule-card{
    grid-template-columns:1fr;gap:10px;padding:24px;
  }
  .schedule-badge{justify-self:start}
  .entry-row{gap:16px}
  .entry-price{padding:16px 24px}
  .entry-price .amount{font-size:2rem}
  .flyer-image{max-width:300px}
  .message-inner p{font-size:16px}
  .message-inner p.highlight{font-size:19px}
  .why-inner p{font-size:17px}
  .why-inner p.punch{font-size:20px}
  .btn-primary{padding:16px 32px;font-size:14px}
  .btn-secondary{padding:16px 28px;font-size:13px}
}

@media(max-width:480px){
  .hero-title{letter-spacing:1px}
  .hero-subtitle{letter-spacing:3px}
  .countdown{gap:6px}
  .countdown-unit{min-width:50px;padding:10px 8px}
  .countdown-num{font-size:1.5rem}
  .countdown-label{font-size:8px;letter-spacing:1px}
  .hero-ctas{flex-direction:column;align-items:center}
  .btn-primary,.btn-secondary{width:100%;justify-content:center}
  .cta-buttons{flex-direction:column;align-items:center}
  .cta-buttons .btn-primary,.cta-buttons .btn-secondary{width:100%;justify-content:center}
}

/* ═══════════ FLOATING ELEMENTS ═══════════ */
.floater{
  position:absolute;border-radius:50%;pointer-events:none;
  background:var(--accent);opacity:0.04;
  animation:float 12s ease-in-out infinite;
}
.floater:nth-child(1){width:300px;height:300px;top:10%;left:-5%;animation-delay:0s}
.floater:nth-child(2){width:200px;height:200px;bottom:20%;right:-3%;animation-delay:3s}
.floater:nth-child(3){width:150px;height:150px;top:60%;left:10%;animation-delay:6s;background:var(--gold)}
@keyframes float{
  0%,100%{transform:translate(0,0) scale(1)}
  33%{transform:translate(20px,-30px) scale(1.05)}
  66%{transform:translate(-15px,20px) scale(0.95)}
}
</style>
</head>
<body>

<!-- ═══════════ TOP BAR ═══════════ -->
<nav class="topbar" id="topbar">
  <div class="container topbar-inner">
    <span class="topbar-title">SOCPB Tournament</span>
    <a href="https://app.courtreserve.com/.../List/15268/ZAHHMQUZNF15268" class="topbar-cta" target="_blank" rel="noopener">Register Now</a>
  </div>
</nav>

<!-- ═══════════ HERO ═══════════ -->
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-lines"></div>
  <div class="floater"></div>
  <div class="floater"></div>
  <div class="floater"></div>

  <div class="hero-content">
    <div class="hero-date-badge reveal">
      <span class="dot"></span>
      Saturday, March 28, 2026
    </div>

    <h1 class="hero-title reveal stagger-1">South Orange County<br>Pickleball Tournament</h1>
    <p class="hero-subtitle reveal stagger-2">It's Going Down March 28th</p>
    <p class="hero-venue reveal stagger-3">
      <a href="https://www.cotopickle.com/" target="_blank" rel="noopener">Coto Pickleball Club</a>
      &nbsp;&bull;&nbsp; Coto de Caza, CA
    </p>

    <div class="hero-image-wrap reveal-scale stagger-3">
      <img src="images/abe-chip-mib.png" alt="Abe and Chip — your tournament hosts" width="1536" height="1024" loading="eager">
    </div>

    <!-- Countdown -->
    <div class="countdown reveal stagger-4" id="countdown">
      <div class="countdown-unit">
        <span class="countdown-num" id="cd-days">--</span>
        <span class="countdown-label">Days</span>
      </div>
      <div class="countdown-unit">
        <span class="countdown-num" id="cd-hours">--</span>
        <span class="countdown-label">Hours</span>
      </div>
      <div class="countdown-unit">
        <span class="countdown-num" id="cd-mins">--</span>
        <span class="countdown-label">Mins</span>
      </div>
      <div class="countdown-unit">
        <span class="countdown-num" id="cd-secs">--</span>
        <span class="countdown-label">Secs</span>
      </div>
    </div>

    <div class="hero-ctas reveal stagger-5">
      <a href="https://app.courtreserve.com/.../List/15268/ZAHHMQUZNF15268" class="btn-primary" target="_blank" rel="noopener">Register Now</a>
      <a href="#schedule" class="btn-secondary">View Schedule</a>
    </div>
  </div>
</section>

<!-- ═══════════ PERSONAL MESSAGE ═══════════ -->
<section class="message-section section">
  <div class="container">
    <div class="message-inner">
      <p class="message-label reveal">A Personal Invitation</p>

      <p class="reveal stagger-1">I've poured everything into building the <em>South Orange County Pickleball Community</em>. Time. Energy. Heart. Every post, every connection, every introduction&mdash;it's all been about one thing:</p>

      <p class="highlight reveal stagger-2">Bringing people together through this game we love.</p>

      <div class="message-divider reveal stagger-2"></div>

      <p class="reveal stagger-3">Last year&hellip; our community showed up. And what happened?</p>

      <p class="reveal stagger-3"><strong>It became the largest, most fun, most electric event the Coto Pickleball Club had all year.</strong></p>

      <p class="reveal stagger-4">Packed courts. Big smiles. New friendships. <em>Real community.</em></p>

      <div class="message-divider reveal stagger-4"></div>

      <p class="highlight reveal stagger-5">So we're doing it again.</p>

      <p class="reveal stagger-5">Abe (owner of <a href="https://www.cotopickle.com/" target="_blank" rel="noopener" style="color:var(--accent);border-bottom:1px solid var(--accent)">Coto Pickleball Club</a>) and I are putting this on together&mdash;<strong>for YOU.</strong></p>

      <p class="reveal stagger-6">Not for profit. Not for hype.<br><em>For the community we're building together.</em></p>
    </div>
  </div>
</section>

<!-- ═══════════ SCHEDULE ═══════════ -->
<section class="schedule-section section" id="schedule">
  <div class="container">
    <div class="section-heading">
      <p class="eyebrow reveal">Full Day of Play</p>
      <h2 class="reveal stagger-1">Tournament Schedule</h2>
    </div>

    <div class="schedule-grid">
      <div class="schedule-card reveal stagger-1">
        <div class="schedule-time">9:30 – 12:30</div>
        <div class="schedule-info">
          <h3>Non-DUPR Rated Doubles</h3>
          <p class="levels">Levels: 2.5 &bull; 3.0 &bull; 3.5 &bull; 4.0</p>
        </div>
        <span class="schedule-badge">Doubles</span>
      </div>

      <div class="schedule-card reveal stagger-2">
        <div class="schedule-time">12:30 – 3:30</div>
        <div class="schedule-info">
          <h3>DUPR Rated Doubles</h3>
          <p class="levels">Levels: 3.0 &bull; 3.5 &bull; 4.0</p>
        </div>
        <span class="schedule-badge">DUPR Rated</span>
      </div>

      <div class="schedule-card reveal stagger-3">
        <div class="schedule-time">3:30 – 6:30</div>
        <div class="schedule-info">
          <h3>Mixed Doubles (Non-DUPR)</h3>
          <p class="levels">Levels: 2.5 – 3.5</p>
        </div>
        <span class="schedule-badge">Mixed</span>
      </div>
    </div>

    <div class="entry-row reveal">
      <div class="entry-price">
        <span class="amount">$40</span>
        <span class="label">Members</span>
      </div>
      <div class="entry-price">
        <span class="amount">$50</span>
        <span class="label">Non-Members</span>
      </div>
    </div>

    <div class="flyer-section">
      <div class="flyer-image reveal-scale">
        <img src="images/tournament-flyer.jpeg" alt="South Orange County Pickleball Tournament Flyer" width="1024" height="1536" loading="lazy">
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ WHY THIS ONE IS DIFFERENT ═══════════ -->
<section class="why-section section">
  <div class="container">
    <div class="section-heading">
      <p class="eyebrow reveal">More Than a Tournament</p>
      <h2 class="reveal stagger-1">Why This One Is Different</h2>
    </div>

    <div class="why-inner">
      <p class="reveal">This isn't just another tournament.</p>
      <p class="punch reveal stagger-1">It's our community in one place.</p>
      <p class="reveal stagger-2">Every invite matters. Every player you bring grows this thing. Every match adds to the energy.</p>

      <div class="message-divider reveal stagger-3"></div>

      <p class="reveal stagger-3">If you've enjoyed being part of this group&mdash;even a little&mdash;this is your moment to support it.</p>

      <p class="action reveal stagger-4">Invite your friends. Bring your partners. Spread the word.</p>

      <p class="punch reveal stagger-5">Let's make this year even bigger than last.</p>
    </div>
  </div>
</section>

<!-- ═══════════ CTA SECTION ═══════════ -->
<section class="cta-section section">
  <div class="container">
    <div class="cta-inner">
      <div class="urgency-badge reveal">
        <span class="dot" style="width:6px;height:6px;border-radius:50%;background:#ff5040;animation:dotBlink 1.5s ease-in-out infinite"></span>
        Spots Will Fill Up
      </div>
      <h2 class="reveal stagger-1">Don't Wait. Register Today.</h2>
      <p class="reveal stagger-2">Secure your spot in the biggest South OC pickleball event of the year. Bring a friend&mdash;bring your whole crew.</p>
      <div class="cta-buttons reveal stagger-3">
        <a href="https://app.courtreserve.com/.../List/15268/ZAHHMQUZNF15268" class="btn-primary" target="_blank" rel="noopener">Register Now</a>
        <a href="https://www.facebook.com/groups/southocpickleballcommunity/" class="btn-secondary" target="_blank" rel="noopener">Join Our Community</a>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ CLOSING ═══════════ -->
<section class="closing-section">
  <div class="container">
    <p class="reveal"><strong>I'll be there. Abe will be there.</strong><br>And I'm expecting to see a LOT of familiar faces.</p>
    <p class="reveal stagger-1" style="margin-top:20px">Let's make this something special&hellip; <em style="color:var(--accent);font-style:normal;font-weight:600">again.</em></p>
    <p class="signoff reveal stagger-2">&mdash; Chip</p>
  </div>
</section>

<!-- ═══════════ COMMUNITY CARD ═══════════ -->
<section class="community-section">
  <div class="container">
    <div class="community-card reveal-scale">
      <div class="community-card-inner">
        <h3>Not in the community yet?</h3>
        <p>Join the South Orange County Pickleball Community on Facebook. Connect with hundreds of local players, find games, and stay in the loop.</p>
        <a href="https://www.facebook.com/groups/southocpickleballcommunity/" class="btn-secondary" target="_blank" rel="noopener">Join the Facebook Group</a>
      </div>
    </div>
  </div>
</section>

<!-- ═══════════ FOOTER ═══════════ -->
<footer class="footer">
  <p>South Orange County Pickleball Community &bull; <a href="https://www.cotopickle.com/" target="_blank" rel="noopener">Coto Pickleball Club</a></p>
</footer>

<script>
/* ═══════════ COUNTDOWN ═══════════ */
(function(){
  const target = new Date('2026-03-28T09:30:00-07:00').getTime();
  const $d = document.getElementById('cd-days');
  const $h = document.getElementById('cd-hours');
  const $m = document.getElementById('cd-mins');
  const $s = document.getElementById('cd-secs');
  function tick(){
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    $d.textContent = d;
    $h.textContent = h;
    $m.textContent = m < 10 ? '0' + m : m;
    $s.textContent = s < 10 ? '0' + s : s;
    if(diff > 0) requestAnimationFrame(()=>setTimeout(tick, 1000));
  }
  tick();
})();

/* ═══════════ SCROLL ANIMATIONS ═══════════ */
(function(){
  const els = document.querySelectorAll('.reveal,.reveal-scale,.reveal-left,.reveal-right');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.12,rootMargin:'0px 0px -40px 0px'});
  els.forEach(el=>obs.observe(el));
})();

/* ═══════════ NAVBAR SCROLL ═══════════ */
(function(){
  const bar = document.getElementById('topbar');
  let ticking = false;
  window.addEventListener('scroll',()=>{
    if(!ticking){
      requestAnimationFrame(()=>{
        bar.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });
})();
</script>
</body>
</html>
