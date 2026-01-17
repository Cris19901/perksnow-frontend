# Add DMARC Record to Improve Email Deliverability

DMARC (Domain-based Message Authentication, Reporting & Conformance) helps prevent spam and improves email deliverability.

## Add This DNS Record in Cloudflare:

1. Go to Cloudflare Dashboard → lavlay.com → DNS → Records
2. Click "Add record"
3. Enter:
   - **Type**: TXT
   - **Name**: `_dmarc`
   - **Content**: `v=DMARC1; p=none; rua=mailto:fadiscojay@gmail.com`
   - **TTL**: Auto
4. Click "Save"

## What This Does:

- `v=DMARC1` - DMARC version
- `p=none` - Policy (none = monitor only, no blocking)
- `rua=mailto:fadiscojay@gmail.com` - Send reports to your email

## After Adding:

Wait 5-10 minutes, then emails will have better deliverability!

You can upgrade the policy later:
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Reject unauthorized emails completely

For now, `p=none` is perfect for monitoring.
