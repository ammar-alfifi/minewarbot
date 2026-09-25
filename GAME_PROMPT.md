# MineWarrBot — Game Design & Build Prompt

> **Bot display name:** Mine War (حرب المناجم)  
> **Bot username:** `MineWarrBot`  
> **Product:** A polished, Arabic-first Telegram Mini App about mining, building a thriving mining operation, and competing with friends.

## Your role

Act as an exceptional game designer, product designer, and senior full-stack engineer. Create a delightful, replayable game with a strong identity—not a generic clicker with a leaderboard. Make thoughtful design decisions yourself; do not ask the owner to choose routine details. Preserve the core fantasy of **collecting resources and competing with friends**, while creatively developing the world, progression, events, social interactions, and presentation.

Build the game only when explicitly asked to execute this prompt. Until then, this document is a design/build brief; do not assume credentials have been supplied or place secrets in source control.

## 1. Product vision

Players are rival mine owners in a mysterious underground frontier. They tap to mine, hire crews, automate production, discover rare finds, unlock deeper strata, and race friends to become the most renowned mining guild. The game should feel rewarding in short visits and offer satisfying long-term goals.

The emotional loop is: **discover → collect → upgrade → unlock → show off → challenge a friend → return for the next discovery**.

Design for friendly rivalry, not punishment. Raids should create funny stories and reasons to return, but never erase hours of progress or make a player feel forced to stay online.

## 2. Creative direction and game systems

Develop a cohesive world with its own charm: a lively mine camp, memorable crew members, distinct underground regions, and playful item names. Use a warm, tactile visual style—rich rock and metal textures, glowing discoveries, clear resource counters, and lively but lightweight animations. Keep the interface fast, legible, and mobile-first.

### Core resources

- **Coins:** the common resource, earned by mining and used for equipment and workers.
- **Gems:** a rare discovery used for special boosts and cosmetic rewards. Do not sell or imply real-money value.
- **Relics:** collectible discoveries with names, rarity, and a collection book. Relics are primarily for collection and prestige; avoid making them mandatory power upgrades.
- Add or rename a resource only when it improves the game and can be explained simply.

### Mining and progression

- A satisfying main mining action grants coins, triggers Telegram haptics when available, and gives concise visual feedback.
- Mining has a small chance to reveal a gem or a relic. Make rare discoveries exciting with distinct animation and an optional share card.
- Equipment upgrades improve manual mining. Workers and mine facilities generate resources over time, including while the player is away.
- Unlock themed mine regions at meaningful milestones. Each region should introduce a visual change, a new discovery pool, and a fresh goal—not just larger numbers.
- Include a compact collection book, milestone rewards, and a clear next-goal preview so players always know what they are working toward.
- Balance idle earnings with a reasonable offline cap. Explain the cap and reward honestly; never fabricate earnings or use manipulative countdowns.

### Social competition

- Provide a friends leaderboard that is easy to understand and fun to share.
- Let players invite friends through Telegram's share flow and open the Mini App from a bot deep link where supported.
- Add asynchronous friendly raids: a successful raid transfers only a small, capped amount of coins. Use a cooldown and a clear result message. Never allow raids to steal gems, relics, paid items, or all of a player's balance.
- Give defenders a fair way to respond, such as a short-lived shield earned through ordinary play, a raid log, or a revenge challenge. Avoid requiring notification permissions.
- Create periodic, lightweight group goals (for example, a shared community excavation) where contribution earns personal rewards without allowing one player to take another's progress.
- Use seasons or weekly leagues only if they can be implemented clearly and fairly. Preserve lifetime achievements when a seasonal score resets.

### Retention without dark patterns

- Use optional daily discoveries or a modest login bonus, collection milestones, and rotating mine events to create reasons to return.
- Make rewards transparent. No deceptive timers, punitive streak loss, forced notifications, or artificial scarcity designed to pressure players.
- The game should remain enjoyable without inviting friends, checking constantly, or spending money.

## 3. User experience

Create a polished Arabic-first interface with RTL layout and natural Arabic copy. Also structure text so localization can be added later. The main screen should make the player's status immediately clear: current region, coins, gems, mining power, idle rate, and next unlock.

Suggested navigation:

1. **Mine:** prominent mining action, resource feedback, current region, next discovery/progression goal.
2. **Upgrades:** equipment, workers, and facilities, with costs, effects, and disabled states when unaffordable.
3. **Friends:** leaderboard, invite/share action, raid/revenge controls, and recent friendly activity.
4. **Collection:** regions discovered and relics found, with silhouettes for undiscovered collectibles.

Use Telegram theme variables, safe-area insets, responsive layouts, accessible contrast, and reduced-motion support. Outside Telegram, provide a graceful browser development mode with a clearly labeled guest account. Use Telegram haptics and dialogs only when available.

## 4. Technical foundation

- Frontend: React 18 + Vite 5, Telegram Mini App SDK (`@twa-dev/sdk`) and Telegram's official WebApp script.
- Backend: Node.js 20+ + Express 4 + Telegraf 4.
- MVP storage: a small local JSON store is acceptable for local development only. Keep storage access behind a repository/service boundary so it can later be replaced by SQLite or PostgreSQL without rewriting game rules.
- Bot: Telegraf polling for local development. `/start` should welcome the user and show a Web App button; `/app` can offer the same entry point.
- Keep secrets in environment variables. Provide `.env.example` with placeholders only. Never put a real bot token, user token, or secret in code, logs, commits, or generated documentation.
- Keep modules focused: Telegram authentication, game rules, persistence, API routes, bot handlers, and UI components should not become one giant file.

## 5. Security and data integrity

Treat every client request as untrusted. Never let the browser decide how much currency a player earned, how much to transfer in a raid, or the result of a random drop.

- Validate Telegram `initData` on the backend using Telegram's documented HMAC procedure and reject stale `auth_date` values.
- In Telegram mode, derive the player identity from validated `initData`; never trust a client-provided player ID or display name. Clearly isolate guest mode to local development.
- Send game actions (mine, purchase, hire, upgrade, raid) to the server. The server validates costs, cooldowns, limits, random outcomes, and balance changes, then returns the authoritative state/delta.
- Prevent negative balances, duplicated purchases, concurrent raid exploits, and replayed requests where practical. Add basic request validation and rate limiting.
- Do not accept complete player balances from `/api/sync`. Persist server-authoritative state and timestamps instead.
- Keep private information private; leaderboard output should contain only the public profile data needed by the game.

## 6. API outline

Design a small, coherent API around authenticated game actions. Names may be improved, but include equivalents of:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Basic service health check. |
| `POST` | `/api/session` | Validate Telegram `initData`, load/create the player, and return public game state. |
| `GET` | `/api/state` | Return the authenticated player's authoritative game state and offline summary. |
| `POST` | `/api/actions/mine` | Apply a mining action and return server-calculated rewards. |
| `POST` | `/api/actions/upgrade` | Validate and purchase an upgrade. |
| `POST` | `/api/actions/raid` | Resolve a fair, capped, cooldown-protected raid. |
| `GET` | `/api/leaderboard` | Return a limited, sanitized leaderboard. |
| `POST` | `/api/invites` | Create or resolve an invitation/deep link if needed. |

Use clear status codes and user-friendly error messages. Keep the exact balance formulas in one game-rules module, not duplicated across frontend and backend.

## 7. Suggested initial balance (tune thoughtfully)

Use these as starting points, not rigid requirements. Simulate progression and adjust so the first upgrade arrives quickly, early regions unlock during the first play session, and later progress remains meaningful without runaway inflation.

- Starting manual mining power: 1 coin per action.
- Equipment upgrade costs grow progressively (an initial example is `floor(50 * 2.0^(level - 1))`).
- Worker prices grow with each hire (an initial example is `floor(100 * 1.7^workerCount)`).
- Give each worker a clearly displayed production rate.
- A rare find can occur occasionally, but use server-side randomness and communicate the odds if they materially affect play.
- Cap offline earnings (for example, 8 hours) and show the exact time/reward calculation in the UI.
- Score should reward current progression and discoveries without letting a single resource dominate forever. Consider separate **wealth**, **collection**, and **season** rankings instead of one opaque formula.

## 8. Acceptance criteria

- The frontend and backend run locally using documented commands; the frontend production build succeeds.
- A player can enter using Telegram identity, mine, earn server-validated rewards, buy upgrades, and see progress persist after reopening.
- Offline earnings are calculated from trusted server timestamps and respect a visible cap.
- Two distinct test players appear correctly in the leaderboard and can complete a fair raid without balance spoofing.
- Telegram features fail gracefully in a normal browser.
- The UI works in Arabic RTL on a small phone screen and adapts to Telegram's light/dark theme.
- Include concise setup instructions, `.env.example`, and a brief explanation of local testing. Never include a real token.

## 9. Scope guidance

Make the first playable version delightful and complete. Prioritize the mining loop, upgrade progression, server-authoritative saving, Telegram identity, and friend competition. Keep payments, real-time multiplayer, complex guild management, push notifications, and a production database out of the first version unless a later request explicitly asks for them.

## 10. Owner-provided configuration

The owner has selected the bot username `MineWarrBot`. Verify availability with BotFather rather than assuming it is available. The bot token must be supplied privately through `backend/.env` at setup time; never copy a token from chat history into any file or command.
