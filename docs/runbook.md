# Demo runbook (skeleton)

## Pre-demo checklist
- [ ] Server running with real MISTRAL_API_KEY (`VITE_MOCK_API=false` on web)
- [ ] Phone on HTTPS tunnel (ngrok / Cloudflare), camera + mic granted
- [ ] 4–5 landmark fact entries verified in `data/landmarks.json`
- [ ] Persona voices loaded (child = cloned teammate voice)
- [ ] EN and ES both rehearsed end-to-end
- [ ] Backup demo video recorded and accessible offline

## Demo flow (3 min)
1. Open the app on the phone, show the live camera over a dragon marker.
2. Pick persona **Child** + **EN**, hold TALK, ask "What is this dragon?" —
   highlight appears, spoken answer plays.
3. Follow-up: "Why is it holding a shield?"
4. Switch to **ES**, ask again — answer in Spanish.
5. Switch persona to **Historian** — same landmark, different depth.
6. Show the tour recap (bonus workflow) if wired.

## If it breaks
- Fall back to the backup video. Never debug live on stage.
