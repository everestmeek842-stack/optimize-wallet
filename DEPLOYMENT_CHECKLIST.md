# Production Deployment Checklist

## ✅ NEXUS EXPLORER WORKSPACE DEPLOYMENT

### Phase 1: Pre-Deployment Verification
- [ ] Run `npm verify` to check all systems
- [ ] Verify file structure complete (explorer-workspace.html, explorer-workspace.js, etc.)
- [ ] Test dual-port configuration (4000 & 8000)
- [ ] Confirm all 4 tabs functional (Mail, AI, PDF, Config)
- [ ] Verify monetization tracking active
- [ ] Test all 5 US state switches (NY, CA, TX, FL, WA)
- [ ] Confirm 15 monetization strategies loaded
- [ ] Check cross-platform stability report

### Phase 2: Backend Configuration
- [ ] Copy .env.example to .env
- [ ] Fill in Supabase credentials
- [ ] Configure Telegram bot (optional)
- [ ] Set MASTER_WALLET_ADDRESS
- [ ] Configure PAYOUT_PROVIDER and credentials
- [ ] Set RPC URLs for blockchain networks
- [ ] Run: npm install
- [ ] Test: npm start (should listen on port 8000, fallback to next available)
- [ ] Verify: http://localhost:8000/health returns JSON with "ok: true"
- [ ] Test Explorer endpoints: http://localhost:8000/explorer
- [ ] Test API endpoints: http://localhost:8000/api/explorer/strategies

### Phase 3: Database & Storage Setup
- [ ] Create or use Supabase project
- [ ] Apply schema from supabase-schema.sql
- [ ] Save project URL and keys in .env
- [ ] Create earnings ledger table for monetization tracking
- [ ] Set up proper indexes for earnings queries
- [ ] Test: GET /api/supabase/status
- [ ] Verify localStorage working for explorer state persistence

### Phase 4: Monetization System Activation
- [ ] Verify 15 monetization strategies configured
- [ ] Test earnings recording endpoint: POST /api/explorer/earnings
- [ ] Confirm real-time earnings display working
- [ ] Test workflow recording monetization
- [ ] Test email sending earnings tracking
- [ ] Test PDF generation earnings tracking
- [ ] Verify state switching earnings recording
- [ ] Check earnings-summary endpoint responding correctly
- [ ] Set up earnings reporting webhooks (if applicable)

### Phase 5: US State/Server Configuration
- [ ] Configure NY server (New York) - Primary
- [ ] Configure CA server (California)
- [ ] Configure TX server (Texas)
- [ ] Configure FL server (Florida)
- [ ] Configure WA server (Washington)
- [ ] Test instant switching between all 5 states (target: 0 seconds)
- [ ] Verify latency measurements for each state
- [ ] Test geographic routing working
- [ ] Confirm state persistence in localStorage

### Phase 6: Email & Communication Setup
- [ ] Select email provider (SMTP, Mailgun, SendGrid, or Mailchimp)
- [ ] Configure API credentials in .env
- [ ] Test email sending: POST /api/explorer/send-email
- [ ] Verify email history logging
- [ ] Test bulk email execution with workflows
- [ ] Confirm workflow recording captures email patterns
- [ ] Test AI automation of recorded workflows

### Phase 7: PDF Processing Setup
- [ ] Verify PDF generation library configured
- [ ] Test single PDF generation: POST /api/explorer/generate-pdf
- [ ] Test batch PDF processing: POST /api/explorer/send-email
- [ ] Verify PDF history tracking
- [ ] Test document type support (Invoice, Report, Contract, Certificate, Proposal)
- [ ] Confirm earnings recording for PDF operations
- [ ] Test email attachment with PDFs

### Phase 8: AI & Workflow Automation
- [ ] Test workflow recording: POST /api/explorer/workflow (action: record)
- [ ] Test workflow execution: POST /api/explorer/workflow (action: execute)
- [ ] Verify AI learning pattern tracking
- [ ] Confirm automation rate calculation
- [ ] Test bulk send command via AI
- [ ] Verify memory vault integration
- [ ] Test email template selection and generation

### Phase 9: Dual-Port Deployment
- [ ] Configure port 4000 for local workspace functionality
- [ ] Configure port 8000 for external URL testing
- [ ] Verify feature parity across both ports
- [ ] Test synchronization between ports
- [ ] Confirm identical earnings tracking on both ports
- [ ] Verify state consistency across port switches
- [ ] Test failover mechanism if one port goes down

### Phase 10: Security & Access Control
- [ ] Verify authentication middleware active
- [ ] Confirm API key protection for sensitive endpoints
- [ ] Test email provider credentials encryption
- [ ] Verify wallet address security (never exposed in client)
- [ ] Test rate limiting on monetization endpoints
- [ ] Validate input sanitization on all forms
- [ ] Check CORS configuration correct
- [ ] Verify session timeout working (7-day TTL)

### Phase 11: Cross-Platform Stability
- [ ] Test on Windows (primary deployment)
- [ ] Test on Mac (if applicable)
- [ ] Test on Linux servers (if applicable)
- [ ] Verify responsive design on different screen sizes
- [ ] Test all features on mobile browsers
- [ ] Check localStorage support across platforms
- [ ] Verify WebGL support for graphics (if used)
- [ ] Test CSS grid and flexbox rendering

### Phase 12: Monitoring & Logging
- [ ] Set up earnings tracking logs
- [ ] Configure system health monitoring
- [ ] Set up error logging
- [ ] Test Telegram alerts (if configured)
- [ ] Create monitoring dashboard
- [ ] Set up automated backup for earnings data
- [ ] Configure log rotation
- [ ] Test analytics collection

### Phase 13: Performance Optimization
- [ ] Minify JavaScript and CSS files
- [ ] Enable gzip compression
- [ ] Optimize image assets
- [ ] Test load time (target: <2s)
- [ ] Verify database query performance
- [ ] Test concurrent user handling
- [ ] Check memory usage on server
- [ ] Profile CPU usage under load

### Phase 14: Final Testing & Validation
- [ ] Complete end-to-end workflow test (all 4 tabs)
- [ ] Test high-volume email sending
- [ ] Test batch PDF generation
- [ ] Verify earnings calculation accuracy
- [ ] Test state switching under load
- [ ] Verify data persistence
- [ ] Test recovery from errors
- [ ] Run deployment verification script: `npm run verify:deployment`

### Phase 15: Documentation & Training
- [ ] Update API documentation
- [ ] Create user guide for Explorer workspace
- [ ] Document monetization strategies
- [ ] Create troubleshooting guide
- [ ] Document deployment process
- [ ] Create runbook for operations team
- [ ] Document state switching procedures

### Phase 16: Production Deployment

#### Frontend
- [ ] Deploy to Vercel or equivalent
- [ ] Set FRONTEND_URL in backend .env
- [ ] Deploy index.html and explorer-workspace.html
- [ ] Enable CDN and caching
- [ ] Set up SSL certificate (HTTPS)
- [ ] Configure domain pointing

#### Backend
- [ ] Deploy to Render, Railway, or equivalent
- [ ] Set all environment variables
- [ ] Enable auto-restart on failure
- [ ] Set up load balancing (if needed)
- [ ] Configure database backups
- [ ] Enable monitoring and alerts
- [ ] Set up log aggregation

#### Android (if applicable)
- [ ] Build APK: npm run build:android
- [ ] Sign APK with release keys
- [ ] Test on Android devices
- [ ] Deploy to app store

#### Windows (if applicable)
- [ ] Build Windows installer: npm run build:windows
- [ ] Test installer on clean Windows system
- [ ] Sign executable (if needed)
- [ ] Deploy to distribution channel

### Phase 17: Post-Deployment Verification
- [ ] Test all endpoints from production URL
- [ ] Verify earnings recording working
- [ ] Check all 5 states accessible
- [ ] Test state switching performance
- [ ] Verify monetization active and tracking
- [ ] Monitor system for first 24 hours
- [ ] Check error logs for any issues
- [ ] Verify backups running
- [ ] Test disaster recovery process

### Phase 18: Production Guardrails
- Never expose private keys in client-side code
- Validate all earnings claims server-side
- Implement rate limiting on monetization endpoints
- Add wallet signature verification
- Monitor for unusual activity patterns
- Keep audit logs of all transactions
- Implement automatic backups every 6 hours
- Set up alerts for critical errors
- Use HTTPS everywhere
- Validate all user inputs server-side

## Key Metrics to Monitor

- **Earnings Accuracy**: Verify all transactions recorded correctly
- **System Uptime**: Target 99.9% availability
- **Response Time**: Average <500ms for API endpoints
- **State Switch Latency**: Target <100ms
- **Error Rate**: Keep below 0.1%
- **Database Performance**: Query time <100ms average
- **Concurrent Users**: Support minimum 1000 simultaneous
- **Data Integrity**: Zero data loss

## Rollback Procedure

If issues occur post-deployment:
1. Revert to previous version
2. Check error logs for root cause
3. Fix issues in development environment
4. Re-run verification script
5. Re-deploy with fixes
6. Monitor closely for first 24 hours

## Support Contacts

- Backend Issues: [Your team contact]
- Deployment Issues: [DevOps contact]
- Monetization Issues: [Finance contact]
- Email Issues: [Integration contact]
- Emergency Hotline: [Emergency number]

---

**Last Updated**: 2026-09-02
**Version**: 1.0.0
**Status**: PRODUCTION READY (after completing all phases)
- GET /health
- GET /api/admin/dashboard
- POST /api/wallet/verify
- POST /api/airdrop/trigger
- POST /api/airdrop/claim
- POST /api/telegram/alert
- GET /api/supabase/status

## 8. Ready for live monetization
Once the real credentials are connected, the platform can support:
- Phantom wallet detection
- claim validation
- airdrop processing
- treasury tracking
- Telegram notifications
- payout orchestration
- master-wallet yield and fee accounting
