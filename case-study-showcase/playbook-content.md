# The closed:in Cold Email Infrastructure Checklist

*The exact pre-launch checklist we run before kicking off a client campaign. Built from 1,000+ campaigns at closed:in.*

---

## 1. Sending domains

- [ ] Buy 2-3 alternate domains (not your primary), e.g. `closedin-team.com`, `getclosedin.com`
- [ ] Use the .com variant where possible. `.io` and `.co` see slightly worse deliverability
- [ ] Set MX records to Google Workspace or Microsoft 365 before anything else
- [ ] Add a simple landing-page redirect on each alternate domain so prospects who Google you find your real site
- [ ] **Wait 72 hours** after DNS setup before sending the first email

## 2. Inboxes & warmup

- [ ] **2 inboxes per domain max.** More than 2 raises a flag with Google/Microsoft
- [ ] Use Instantly's built-in warmup (turn it on the day inboxes are created)
- [ ] Warm for **14 days minimum** before any real send. 21 days is safer
- [ ] Start sending at **25 emails/day per inbox**. Never exceed 50/day per inbox on cold
- [ ] Keep warmup running in parallel to live sends — never turn it off

## 3. SPF / DKIM / DMARC

- [ ] **SPF**: `v=spf1 include:_spf.google.com ~all` (for Google Workspace)
- [ ] **DKIM**: enable in Google Workspace Admin > Apps > Google Workspace > Gmail > Authenticate email, then copy the TXT to DNS
- [ ] **DMARC**: start with `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`. Move to `p=quarantine` only after 30 days of clean logs
- [ ] Test all three with [mail-tester.com](https://www.mail-tester.com) — aim for 10/10 before sending
- [ ] **Common trap**: SPF on the alternate domain must point to your sending platform (not your primary domain)

## 4. Lead list hygiene

- [ ] Verify every email with a waterfall: Findymail → Hunter → Dropcontact → Apollo
- [ ] Discard emails with confidence < 90%
- [ ] Aim for **bounce rate under 3%**. Above 5% lands you in spam
- [ ] Never send to role-based emails (`info@`, `sales@`, `contact@`) — they tank deliverability
- [ ] Remove duplicates per sending inbox (same prospect to two inboxes = spam signal)

## 5. Sequence timing

- [ ] **3-step sequence** is the sweet spot. 4+ has diminishing returns on reply rate
- [ ] Spacing: **Day 0 → Day 3 → Day 7**. Tighter spacing reads as desperate
- [ ] Stop after step 3 on email. Switch to LinkedIn for step 4 if relevant
- [ ] No subject line should be longer than 5 words
- [ ] No email should be longer than 75 words

## 6. Reply handling

- [ ] Wire all replies into one CRM. Don't manage from inboxes
- [ ] **3 reply categories**: positive (book a call), objection (sequence into nurture), unsubscribe (remove immediately)
- [ ] Set up auto-tagging in Clay or your CRM — manual triage scales badly past 100 replies/week
- [ ] Reply within **2 working hours** on positive replies. Booking rate halves after 24h
- [ ] Track meeting bookings per inbox, not per campaign. Inbox-level data tells you which sender domain is winning

---

## Bonus: Pre-launch sanity check

Run this 10-minute test before you send the first real email:

- [ ] Send 3 test emails between your own inboxes — all land in Primary, not Promotions
- [ ] Open in Gmail web view → check that "show original" reports SPF, DKIM and DMARC all PASS
- [ ] mail-tester.com score is 10/10
- [ ] First 5 prospects on your list, manually verified on LinkedIn (not just Apollo)

If any of those fail, fix before sending. Sending bad emails poisons the domain for months.

---

**Built by Max Münstermann and Jurre Groot at [closed:in](https://www.closedin.io).**

Want closed:in to build this for you? [Book a 30 minute discovery call.](https://closedin.neetocal.com/discovery-call?utm_source=playbook&utm_medium=pdf&utm_content=cta)
