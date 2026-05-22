# How to add a teacher

PromptMaxxers is a **curated** AI teaching brand. There is no public signup — you (the founder) add teachers by hand. Adding one takes ~2 minutes and no code.

## Steps

1. **Add an avatar** (optional but recommended): drop a square image at `public/assets/teachers/<slug>.svg` (or `.png`/`.jpg`). ~200×200. If you skip it, the card renders without a photo.

2. **Edit `public/teachers.json`** — copy the block below into the `teachers` array and fill it in:

   ```json
   {
     "slug": "jane",
     "name": "Jane Doe",
     "title": "ML Engineer · RAG & evals",
     "avatar": "/assets/teachers/jane.svg",
     "bio": "One or two sentences. What they ship, what they teach.",
     "subjects": ["RAG systems", "LLM evals", "Python"],
     "rate": "$120 / hr",
     "bookUrl": "https://cal.com/jane/tutoring",
     "featured": false,
     "status": "active"
   }
   ```

   | Field | Notes |
   |---|---|
   | `slug` | unique, lowercase, no spaces |
   | `name` | display name |
   | `title` | one-line role / specialty |
   | `avatar` | path under `/assets/teachers/`, or omit |
   | `bio` | 1–2 sentences |
   | `subjects` | array of strings → render as tags |
   | `rate` | free text, e.g. `"$120 / hr"` |
   | `bookUrl` | their booking link (their own Cal.com, or yours on their behalf) |
   | `featured` | `true` floats them to the top |
   | `status` | `"active"` shows them; anything else hides them (use `"draft"` to stage) |

3. **Commit + push:**

   ```sh
   cd ~/agfarms/promptmaxxers-site
   git add public/teachers.json public/assets/teachers/
   git commit -m "teachers: add Jane Doe"
   git push
   ```

   Vercel auto-redeploys in ~6 seconds. The new teacher appears in the Teachers section.

## How teachers get paid (current, simple model)

Early on, payments stay **centralized to AG Farms LLC** (your existing Stripe + Cal.com) — you're the brand, teachers are contributors. Two simple options per teacher:

- **Their own booking link** (`bookUrl` → their Cal.com + their Stripe): they collect directly, you take a brand/referral cut offline, or
- **Your booking link on their behalf**: payment lands with AG Farms LLC, you pay the teacher as a contractor.

When you have enough teachers that manual payout is annoying, that's the signal to revisit **Stripe Connect** (the deferred marketplace design lives in `~/agfarms/promptmaxxers/MARKETPLACE-ARCHITECTURE.md`). Not before — keep it simple until volume forces it.

## Removing / pausing a teacher

Set their `"status"` to `"paused"` (or delete the block). Commit + push.
