# How to Deploy Your Social Media Platform

Your application is ready to deploy! Follow these simple steps to get a live URL.

## Option 1: Deploy to Vercel (EASIEST - 2 minutes)

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Click "Sign Up" (use your GitHub account)

2. **Import Your Project:**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose: `Cris19901/Perksnowv2`
   - Select branch: `claude/add-figma-design-011CUvf6g2z2qq5ZYoUZPHyD`

3. **Deploy:**
   - Vercel will auto-detect the settings
   - Click "Deploy"
   - Wait 2-3 minutes

4. **Done!**
   - You'll get a URL like: `https://perksnowv2.vercel.app`
   - Click it and your app is LIVE!

## Option 2: Deploy to Netlify

1. **Go to Netlify:**
   - Visit https://netlify.com
   - Click "Sign Up" (use your GitHub account)

2. **Import Your Project:**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub
   - Select: `Cris19901/Perksnowv2`
   - Select branch: `claude/add-figma-design-011CUvf6g2z2qq5ZYoUZPHyD`

3. **Deploy:**
   - Settings will auto-detect from `netlify.toml`
   - Click "Deploy site"
   - Wait 2-3 minutes

4. **Done!**
   - You'll get a URL like: `https://perksnowv2.netlify.app`
   - Your app is LIVE!

## Option 3: Run Locally on Your Computer

If you want to run it on YOUR computer:

1. **Install Node.js:**
   - Download from https://nodejs.org (get LTS version)
   - Install it

2. **Clone and Run:**
   ```bash
   git clone https://github.com/Cris19901/Perksnowv2.git
   cd Perksnowv2
   git checkout claude/add-figma-design-011CUvf6g2z2qq5ZYoUZPHyD
   npm install
   npm run dev
   ```

3. **Open Browser:**
   - Go to http://localhost:3000

---

**RECOMMENDED:** Use Option 1 (Vercel) - it's the fastest and you get a real website URL you can share with anyone!
