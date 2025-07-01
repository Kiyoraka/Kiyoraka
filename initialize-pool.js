#!/usr/bin/env node

/**
 * 🚀 POOL INITIALIZATION SCRIPT
 * 
 * Run this ONCE to initialize your pool with all current GitHub data.
 * After this, the daily workflow will only add new activity to the pool.
 * 
 * Usage: node initialize-pool.js
 */

const { processPoolStats } = require('./pool.js');

console.log(`
🎮 =====================================
   POOL SYSTEM INITIALIZATION
=====================================

This will create your baseline pool with ALL current data.
Your level will only INCREASE from now on! 📈

Starting initialization...
`);

processPoolStats()
    .then(() => {
        console.log(`
✅ =====================================
   INITIALIZATION COMPLETE!
=====================================

🎯 Your pool has been created with all current data
📈 From now on, your level will only increase
🤖 The daily GitHub workflow will add new activity
💾 Pool data saved to pool.json

Next steps:
1. Commit and push the pool.json file
2. Your daily workflow will now use the pool system
3. Watch your level grow every day! 🚀
`);
    })
    .catch((error) => {
        console.error(`
❌ =====================================
   INITIALIZATION FAILED
=====================================

Error: ${error.message}

Please check:
1. PERSONAL_GITHUB_TOKEN is set in environment
2. Internet connection is working
3. GitHub API is accessible
`);
        process.exit(1);
    }); 