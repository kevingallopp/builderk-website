import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const imagesDir = path.join(root, "images");

const plans = [
  {
    sqft: 1450,
    beds: "3",
    baths: "2",
    garage: "2-Car",
    story: "Single Story",
    storyFilter: "1-story",
    sizeFilter: "small",
    slug: "floor-plan-1450-sq-ft",
    image: "plan-1450.svg",
    tagline: "A compact single-story layout with an open kitchen and living core, private primary suite, and efficient bedroom wing.",
    highlights: ["Efficient rectangular footprint", "Open kitchen and great room", "Private primary suite"],
    layout: {
      panels: [
        {
          title: "First Floor",
          rooms: [
            [50, 70, 300, 210, "Great Room"],
            [350, 70, 230, 170, "Kitchen"],
            [580, 70, 160, 170, "Dining"],
            [50, 280, 270, 210, "Primary Suite"],
            [320, 280, 135, 105, "Primary Bath"],
            [455, 280, 125, 105, "WIC"],
            [580, 240, 160, 125, "Bed 2"],
            [580, 365, 160, 125, "Bed 3"],
            [455, 385, 125, 105, "Bath 2"],
            [740, 70, 280, 250, "2-Car Garage"],
            [740, 320, 280, 170, "Laundry / Entry"],
          ],
        },
      ],
    },
  },
  {
    sqft: 1850,
    beds: "3",
    baths: "2",
    garage: "2-Car",
    story: "Single Story",
    storyFilter: "1-story",
    sizeFilter: "medium",
    slug: "floor-plan-1850-sq-ft",
    image: "plan-1850.svg",
    tagline: "A single-story plan with a flexible front room, open gathering space, and a split-bedroom arrangement for privacy.",
    highlights: ["Front flex room or office", "Split-bedroom layout", "Covered lanai connection"],
    layout: {
      panels: [
        {
          title: "First Floor",
          rooms: [
            [50, 70, 230, 160, "Flex / Office"],
            [280, 70, 290, 220, "Great Room"],
            [570, 70, 230, 170, "Kitchen"],
            [800, 70, 170, 170, "Dining"],
            [280, 290, 520, 90, "Covered Lanai"],
            [50, 230, 275, 230, "Primary Suite"],
            [325, 380, 135, 110, "Primary Bath"],
            [460, 380, 125, 110, "WIC"],
            [800, 240, 170, 125, "Bed 2"],
            [800, 365, 170, 125, "Bed 3"],
            [650, 380, 150, 110, "Bath 2"],
            [970, 70, 280, 260, "2-Car Garage"],
            [970, 330, 280, 160, "Laundry / Drop"],
          ],
        },
      ],
    },
  },
  {
    sqft: 2200,
    beds: "4",
    baths: "3",
    garage: "2-Car",
    story: "Single Story",
    storyFilter: "1-story",
    sizeFilter: "large",
    slug: "floor-plan-2200-sq-ft",
    image: "plan-2200.svg",
    tagline: "A larger single-story plan with four bedrooms, three baths, and a strong indoor-outdoor living connection.",
    highlights: ["Four bedrooms on one level", "Guest suite option", "Large great room and lanai"],
    layout: {
      panels: [
        {
          title: "First Floor",
          rooms: [
            [50, 70, 260, 165, "Guest Suite"],
            [310, 70, 150, 110, "Bath 3"],
            [460, 70, 330, 230, "Great Room"],
            [790, 70, 230, 170, "Kitchen"],
            [1020, 70, 160, 170, "Dining"],
            [460, 300, 560, 95, "Covered Lanai"],
            [50, 235, 300, 255, "Primary Suite"],
            [350, 380, 150, 110, "Primary Bath"],
            [500, 380, 130, 110, "WIC"],
            [790, 240, 190, 125, "Bed 2"],
            [980, 240, 200, 125, "Bed 3"],
            [790, 365, 190, 125, "Bath 2"],
            [980, 365, 200, 125, "Laundry"],
            [1180, 70, 300, 260, "2-Car Garage"],
          ],
        },
      ],
    },
  },
  {
    sqft: 2650,
    beds: "4",
    baths: "3",
    garage: "2-Car",
    story: "Two Story",
    storyFilter: "2-story",
    sizeFilter: "large",
    slug: "floor-plan-2650-sq-ft",
    image: "plan-2650.svg",
    tagline: "A two-story family plan with primary suite downstairs, upstairs bedrooms, and a flexible loft.",
    highlights: ["Primary suite on first floor", "Upstairs loft", "Four-bedroom layout"],
    layout: {
      panels: [
        {
          title: "First Floor",
          rooms: [
            [45, 85, 260, 205, "Primary Suite"],
            [305, 85, 130, 105, "Primary Bath"],
            [435, 85, 120, 105, "WIC"],
            [305, 190, 360, 210, "Great Room"],
            [665, 190, 220, 155, "Kitchen"],
            [885, 190, 140, 155, "Dining"],
            [555, 85, 240, 105, "Office"],
            [795, 85, 230, 105, "Stairs / Entry"],
            [45, 290, 260, 110, "Lanai"],
            [1025, 85, 280, 255, "2-Car Garage"],
            [1025, 340, 280, 60, "Laundry"],
          ],
        },
        {
          title: "Second Floor",
          rooms: [
            [45, 505, 250, 165, "Bed 2"],
            [295, 505, 250, 165, "Bed 3"],
            [545, 505, 250, 165, "Bed 4"],
            [795, 505, 180, 165, "Bath 2"],
            [975, 505, 330, 165, "Loft"],
          ],
        },
      ],
    },
  },
  {
    sqft: 3050,
    beds: "4",
    baths: "3.5",
    garage: "3-Car",
    story: "Two Story",
    storyFilter: "2-story",
    sizeFilter: "large",
    slug: "floor-plan-3050-sq-ft",
    image: "plan-3050.svg",
    tagline: "A larger two-story layout with a downstairs office, primary suite, upstairs loft, and three-car garage.",
    highlights: ["Three-car garage", "Dedicated office", "Large upstairs loft"],
    layout: {
      panels: [
        {
          title: "First Floor",
          rooms: [
            [45, 85, 260, 220, "Primary Suite"],
            [305, 85, 145, 115, "Primary Bath"],
            [450, 85, 130, 115, "WIC"],
            [305, 200, 370, 205, "Great Room"],
            [675, 200, 230, 155, "Kitchen"],
            [905, 200, 145, 155, "Dining"],
            [580, 85, 230, 115, "Office"],
            [810, 85, 240, 115, "Entry / Stairs"],
            [45, 305, 260, 100, "Lanai"],
            [1050, 85, 360, 260, "3-Car Garage"],
            [1050, 345, 170, 60, "Laundry"],
            [1220, 345, 190, 60, "Powder"],
          ],
        },
        {
          title: "Second Floor",
          rooms: [
            [45, 505, 255, 165, "Bed 2"],
            [300, 505, 255, 165, "Bed 3"],
            [555, 505, 255, 165, "Bed 4"],
            [810, 505, 170, 165, "Bath 2"],
            [980, 505, 170, 165, "Bath 3"],
            [1150, 505, 260, 165, "Loft"],
          ],
        },
      ],
    },
  },
  {
    sqft: 3300,
    beds: "5",
    baths: "4",
    garage: "3-Car",
    story: "Two Story",
    storyFilter: "2-story",
    sizeFilter: "large",
    slug: "floor-plan-3300-sq-ft",
    image: "plan-3300.svg",
    tagline: "A five-bedroom two-story plan designed for buyers who need guest space, office flexibility, and a larger garage.",
    highlights: ["Five bedrooms", "Guest suite plus loft", "Three-car garage"],
    layout: {
      panels: [
        {
          title: "First Floor",
          rooms: [
            [45, 85, 255, 205, "Primary Suite"],
            [300, 85, 145, 105, "Primary Bath"],
            [445, 85, 125, 105, "WIC"],
            [300, 190, 360, 215, "Great Room"],
            [660, 190, 235, 155, "Kitchen"],
            [895, 190, 155, 155, "Dining"],
            [570, 85, 240, 105, "Guest Suite"],
            [810, 85, 110, 105, "Bath 4"],
            [920, 85, 130, 105, "Entry"],
            [45, 290, 255, 115, "Lanai"],
            [1050, 85, 370, 260, "3-Car Garage"],
            [1050, 345, 185, 60, "Laundry"],
            [1235, 345, 185, 60, "Storage"],
          ],
        },
        {
          title: "Second Floor",
          rooms: [
            [45, 505, 235, 165, "Bed 3"],
            [280, 505, 235, 165, "Bed 4"],
            [515, 505, 235, 165, "Bed 5"],
            [750, 505, 165, 165, "Bath 2"],
            [915, 505, 165, 165, "Bath 3"],
            [1080, 505, 340, 165, "Loft / Flex"],
          ],
        },
      ],
    },
  },
];

const existingPlans = [
  { sqft: 1700, beds: "3", baths: "2", garage: "2-Car", story: "Single Story", slug: "floor-plan-1700-sq-ft", image: "plan-1700.png" },
  { sqft: 1977, beds: "4", baths: "2.5", garage: "2-Car", story: "Two Story", slug: "floor-plan-1977-sq-ft", image: "plan-1977.png" },
  { sqft: 2377, beds: "5", baths: "3", garage: "2-Car", story: "Two Story", slug: "floor-plan-2377-sq-ft", image: "plan-2377.png" },
];

const allPlans = [...existingPlans, ...plans].sort((a, b) => a.sqft - b.sqft);

function formatSqft(sqft) {
  return sqft.toLocaleString("en-US");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function planSvg(plan) {
  const panelHeight = plan.layout.panels.length > 1 ? 800 : 620;
  const viewBox = `0 0 1500 ${panelHeight}`;
  const roomYOffset = 34;
  const roomMarkup = plan.layout.panels
    .map((panel) => {
      const rooms = panel.rooms
        .map(([x, y, w, h, label]) => {
          const adjustedY = y + roomYOffset;
          const isGarage = label.toLowerCase().includes("garage");
          const fill = isGarage ? "#efe7d8" : "#fffaf0";
          const fontSize = label.length > 14 ? 20 : 24;
          return `
    <rect x="${x}" y="${adjustedY}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="#111" stroke-width="4"/>
    <text x="${x + w / 2}" y="${adjustedY + h / 2 + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111">${escapeHtml(label)}</text>`;
        })
        .join("");
      return `
    <text x="50" y="${panel.rooms[0][1] + roomYOffset - 18}" font-family="Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="3" fill="#f77f00">${escapeHtml(panel.title.toUpperCase())}</text>
    ${rooms}`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title desc">
  <title id="title">${formatSqft(plan.sqft)} sq ft ${plan.story.toLowerCase()} floor plan</title>
  <desc id="desc">${plan.beds} bedroom, ${plan.baths} bath ${plan.story.toLowerCase()} concept floor plan with ${plan.garage} garage.</desc>
  <rect width="1500" height="${panelHeight}" fill="#faf8f3"/>
  <rect x="24" y="24" width="1452" height="${panelHeight - 48}" rx="24" fill="#fff" stroke="#e8e0d0" stroke-width="4"/>
  <text x="50" y="58" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#111">BUILDER<tspan fill="#f77f00">K</tspan> ${formatSqft(plan.sqft)} SQ FT PLAN</text>
  <text x="1450" y="58" text-anchor="end" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#6b6b6b">${plan.beds} BED / ${plan.baths} BATH / ${plan.garage.toUpperCase()}</text>
  ${roomMarkup}
  <text x="50" y="${panelHeight - 42}" font-family="Arial, sans-serif" font-size="18" fill="#6b6b6b">Concept floor plan for website review. Final construction drawings require site-specific architectural/engineering review.</text>
</svg>`;
}

function navHtml() {
  return `<nav class="navbar" id="navbar">
  <a href="/" class="nav-logo"><span class="builder">BUILDER</span><span class="k" style="margin-left:-3px;">K</span></a>
  <ul class="nav-links" id="nav-links">
    <li><a href="/#process">How It Works</a></li>
    <li><a href="/floor-plans" style="color:var(--orange);">Floor Plans</a></li>
    <li><a href="/financing">Financing</a></li>
    <li><a href="/calculator">Calculator</a></li>
    <li><a href="/#contact" class="nav-cta">Talk to a Builder</a></li>
  </ul>
  <button class="nav-hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links" type="button"><span></span><span></span><span></span></button>
</nav>`;
}

function footerHtml() {
  return `<footer class="footer">
  <div class="footer-inner">
    <div class="footer-top">
      <div class="footer-brand"><a href="/" class="nav-logo"><span class="builder">BUILDER</span><span class="k" style="margin-left:-3px;">K</span></a><p>Custom home builders in Florida. You bring the lot &mdash; we build your dream home from the ground up.</p></div>
      <div class="footer-col"><h4>Company</h4><a href="/">Home</a><a href="/about">About Us</a><a href="/#process">How It Works</a><a href="/floor-plans">Floor Plans</a><a href="/facades">Facades & Styles</a></div>
      <div class="footer-col"><h4>Services</h4><a href="/">Custom Homes</a><a href="/financing">Financing</a><a href="/calculator">Pricing Calculator</a><a href="/interiors">Interior Selections</a><a href="/construction">Construction</a><a href="/resources">Resources</a></div>
      <div class="footer-col"><h4>Contact</h4><a href="tel:2392304868">(239) 230-4868</a><a href="mailto:info@builderk.com">info@builderk.com</a><a href="https://maps.google.com/?q=4700+Millenia+Blvd+Ste+500+Orlando+FL+32839" target="_blank" rel="noopener">Orlando, FL</a></div>
    </div>
    <div class="footer-bottom"><span>&copy; 2026 Builders Knowledge Development Inc. All rights reserved.</span><a href="/privacy">Privacy Policy</a> &middot; <a href="/terms">Terms & Conditions</a></div>
  </div>
</footer>`;
}

function sharedStyle() {
  return `<style>
:root { --orange:#F77F00; --orange-hover:#FF9A2E; --dark:#0A0A0A; --light:#FAFAF8; --gray-100:#F5F5F3; --gray-200:#E8E8E5; --gray-600:#6B6B6B; --gray-800:#2A2A2A; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DM Sans', sans-serif; color:var(--dark); background:var(--light); -webkit-font-smoothing:antialiased; }
h1,h2,h3,h4 { font-family:'Outfit', sans-serif; }
.navbar { position:fixed; top:0; left:0; right:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:20px 48px; background:rgba(10,10,10,0.92); backdrop-filter:blur(12px); transition:all 0.3s; }
.navbar.scrolled { padding:14px 48px; background:rgba(10,10,10,0.97); }
.nav-logo { text-decoration:none; display:flex; align-items:baseline; }
.nav-logo .builder,.nav-logo .k { font-family:'Outfit', sans-serif; font-weight:800; font-size:1.6rem; letter-spacing:1px; }
.nav-logo .builder { color:#fff; }
.nav-logo .k { color:var(--orange); }
.nav-links { display:flex; align-items:center; gap:28px; list-style:none; }
.nav-links a { color:#ccc; text-decoration:none; font-size:0.92rem; font-weight:500; transition:color 0.2s; }
.nav-links a:hover { color:var(--orange); }
.nav-cta { background:var(--orange) !important; color:#fff !important; padding:10px 22px; border-radius:8px; font-weight:600 !important; }
.nav-cta:hover { background:var(--orange-hover) !important; }
.nav-hamburger { display:none; flex-direction:column; gap:5px; cursor:pointer; background:none; border:none; padding:4px; z-index:1000; position:relative; }
.nav-hamburger span { width:26px; height:2px; background:#fff; border-radius:2px; transition:transform 0.3s, opacity 0.3s; }
.crumbs { padding:100px 48px 16px; max-width:1400px; margin:0 auto; }
.crumbs a { color:var(--gray-600); text-decoration:none; font-size:0.85rem; }
.crumbs a:hover { color:var(--orange); }
.crumbs span { color:var(--gray-600); font-size:0.85rem; margin:0 6px; }
.plan-hero { padding:24px 48px 64px; max-width:1400px; margin:0 auto; display:grid; grid-template-columns:1.4fr 1fr; gap:48px; align-items:start; }
.plan-image-wrap { background:#FAF8F3; border-radius:16px; overflow:hidden; cursor:zoom-in; position:relative; border:1px solid var(--gray-200); }
.plan-image-wrap img { width:100%; height:auto; display:block; transition:transform 0.3s; }
.plan-image-wrap:hover img { transform:scale(1.01); }
.plan-image-wrap::after { content:'Click to enlarge'; position:absolute; bottom:12px; right:12px; background:rgba(10,10,10,0.74); color:#fff; padding:6px 10px; border-radius:6px; font-size:0.8rem; opacity:0; transition:opacity 0.2s; }
.plan-image-wrap:hover::after { opacity:1; }
.plan-label { display:inline-block; font-family:'Outfit',sans-serif; font-weight:700; font-size:0.75rem; letter-spacing:1.5px; color:var(--orange); background:rgba(247,127,0,0.1); padding:5px 11px; border-radius:4px; text-transform:uppercase; margin-bottom:14px; }
.plan-info h1 { font-size:2.8rem; font-weight:800; margin-bottom:10px; letter-spacing:-0.5px; }
.plan-tagline { color:var(--gray-600); font-size:1.05rem; line-height:1.6; margin-bottom:24px; }
.specs-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-bottom:28px; }
.spec { padding:16px 18px; background:#fff; border-radius:10px; border:1px solid var(--gray-200); }
.spec-label { font-size:0.72rem; letter-spacing:1px; text-transform:uppercase; color:var(--gray-600); margin-bottom:4px; }
.spec-value { font-family:'Outfit',sans-serif; font-weight:700; font-size:1.2rem; color:var(--dark); }
.price-box { padding:20px 22px; background:var(--dark); color:#fff; border-radius:12px; margin-bottom:24px; }
.price-box .label { font-size:0.78rem; letter-spacing:1px; text-transform:uppercase; color:#888; }
.price-box .price { font-family:'Outfit',sans-serif; font-weight:800; font-size:1.3rem; color:var(--orange); margin-top:4px; }
.price-box .note { font-size:0.82rem; color:#aaa; margin-top:6px; line-height:1.55; }
.cta-row { display:flex; gap:12px; flex-wrap:wrap; }
.btn-primary,.btn-outline { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; text-decoration:none; border-radius:10px; font-weight:600; font-size:0.95rem; transition:background 0.2s, transform 0.2s, color 0.2s; }
.btn-primary { background:var(--orange); color:#fff; }
.btn-primary:hover { background:var(--orange-hover); transform:translateY(-2px); }
.btn-outline { color:var(--dark); border:2px solid var(--dark); }
.btn-outline:hover { background:var(--dark); color:#fff; }
.section { padding:80px 48px; }
.section-inner { max-width:1200px; margin:0 auto; }
.section h2 { font-size:2rem; font-weight:800; margin-bottom:12px; letter-spacing:-0.5px; }
.section p.lead { color:var(--gray-600); font-size:1.05rem; line-height:1.7; max-width:700px; margin-bottom:36px; }
.features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.feature { padding:28px; background:#fff; border-radius:14px; border:1px solid var(--gray-200); }
.feature h3 { font-size:1.1rem; margin-bottom:6px; }
.feature p { color:var(--gray-600); font-size:0.92rem; line-height:1.6; }
.related { background:var(--gray-100); }
.related-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.related-card { background:#fff; border-radius:14px; overflow:hidden; text-decoration:none; color:inherit; display:block; transition:transform 0.3s, box-shadow 0.3s; }
.related-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.06); }
.related-card .img { aspect-ratio:16/10; background:#FAF8F3; }
.related-card .img img { width:100%; height:100%; object-fit:contain; }
.related-card .body { padding:20px; display:flex; justify-content:space-between; align-items:center; gap:12px; }
.related-card .body h3 { font-size:1.1rem; }
.related-card .arrow { color:var(--orange); font-weight:700; }
.cta-section { padding:100px 48px; background:var(--dark); text-align:center; }
.cta-section h2 { font-size:2.6rem; font-weight:800; color:#fff; margin-bottom:16px; }
.cta-section h2 span { color:var(--orange); }
.cta-section p { font-size:1.1rem; color:#aaa; max-width:600px; margin:0 auto 32px; line-height:1.6; }
.footer { background:var(--dark); padding:60px 48px 30px; border-top:1px solid rgba(255,255,255,0.06); }
.footer-inner { max-width:1200px; margin:0 auto; }
.footer-top { display:flex; justify-content:space-between; gap:48px; margin-bottom:40px; flex-wrap:wrap; }
.footer-brand { max-width:280px; }
.footer-brand p { color:#888; font-size:0.9rem; margin-top:12px; line-height:1.5; }
.footer-col { display:flex; flex-direction:column; gap:10px; }
.footer-col h4 { color:#fff; font-family:'Outfit',sans-serif; font-weight:600; font-size:0.95rem; margin-bottom:4px; }
.footer-col a { color:#888; text-decoration:none; font-size:0.88rem; transition:color 0.2s; }
.footer-col a:hover { color:var(--orange); }
.footer-bottom { display:flex; justify-content:space-between; align-items:center; padding-top:24px; border-top:1px solid rgba(255,255,255,0.06); color:#555; font-size:0.82rem; }
.lightbox { position:fixed; inset:0; background:rgba(10,10,10,0.95); display:none; align-items:center; justify-content:center; z-index:9999; padding:40px; cursor:zoom-out; }
.lightbox.open { display:flex; }
.lightbox img { max-width:95%; max-height:95vh; background:#FAF8F3; }
.lightbox .close { position:absolute; top:24px; right:32px; color:#fff; font-size:2rem; cursor:pointer; background:none; border:none; }
@media (max-width:900px) { .nav-links { display:none; } .nav-hamburger { display:flex !important; } .navbar { padding:14px 20px !important; } .crumbs { padding:90px 20px 8px; } .plan-hero { grid-template-columns:1fr; padding:16px 20px 40px; gap:24px; } .plan-info h1 { font-size:2rem; } .section { padding:56px 20px; } .features-grid,.related-grid { grid-template-columns:1fr; } .cta-section { padding:60px 24px; } .cta-section h2 { font-size:1.9rem; } .footer { padding:40px 20px 24px; } .footer-top { flex-direction:column; gap:32px; } .footer-bottom { flex-direction:column; gap:8px; text-align:center; } }
.nav-links.open { display:flex !important; flex-direction:column; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(10,10,10,0.98); z-index:999; justify-content:flex-start; align-items:center; gap:24px; padding:88px 24px 32px; overflow-y:auto; }
.nav-links.open li { list-style:none; }
.nav-links.open li a { font-size:1.4rem; padding:12px 0; color:#fff; }
.nav-hamburger.active span:nth-child(1) { transform:rotate(45deg) translate(5px,5px); }
.nav-hamburger.active span:nth-child(2) { opacity:0; }
.nav-hamburger.active span:nth-child(3) { transform:rotate(-45deg) translate(5px,-5px); }
/* === FULL-SCREEN MOBILE MENU FIX === */
@media (max-width: 1280px) {
  body:has(.nav-links.open),
  body:has(.nav-links.show) { overflow: hidden; }
  .navbar:has(.nav-links.open),
  .navbar:has(.nav-links.show),
  nav:has(.nav-links.open),
  nav:has(.nav-links.show) {
    position: fixed !important; top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;
    transform: none !important; width: 100% !important; max-width: none !important; height: 100dvh !important; min-height: 100dvh !important;
    padding: 18px 20px !important; border: 0 !important; border-radius: 0 !important; background: rgba(10, 10, 10, 0.98) !important;
    overflow: hidden !important; z-index: 10000 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
  }
  .navbar:has(.nav-links.open) .nav-logo,
  .navbar:has(.nav-links.show) .nav-logo,
  nav:has(.nav-links.open) .nav-logo,
  nav:has(.nav-links.show) .nav-logo,
  nav:has(.nav-links.open) .logo,
  nav:has(.nav-links.show) .logo {
    position: fixed !important; top: 22px !important; left: 20px !important; z-index: 10002 !important;
  }
  .navbar:has(.nav-links.open) .nav-hamburger,
  .navbar:has(.nav-links.show) .nav-hamburger,
  nav:has(.nav-links.open) .nav-hamburger,
  nav:has(.nav-links.show) .nav-hamburger,
  nav:has(.nav-links.open) .mobile-menu,
  nav:has(.nav-links.show) .mobile-menu {
    position: fixed !important; top: 20px !important; right: 20px !important; z-index: 10003 !important;
  }
  .navbar:has(.nav-links.open) .nav-links.open,
  .navbar:has(.nav-links.show) .nav-links.show,
  nav:has(.nav-links.open) .nav-links.open,
  nav:has(.nav-links.show) .nav-links.show {
    position: fixed !important; inset: 0 !important; width: 100% !important; height: 100dvh !important; min-height: 100dvh !important;
    max-height: none !important; margin: 0 !important; padding: 96px 24px 48px !important; overflow-y: auto !important;
    background: rgba(10, 10, 10, 0.98) !important; z-index: 10001 !important; display: flex !important; flex-direction: column !important;
    justify-content: flex-start !important; align-items: center !important; gap: 22px !important;
  }
}
</style>`;
}

function pageScript() {
  return `<script>
var navbar = document.getElementById('navbar');
if (navbar) window.addEventListener('scroll', function() { if (window.pageYOffset > 60) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled'); });
var hamburger = document.getElementById('hamburger');
var navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', function() {
    var isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open menu');
      document.body.style.overflow = '';
    }
  });
  navLinks.querySelectorAll('a').forEach(function(link) { link.addEventListener('click', function() { navLinks.classList.remove('open'); hamburger.classList.remove('active'); document.body.style.overflow = ''; }); });
}
function openLightbox(src) { var lb = document.getElementById('lightbox'); var img = document.getElementById('lightboxImg'); img.src = src; lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('planImage').addEventListener('click', function() { openLightbox(this.querySelector('img').src); });
document.getElementById('lightbox').addEventListener('click', function(e) { if (e.target === this) closeLightbox(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });
document.querySelectorAll('a[href^="tel:"]').forEach(function(a){ a.addEventListener('click', function(){ if (typeof gtag === 'function') gtag('event', 'phone_click', { 'page_path': location.pathname }); }); });
</script>`;
}

function detailPage(plan) {
  const related = allPlans.filter((item) => item.slug !== plan.slug).slice(0, 3);
  const relatedCards = related.map((item) => `
      <a href="/${item.slug}" class="related-card">
        <div class="img"><img src="/images/${item.image}" alt="${formatSqft(item.sqft)} sq ft floor plan"></div>
        <div class="body"><div><h3>${formatSqft(item.sqft)} Sq Ft Plan</h3><div style="color:var(--gray-600);font-size:0.85rem;margin-top:2px;">${item.beds} Bed &middot; ${item.baths} Bath &middot; ${formatSqft(item.sqft)} sq ft &middot; ${item.story}</div></div><span class="arrow">View &rarr;</span></div>
      </a>`).join("");

  const highlightCards = plan.highlights.map((highlight) => `
      <div class="feature"><h3>${escapeHtml(highlight)}</h3><p>This plan can be adjusted for your lot, budget, local code requirements, and finish selections before construction drawings are finalized.</p></div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<script src="/scripts/lead-attribution.js"></script>
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S03X1HTEDN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-S03X1HTEDN');
  gtag('config', 'AW-11388675250');
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${formatSqft(plan.sqft)} Sq Ft Floor Plan - ${plan.beds} Bed ${plan.baths} Bath | BuilderK Florida</title>
<meta name="description" content="${formatSqft(plan.sqft)} sq ft ${plan.story.toLowerCase()} custom home concept floor plan: ${plan.beds} bedrooms, ${plan.baths} baths, ${plan.garage} garage. Customizable for your Florida lot.">
<link rel="canonical" href="https://www.builderk.com/${plan.slug}">
<meta property="og:title" content="${formatSqft(plan.sqft)} Sq Ft Floor Plan | BuilderK">
<meta property="og:description" content="${plan.beds} bed, ${plan.baths} bath ${plan.story.toLowerCase()} concept floor plan. Built on your Florida lot.">
<meta property="og:type" content="article">
<meta property="og:url" content="https://www.builderk.com/${plan.slug}">
<meta property="og:image" content="https://www.builderk.com/images/${plan.image}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
${sharedStyle()}
</head>
<body>
${navHtml()}

<div class="crumbs"><a href="/">Home</a><span>&rsaquo;</span><a href="/floor-plans">Floor Plans</a><span>&rsaquo;</span>${formatSqft(plan.sqft)} Sq Ft Plan</div>

<section class="plan-hero">
  <div class="plan-image-wrap" id="planImage">
    <img src="/images/${plan.image}" alt="${formatSqft(plan.sqft)} sq ft ${plan.story.toLowerCase()} floor plan with ${plan.beds} bedrooms, ${plan.baths} baths, and ${plan.garage} garage by BuilderK">
  </div>
  <div class="plan-info">
    <div class="plan-label">${plan.story} Concept</div>
    <h1>${formatSqft(plan.sqft)} Sq Ft Plan</h1>
    <p class="plan-tagline">${escapeHtml(plan.tagline)}</p>
    <div class="specs-grid">
      <div class="spec"><div class="spec-label">Bedrooms</div><div class="spec-value">${plan.beds}</div></div>
      <div class="spec"><div class="spec-label">Bathrooms</div><div class="spec-value">${plan.baths}</div></div>
      <div class="spec"><div class="spec-label">Square Feet</div><div class="spec-value">${formatSqft(plan.sqft)}</div></div>
      <div class="spec"><div class="spec-label">Garage</div><div class="spec-value">${plan.garage}</div></div>
      <div class="spec"><div class="spec-label">Stories</div><div class="spec-value">${plan.story === "Single Story" ? "1" : "2"}</div></div>
      <div class="spec"><div class="spec-label">Build Type</div><div class="spec-value">Custom</div></div>
    </div>
    <div class="price-box">
      <div class="label">Pricing</div>
      <div class="price">Custom Quote</div>
      <div class="note">Every BuilderK home is priced for your lot, build tier, site conditions, and finish selections. Request a free estimate before relying on any planning budget.</div>
    </div>
    <div class="cta-row">
      <a href="/#contact" class="btn-primary">Talk to a Builder</a>
      <a href="/calculator" class="btn-outline">Estimate My Build</a>
    </div>
  </div>
</section>

<section class="section" style="background:var(--gray-100);">
  <div class="section-inner">
    <h2>Plan Highlights</h2>
    <p class="lead">A starting point for a custom BuilderK home. Final layout, elevations, engineering, and pricing are confirmed after lot review.</p>
    <div class="features-grid">
${highlightCards}
    </div>
  </div>
</section>

<section class="section">
  <div class="section-inner" style="text-align:center;">
    <h2>Available Build Tiers</h2>
    <p class="lead" style="margin-left:auto;margin-right:auto;">Every plan can be priced in Standard, Mid-Range, or Luxury finish tiers. Tier affects finish level, materials, and design customization.</p>
    <div class="features-grid">
      <div class="feature"><h3>Standard</h3><p>Code-compliant build with BuilderK's standard curated finish package.</p></div>
      <div class="feature" style="border-color:var(--orange);"><h3>Mid-Range</h3><p>Upgraded finish selections and expanded design options.</p></div>
      <div class="feature"><h3>Luxury</h3><p>Premium materials, custom architectural details, and high-end selections.</p></div>
    </div>
  </div>
</section>

<section class="section related">
  <div class="section-inner">
    <h2>Other Plans You Might Like</h2>
    <p class="lead">Explore more of our floor plan collection.</p>
    <div class="related-grid">
${relatedCards}
    </div>
  </div>
</section>

<section class="cta-section">
  <h2>Want to <span>Customize This Plan?</span></h2>
  <p>Send us your lot details and we will help you turn this concept into a buildable plan, estimate, and timeline.</p>
  <a href="/#contact" class="btn-primary">Talk to a Builder</a>
</section>

${footerHtml()}
<div class="lightbox" id="lightbox"><button class="close" onclick="closeLightbox()">x</button><img id="lightboxImg" src="" alt=""></div>
${pageScript()}
</body>
</html>
`;
}

function generatedCards() {
  return `      <!-- GENERATED PLAN CARDS START -->
${plans.map((plan, index) => `      <!-- ${plan.sqft} SQ FT -->
      <a href="/${plan.slug}" class="plan-card reveal stagger-${(index % 6) + 1}" data-story="${plan.storyFilter}" data-size="${plan.sizeFilter}">
        <div class="plan-card-img"><img src="/images/${plan.image}" alt="${formatSqft(plan.sqft)} sq ft ${plan.story.toLowerCase()} ${plan.beds} bed ${plan.baths} bath floor plan - BuilderK" loading="lazy"></div>
        <div class="plan-card-body">
          <div class="plan-card-title">${formatSqft(plan.sqft)} Sq Ft Plan</div>
          <div class="plan-card-specs">
            <span>${plan.beds} Bed</span><span>${plan.baths} Bath</span><span>${formatSqft(plan.sqft)} sq ft</span><span>${plan.garage}</span>
          </div>
          <div class="plan-card-footer">
            <span class="plan-card-cta">View Plan &rarr;</span>
            <span class="plan-card-story">${plan.story}</span>
          </div>
        </div>
      </a>
`).join("\n")}      <!-- GENERATED PLAN CARDS END -->
`;
}

async function updateFloorPlansPage() {
  const filePath = path.join(root, "floor-plans.html");
  let html = await readFile(filePath, "utf8");
  html = html.replace(
    "Browse BuilderK's collection of custom home floor plans for Florida. 1-story and 2-story designs from 1,700 to 2,377 sq ft. Customize any plan to fit your lot.",
    "Browse BuilderK's collection of custom home floor plans for Florida. 1-story and 2-story designs from 1,450 to 3,300 sq ft. Customize any plan to fit your lot."
  );
  html = html.replace(
    "Browse our collection of pre-designed floor plans or customize one to fit your lot. Built on your lot in Florida.",
    "Browse our collection of pre-designed floor plans from 1,450 to 3,300 sq ft or customize one to fit your lot."
  );
  if (html.includes("<!-- GENERATED PLAN CARDS START -->")) {
    html = html.replace(/      <!-- GENERATED PLAN CARDS START -->[\s\S]*?      <!-- GENERATED PLAN CARDS END -->\r?\n/, generatedCards());
  } else {
    html = html.replace("      <!-- CUSTOM CTA CARD 1 -->", `${generatedCards()}\n      <!-- CUSTOM CTA CARD 1 -->`);
  }
  await writeFile(filePath, html, "utf8");
}

async function updateSitemap() {
  const filePath = path.join(root, "sitemap.xml");
  let xml = await readFile(filePath, "utf8");
  xml = xml.replace(
    "<url><loc>https://www.builderk.com/floor-plans</loc><lastmod>2026-03-25</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>",
    "<url><loc>https://www.builderk.com/floor-plans</loc><lastmod>2026-05-17</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>"
  );
  const planUrls = allPlans.map((plan) => `  <url><loc>https://www.builderk.com/${plan.slug}</loc><lastmod>2026-05-17</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("\n");
  const startMarker = "  <!-- FLOOR PLAN DETAIL PAGES START -->";
  const endMarker = "  <!-- FLOOR PLAN DETAIL PAGES END -->";
  const block = `${startMarker}\n${planUrls}\n${endMarker}`;
  if (xml.includes(startMarker)) {
    xml = xml.replace(new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`), block);
  } else {
    xml = xml.replace("  <url><loc>https://www.builderk.com/privacy</loc>", `${block}\n  <url><loc>https://www.builderk.com/privacy</loc>`);
  }
  await writeFile(filePath, xml, "utf8");
}

await mkdir(imagesDir, { recursive: true });
for (const plan of plans) {
  await writeFile(path.join(imagesDir, plan.image), planSvg(plan), "utf8");
  await writeFile(path.join(root, `${plan.slug}.html`), detailPage(plan), "utf8");
}
await updateFloorPlansPage();
await updateSitemap();

console.log(`Generated ${plans.length} floor plan pages and assets.`);
