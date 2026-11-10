# 🚀 Hostinger Git Deployment Guide for Muqabla

This guide provides step-by-step instructions to deploy this Vite + React SPA onto **Hostinger Web Hosting**, **Hostinger Cloud Hosting**, or **Hostinger VPS** using Git.

---

## 📋 Prerequisites
1. A **Hostinger** account with an active hosting plan (Web Hosting, Cloud Hosting, or VPS).
2. A domain or subdomain connected in Hostinger hPanel.
3. Your Git repository (hosted on **GitHub**, **GitLab**, or **Bitbucket**).

---

## 🌟 Method 1: Hostinger hPanel Git Deployment (Direct from hPanel)

Hostinger includes a native Git integration in hPanel under **Advanced → Git**.

### Step 1: Create a GitHub Repository and Push Code
In your local project folder:
```bash
git init
git add .
git commit -m "Initial commit for Hostinger deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Open Git Tool in Hostinger hPanel
1. Log into your **Hostinger hPanel**.
2. Go to **Websites** → Click **Manage** on your domain.
3. In the search bar on the left sidebar, type **Git** (under the **Advanced** section).
4. Click on **Git**.

### Step 3: Configure Git Repository
1. **Repository:** Paste your repository URL (e.g., `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git`).
   - If it's a private repository, click **Generate SSH Key**, add that key to your GitHub account under *Settings → SSH and GPG keys*, and use the SSH clone URL (`git@github.com:...`).
2. **Branch:** Enter `main`.
3. **Install path:** Leave default or set to a directory (e.g. `public_html`).
4. Click **Create**.

### Step 4: Build Configuration
In Hostinger Git deployment, add the **Deployment Script** (or run via SSH terminal):
```bash
bash deploy.sh
```
Or directly:
```bash
npm install
npm run build
cp -r dist/* ./
```
*Note: The included `public/.htaccess` file will automatically be placed into your `dist/` directory during build, ensuring clean routing and preventing 404 errors on page reloads.*

---

## ⚡ Method 2: Automated Deployment via GitHub Actions (Recommended)

This method automatically builds and deploys your website to Hostinger every time you push code to GitHub.

### Step 1: Obtain Hostinger FTP Credentials
1. In Hostinger hPanel, go to **Files → FTP Accounts**.
2. Note your:
   - **FTP Host / Server** (e.g. `ftp.yourdomain.com` or Hostinger server IP)
   - **FTP Username**
   - **FTP Password** (or create a new FTP account pointing to `/public_html`)

### Step 2: Add Secrets to Your GitHub Repository
1. In your GitHub repository, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add:
   - `HOSTINGER_FTP_SERVER`: Your FTP server hostname
   - `HOSTINGER_FTP_USERNAME`: Your FTP username
   - `HOSTINGER_FTP_PASSWORD`: Your FTP password
   - `VITE_SUPABASE_URL`: (Optional) Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: (Optional) Your Supabase anon key

### Step 3: Push to GitHub
Whenever you push to the `main` branch, the workflow located at `.github/workflows/deploy-hostinger.yml` will automatically:
1. Check out your code.
2. Install Node.js dependencies.
3. Build the production bundle (`npm run build`).
4. Upload all files from `./dist` directly to Hostinger's `public_html/`.

---

## 🔒 Crucial Hostinger SPA Routing (.htaccess)

Single-Page Applications (SPAs) require an Apache/LiteSpeed `.htaccess` file so that refreshing a page or navigating directly to a URL doesn't return a 404 error.

This project already contains a pre-configured `public/.htaccess` that includes:
- ✅ **SPA URL Rewriting:** Forwards all paths to `index.html`.
- ✅ **Automatic HTTPS Redirection:** Forces secure SSL connections.
- ✅ **Gzip/Brotli Compression:** Maximizes loading speeds.
- ✅ **Cache-Control Headers:** 1-year caching for hashed static assets, instant updates for HTML.

---

## 🛠️ Testing Your Production Build Locally

Before pushing, verify that the production build succeeds without issues:
```bash
npm run build
npm run preview
```
Visit the preview URL (usually `http://localhost:4173`) to confirm everything works as expected.
