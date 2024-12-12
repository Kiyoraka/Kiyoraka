# GitHub Profile Career Path Analyzer Setup Guide
## Using GitHub Web Interface and GitHub Desktop

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [GitHub Desktop Setup](#github-desktop-setup)
4. [File Creation](#file-creation)
5. [GitHub Token Setup](#github-token-setup)
6. [Pushing Changes](#pushing-changes)
7. [Troubleshooting](#troubleshooting)

## Prerequisites
Before starting, ensure you have:
- A GitHub account
- GitHub Desktop installed on your computer ([Download here](https://desktop.github.com/))
- Node.js installed ([Download here](https://nodejs.org/))
- A text editor (like VS Code, recommended)

## Repository Setup

1. Create your profile repository on GitHub:
   - Go to github.com
   - Click the "+" icon in the top right
   - Select "New repository"
   - Name it exactly the same as your GitHub username
   - Select "Public"
   - Check "Add a README.md"
   - Click "Create repository"

## GitHub Desktop Setup

1. Install and open GitHub Desktop
2. Log in with your GitHub account
3. Clone your repository:
   - Click "File" → "Clone repository"
   - Select your username repository
   - Choose a local path on your computer
   - Click "Clone"

## File Creation

1. Create Directories:
   - Open your repository folder in File Explorer/Finder
   - Create these folders:
     ```
     .github/workflows
     assets
     ```

2. Create workflow file:
   - Path: `.github/workflows/update-profile.yml`
   - Create and paste this code:
   ```yaml
   name: Update Profile with GitHub Stats

   on:
     schedule:
       - cron: '0 23 * * *'  # Runs every 7 am daily UTC +8
     workflow_dispatch:        # Allows manual trigger

   permissions:
     contents: write          # Needed for pushing changes

   jobs:
     update-profile:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout Repository
           uses: actions/checkout@v4
           with:
             persist-credentials: true

         - name: Create gitignore
           run: |
             echo "node_modules/" > .gitignore
             echo "package-lock.json" >> .gitignore

         - name: Set up Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '18'
             cache: 'npm'

         - name: Install dependencies
           run: |
             npm install axios
             npm install fs

         - name: Run Career Path Analysis Script
           env:
             PERSONAL_GITHUB_TOKEN: ${{ secrets.PERSONAL_GITHUB_TOKEN }}
           run: |
             node my-profile.js

         - name: Commit and Push Changes
           run: |
             git config --local user.name "github-actions[bot]"
             git config --local user.email "41898282+github-actions[bot]@users.noreply.github.com"
             git add -f README.md
             git commit -m "Update career profile stats" || echo "No changes to commit"
             git push origin HEAD || echo "No changes to push"
   ```

3. Create profile script:
   - Create `my-profile.js` in the root directory
   - Open in your text editor
   - Copy the JavaScript code from previous message
   - Replace 'YOUR_GITHUB_USERNAME' with your actual username

4. Add profile picture:
   - Add your profile picture to the `assets` folder
   - Name it `profile.png`
   - Recommended size: 150x150 pixels

5. Create `.gitignore`:
   - Create file named `.gitignore` in root directory
   - Add these lines:
   ```
   node_modules/
   package-lock.json
   ```

## GitHub Token Setup

1. Generate Personal Access Token:
   - Go to GitHub.com → Click your profile picture → Settings
   - Scroll to "Developer settings" (bottom left)
   - Click "Personal access tokens" → "Tokens (classic)"
   - Click "Generate new token (classic)"
   - Note: "Profile Career Path Analyzer"
   - Select scopes:
     - [x] repo
     - [x] read:user
     - [x] user:email
   - Click "Generate token"
   - IMPORTANT: Copy the token immediately!

2. Add token to repository:
   - Go to your repository on GitHub
   - Click Settings tab
   - Click "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name: PERSONAL_GITHUB_TOKEN
   - Value: [Paste your token]
   - Click "Add secret"

## Pushing Changes

1. In GitHub Desktop:
   - You'll see all your new files listed
   - Add a summary (e.g., "Initial setup of career path analyzer")
   - Click "Commit to main"
   - Click "Push origin"

2. Test the Action:
   - Go to your repository on GitHub
   - Click "Actions" tab
   - Click "Update Profile with GitHub Stats"
   - Click "Run workflow"

## Troubleshooting

Common issues and solutions:

1. Files not showing up:
   - Check if files are in correct folders
   - Ensure files have correct names
   - Make sure you committed and pushed in GitHub Desktop

2. Action not running:
   - Check if workflow file is in correct location
   - Verify token is set correctly in secrets
   - Look at Actions tab for error messages

3. Profile not updating:
   - Check Actions tab for workflow status
   - Verify all files are properly pushed
   - Ensure token has correct permissions

4. Syntax errors:
   - Copy code exactly as provided
   - Check for proper indentation in YAML file
   - Verify no extra spaces in file names

## File Structure
Your repository should look like this:
```
YOUR_USERNAME/
├── .github/
│   └── workflows/
│       └── update-profile.yml
├── assets/
│   └── profile.png
├── .gitignore
├── my-profile.js
└── README.md
```

## Need Help?
- Check Actions tab for detailed error logs
- Update your token if expired
- Create an issue in your repository for help
- Make sure to never share your personal access token

Remember to keep your personal access token secure and never commit it directly in your code.