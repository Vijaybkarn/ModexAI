# Deployment Guide

## Quick Start Production Deployment

### 1. Deploy to Netlify (Recommended)

**Prerequisites:**
- GitHub account
- Netlify account (free tier works)

**Steps:**

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

3. **Set Environment Variables**
   In Netlify dashboard → Site settings → Environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete
   - Your app is live!

### 2. Supabase Setup

**Edge Functions are already deployed!** Your Supabase project has:
- ✅ Chat streaming endpoint
- ✅ Conversations CRUD API
- ✅ Models listing API

**To verify:**
```bash
# List deployed functions
supabase functions list

# You should see:
# - chat
# - conversations
# - models
```

### 3. Database Setup

**Tables are already created!** Your database has:
- ✅ profiles
- ✅ conversations
- ✅ messages
- ✅ models
- ✅ ollama_endpoints
- ✅ usage_logs

**Add your Ollama endpoint:**
```sql
INSERT INTO ollama_endpoints (name, base_url, is_active)
VALUES ('Production Server', 'https://your-llm-api.com', true);
```

**Add models:**
```sql
INSERT INTO models (name, model_id, endpoint_id, size, digest)
VALUES (
  'llava:7b',
  'llava:7b',
  (SELECT id FROM ollama_endpoints WHERE name = 'Production Server'),
  4661225302,
  'sha256:...'
);
```

### 4. Configure Google OAuth

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google+ API

2. **Create OAuth Credentials**
   - Go to Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized JavaScript origins:
     ```
     https://your-netlify-site.netlify.app
     ```
   - Authorized redirect URIs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```

3. **Update Supabase**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add Client ID and Client Secret from Google

### 5. Domain Setup (Optional)

**Custom domain on Netlify:**
1. Go to Domain settings
2. Add custom domain
3. Follow DNS configuration instructions

**Custom domain on Supabase:**
1. Supabase Dashboard → Settings → API
2. Add custom domain (Pro plan required)

## Alternative Deployment Options

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

### Cloudflare Pages

1. Go to Cloudflare Pages dashboard
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Build output: `dist`
4. Add environment variables
5. Deploy

## Post-Deployment Checklist

- [ ] Site is accessible at production URL
- [ ] Google sign-in works
- [ ] Models load in dropdown
- [ ] Can create conversations
- [ ] Chat streaming works
- [ ] Can rename conversations
- [ ] Can delete conversations
- [ ] Can export conversations
- [ ] Search works
- [ ] Dark mode toggles
- [ ] Mobile responsive
- [ ] No console errors

## Monitoring

### Supabase Dashboard

Monitor your application:
- **Database**: Check table sizes and query performance
- **Auth**: View sign-in activity
- **Edge Functions**: Monitor invocations and errors
- **Logs**: Real-time logs for debugging

### Netlify Analytics

Track your site:
- Page views
- Unique visitors
- Bandwidth usage
- Build status

## Troubleshooting

### Build Fails

**Error**: `VITE_SUPABASE_URL is not defined`
- Solution: Add environment variables in deployment platform

**Error**: `Failed to fetch models`
- Solution: Check Edge Functions are deployed
- Verify Supabase URL is correct

### Runtime Errors

**Error**: "Authentication failed"
- Check Google OAuth credentials
- Verify redirect URIs are correct
- Ensure Supabase Auth is configured

**Error**: "Models not loading"
- Check Ollama endpoints in database
- Verify endpoints are accessible
- Check `is_active` flag is true

**Error**: "Streaming not working"
- Verify Edge Function URL
- Check CORS configuration
- Ensure token is passed correctly

## Scaling Considerations

### Database
- Monitor table sizes
- Add indexes for frequently queried columns
- Consider archiving old conversations

### Edge Functions
- Supabase Edge Functions auto-scale
- Monitor invocation counts
- Optimize response times

### Ollama Endpoints
- Add multiple endpoints for redundancy
- Load balance across endpoints
- Monitor endpoint health

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use secrets management
   - Rotate keys periodically

2. **Supabase Security**
   - Enable RLS on all tables
   - Audit policies regularly
   - Monitor auth logs

3. **HTTPS Only**
   - Force HTTPS in production
   - Use secure cookies
   - Enable HSTS headers

4. **API Rate Limiting**
   - Supabase has built-in limits
   - Monitor usage patterns
   - Implement client-side throttling

## Backup Strategy

### Database Backups
Supabase provides automatic backups:
- Daily backups (retained 7 days)
- Point-in-time recovery (Pro plan)
- Manual backup via CLI:
  ```bash
  supabase db dump -f backup.sql
  ```

### Code Backups
- Git repository is your source of truth
- Tag releases for easy rollback
- Maintain staging environment

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review Supabase logs
3. Check browser console for errors
4. Verify all environment variables
5. Test each feature individually

## Updates and Maintenance

### Regular Maintenance
- Update dependencies monthly
- Review and update security policies
- Monitor performance metrics
- Clean up old conversations periodically

### Version Updates
```bash
# Update all packages
npm update

# Check for major updates
npm outdated

# Update specific package
npm install <package>@latest
```

## Success!

Your comprehensive real-time chat application is now deployed and ready for users! 🎉

The application provides:
- ✅ Professional production deployment
- ✅ Secure authentication
- ✅ Real-time AI chat
- ✅ Full conversation management
- ✅ Smooth user experience
- ✅ Easy to maintain and scale

Enjoy your new chat application!
