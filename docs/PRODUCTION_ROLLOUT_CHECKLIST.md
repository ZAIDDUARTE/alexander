# Production rollout checklist (open)

1. Verify `meetalexander.ai` SES + DKIM DNS
2. Switch sender to `onboarding@meetalexander.ai`
3. Create Live Stripe product/price
4. Live Stripe secret + webhook (separate from Test)
5. Fix statement descriptor (currently observed as BEYOND INTEL SATORI)
6. Production Trillet provisioning path
7. Remove `EMAIL_DELIVERY_MODE=test` allowlist only after approval
8. Production WordPress HMAC secret
9. Monitoring/alarms for handoff + email outbox
10. NAT or out-of-VPC verifier architecture review if Lambda must call Stripe directly
