<?php
// report.php — the page a shared match link opens. Server-rendered so the
// SMS/social preview (OG image) is the ACTUAL match report, and the page
// doubles as an invitation for people who don't have PlayPBNow yet.
$img = $_GET['img'] ?? '';
// Security: only allow the exact generated-report filename pattern (no traversal).
if (!preg_match('/^match_report_\d+\.png$/', $img)) { $img = ''; }
$scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$host   = $_SERVER['HTTP_HOST'] ?? 'playpbnow.com';
$base   = "$scheme://$host";
// Only reference the match image if it actually exists on disk — old shared
// links whose image has aged out fall back gracefully instead of a broken img.
$imgExists = $img !== '' && is_file(__DIR__ . "/reports/$img");
$imgUrl = $imgExists ? "$base/reports/$img" : "$base/og-invite.png";
$pageUrl = "$base/report.php" . ($img ? "?img=" . rawurlencode($img) : '');
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You're Invited to Play Pickleball — PlayPBNow</title>
<meta name="description" content="You've been invited to a pickleball match. See the lineup, court and time — then grab your paddle and play.">
<!-- Rich link preview: the actual match report image -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Play Pickleball NOW!">
<meta property="og:title" content="You're Invited to Play Pickleball!">
<meta property="og:description" content="Your match is set — tap to see the lineup, court &amp; time. Grab a paddle and let's play!">
<meta property="og:image" content="<?php echo htmlspecialchars($imgUrl); ?>">
<meta property="og:url" content="<?php echo htmlspecialchars($pageUrl); ?>">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="You're Invited to Play Pickleball!">
<meta name="twitter:description" content="Your match is set — tap to see the lineup, court &amp; time. Grab a paddle and let's play!">
<meta name="twitter:image" content="<?php echo htmlspecialchars($imgUrl); ?>">
<meta name="theme-color" content="#0f1b2d">
<link rel="icon" href="/playpbnow-app-icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#0f1b2d;--card:#152945;--accent:#87ca37;--accent2:#b6f24a;--text:#fff;--muted:rgba(255,255,255,.6);--soft:rgba(255,255,255,.8);--border:rgba(135,202,55,.18)}
  body{font-family:'DM Sans',system-ui,sans-serif;background:radial-gradient(ellipse 900px 600px at 50% -5%,rgba(135,202,55,.10),transparent 60%),var(--bg);color:var(--text);min-height:100vh;line-height:1.6;padding:28px 18px 48px}
  h1,h2,h3,.display{font-family:'Outfit',sans-serif}
  .wrap{max-width:600px;margin:0 auto}
  .brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:22px}
  .brand img{height:76px;width:auto;filter:drop-shadow(0 0 14px rgba(135,202,55,.28))}
  .pill{display:inline-flex;align-items:center;gap:8px;background:rgba(135,202,55,.12);border:1px solid var(--border);color:var(--accent);font-family:'Outfit';font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding:7px 16px;border-radius:50px}
  .ball{width:1.15em;height:1.15em;vertical-align:-0.2em;object-fit:contain;display:inline-block}
  .hero{text-align:center;margin-bottom:24px}
  .hero h1{font-weight:900;font-size:clamp(2rem,7vw,2.9rem);line-height:1.04;letter-spacing:-1.5px;margin:16px 0 10px}
  .hero h1 .g{background:linear-gradient(120deg,var(--accent2),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-style:italic}
  .hero p{color:var(--soft);font-size:1.08rem;max-width:440px;margin:0 auto}
  .card{background:linear-gradient(160deg,rgba(30,58,95,.85),rgba(15,27,45,.9));border:1px solid var(--border);border-radius:22px;padding:16px;box-shadow:0 30px 70px rgba(0,0,0,.45),0 0 50px rgba(135,202,55,.06);margin-bottom:24px}
  .card img.report{width:100%;height:auto;border-radius:14px;display:block}
  .noimg{padding:60px 20px;text-align:center;color:var(--muted)}
  .ctas{display:flex;flex-direction:column;gap:12px;margin-bottom:28px}
  .btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:17px 24px;border-radius:16px;font-family:'Outfit';font-weight:800;font-size:16px;text-decoration:none;letter-spacing:.4px;cursor:pointer;border:none;transition:transform .2s,box-shadow .2s}
  .btn-primary{background:linear-gradient(120deg,var(--accent2),var(--accent));color:#0f1b2d;box-shadow:0 6px 26px rgba(135,202,55,.32)}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(135,202,55,.45)}
  .btn-ghost{background:rgba(255,255,255,.05);color:var(--text);border:1.5px solid rgba(255,255,255,.16)}
  .btn-ghost:hover{border-color:var(--accent);background:rgba(135,202,55,.1)}
  .btn-sub{font-family:'Outfit';font-weight:600;font-size:13px}
  .applink{text-align:center;margin-bottom:32px}
  .applink a{color:var(--muted);font-size:14px;text-decoration:none;border-bottom:1px dashed rgba(255,255,255,.25);padding-bottom:1px}
  .applink a:hover{color:var(--accent)}
  .about{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:26px 24px;text-align:center}
  .about h2{font-weight:800;font-size:1.25rem;margin-bottom:10px}
  .about h2 .g{color:var(--accent)}
  .about p{color:var(--muted);font-size:.98rem;max-width:460px;margin:0 auto 20px}
  .feats{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;margin-bottom:22px}
  .feat{text-align:center}
  .feat .n{font-family:'Outfit';font-weight:900;font-size:1.5rem;color:var(--accent)}
  .feat .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px}
  .foot{text-align:center;color:rgba(255,255,255,.35);font-size:12px;margin-top:30px}
  @media print{
    /* Landscape by default, and print ONLY the match image — no page chrome,
       no headline — so it's exactly one page (no blank second page). */
    @page{ size: landscape; margin: 10mm; }
    html,body{background:#fff!important;margin:0!important;padding:0!important;height:auto!important}
    .brand,.pill,.hero,.ctas,.applink,.about,.foot{display:none!important}
    .wrap{max-width:none!important;margin:0!important;padding:0!important}
    .card{box-shadow:none!important;border:none!important;background:#fff!important;padding:0!important;margin:0!important;page-break-inside:avoid;break-inside:avoid}
    .card img.report{display:block;width:auto;max-width:100%;max-height:180mm;height:auto;margin:0 auto}
    .noimg{color:#000}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <img src="/og-invite.png" alt="Play Pickleball NOW!">
  </div>

  <div class="hero">
    <span class="pill"><img class="ball" src="/pickleball.png" alt=""> You're Invited</span>
    <h1>You're Invited to<br>Play <span class="g">Pickleball.</span></h1>
    <p>Here's your match — the lineup, court, and time are all set. Grab a paddle and let's play!</p>
  </div>

  <div class="card">
    <?php if ($imgExists): ?>
      <img class="report" id="reportImage" src="<?php echo htmlspecialchars($imgUrl); ?>" alt="Your pickleball match schedule">
    <?php else: ?>
      <div class="noimg">
        <img src="/pickleball.png" alt="" style="width:64px;height:64px;opacity:.92;margin-bottom:14px">
        <div style="font-family:'Outfit';font-weight:800;font-size:1.15rem;color:#fff;margin-bottom:6px">Ready to play?</div>
        <div>This match link has aged out — join the pool below and the next invite lands right on your phone.</div>
      </div>
    <?php endif; ?>
  </div>

  <div class="ctas">
    <a class="btn btn-primary" href="/player-signup.html">Join the Player Pool — It's Free <img class="ball" src="/pickleball.png" alt=""></a>
    <button class="btn btn-ghost" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="applink">
    <a href="/app.html">Already have PlayPBNow? Open the app →</a>
  </div>

  <div class="about">
    <h2>New to <span class="g">Play Pickleball NOW!</span>?</h2>
    <p>It's the fastest way to get on the court. Coordinators fill their games in minutes, and players get invited to real matches near them — no more chasing group texts.</p>
    <div class="feats">
      <div class="feat"><div class="n">500+</div><div class="l">Eager Players</div></div>
      <div class="feat"><div class="n">Minutes</div><div class="l">To Fill a Game</div></div>
      <div class="feat"><div class="n">223</div><div class="l">Courts</div></div>
    </div>
    <a class="btn btn-primary" href="/player-signup.html" style="max-width:320px;margin:0 auto">Get Invited to Play — Join Free</a>
  </div>

  <div class="foot">Powered by Play Pickleball NOW! · playpbnow.com</div>
</div>
</body>
</html>
