# BuilderK Live publication

## Fence
Objective: Publish the current approved communications mockup at builderk.com/live, per Richard, September 20 2026. Supersedes the requested BuildShare.ai destination.
May change: new live.html, live/ assets, scripts/live-hq/ reproducible source, exact source exclusion in .vercelignore, this record.
Frozen: all existing HTML, CSS, routes, APIs, Vercel policy, CRM, authentication, camera/mic permissions and app.builderk.com.
Real path: /live (Vercel cleanUrls), entire mockup navigation and interactions.
Proof: isolated static build, browser room/chat/navigation proof, asset namespace inspection, source diff. Live proof remains required after canonical Git publication.
Regression: existing homepage, contact, process and intranet bytes unchanged.
Rollback: remove this additive commit through Git. Base: 2e6b4eb83d859d071c147faee36f601fca76c927.
Records: this file and communications Council ledger.

## Provenance and truth
Source: approved Sites project work/builderk-live at 1df5499b640610b5ab27f31c25e5165308af4678. No iframe or external app-host dependency. React runs only on this new document. All communications remain demo only, session-local, no real microphone/camera/call/message/CRM connection. Existing Permissions-Policy remains restrictive.

## Rebuild
In scripts/live-hq run npm ci then npm run build. Copy dist/index.html to ../../live.html and remaining dist files to ../../live/. Do not deploy a local directory to Vercel. Publication is GitHub main only.

## Verification and publication status
Local production build passed. Real browser /live at 1280×720: compact dark HQ and both logos display; demo room preflight, join/leave and chat message rendering passed. Source changes vs approved mockup are only the two logo asset URL prefixes. Design specialist approves PR isolation and preservation. Existing HTML/CSS/APIs/vercel.json unchanged.

Connected GitHub account has pull:true, push:false on the canonical repository. Owner merge and Vercel Git deployment remain required, followed by live /live and existing-site regression checks. No production success is claimed.

Clean npm ci from the committed isolated lockfile and production rebuild also pass. Direct dependency versions pinned for repeatability. Generated vendor JS contains upstream whitespace; hand-authored source is clean.
