const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;
const POOL_FILE = 'pool.json';

// Language icons mapping (same as original)
const LANGUAGE_ICONS = {
    JavaScript: '📜',
    CSS: '🎨',
    HTML: '🌐',
    PHP: '🐘',
    "Ren'Py": '📚',
    Blade: '🧷',
    Dart: '🎯',
    Batchfile: '🗂️',
    Python: '🐍',
    Java: '☕',
    SCSS: '🎨',
    "C++": '➕',
    Hack: '🧬',
    "C#": '🎯',
    VBA: '📊',
    C: '🎯',
    CMake: '🧱',
    Ruby: '💎',
    Swift: '📱',
    "Objective-C": '🍎',
    Kotlin: '🔰',
    TypeScript: '🔷',
    Vue: '💚',
    Go: '🐹',
    Rust: '🦀',
    Shell: '🐚',
    R: '🧪',
    Scala: '⚡',
    Perl: '🌟',
};

// Configure axios
axios.defaults.timeout = 30000;

async function apiCallWithRetry(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { headers, proxy: false });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Retry ${i + 1}/${retries} for ${url}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Load existing pool or create new one
function loadPool() {
    try {
        if (fs.existsSync(POOL_FILE)) {
            const pool = JSON.parse(fs.readFileSync(POOL_FILE, 'utf8'));
            console.log('📊 Loaded existing pool data');
            return pool;
        }
    } catch (error) {
        console.log('Error loading pool:', error.message);
    }
    
    console.log('🆕 Creating new pool (first time setup)');
    return {
        initialized: false,
        lastUpdateDate: null,
        totalCommits: 0,
        totalSolvedIssues: 0,
        totalSpeedPoints: 0,
        languageStats: {},
        totalRepos: 0,
        accountCreationYear: new Date().getFullYear(),
        originalReposCount: 0,
        totalStars: 0,
        totalForks: 0,
        creatorBonusAccuracy: 0,
        creatorBonusSpeed: 0,
        processedRepos: new Set()
    };
}

// Save pool data
function savePool(pool) {
    try {
        // Convert Set to Array for JSON storage
        const poolToSave = {
            ...pool,
            processedRepos: Array.from(pool.processedRepos)
        };
        fs.writeFileSync(POOL_FILE, JSON.stringify(poolToSave, null, 2));
        console.log('💾 Pool data saved successfully');
    } catch (error) {
        console.log('Error saving pool:', error.message);
    }
}

// Get today's date string
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Initialize pool with ALL current data (one-time setup)
async function initializePool(headers) {
    console.log('🚀 Initializing pool with all current data...');
    
    const pool = loadPool();
    if (pool.initialized) {
        console.log('⚠️  Pool already initialized, skipping...');
        return pool;
    }

    // Load existing cache to get better baseline data
    let existingCache = {};
    try {
        if (fs.existsSync('github_cache.json')) {
            const cacheData = JSON.parse(fs.readFileSync('github_cache.json', 'utf8'));
            existingCache = cacheData.repos || {};
            console.log('📊 Loaded existing cache data for better baseline');
        }
    } catch (error) {
        console.log('⚠️  Could not load existing cache, starting fresh');
    }

    // Fetch user data
    const userData = await apiCallWithRetry(`https://api.github.com/users/${USERNAME}`, headers);
    pool.accountCreationYear = new Date(userData.data.created_at).getFullYear();
    
    // Fetch all repositories
    const reposResponse = await apiCallWithRetry(`https://api.github.com/user/repos?per_page=100&type=all`, headers);
    const repos = reposResponse.data;
    
    console.log(`📁 Processing ${repos.length} repositories for initial pool...`);
    
    for (const repo of repos) {
        console.log(`Processing: ${repo.name}`);
        const repoKey = repo.full_name;
        
        try {
            let commitCount = 0;
            let solvedIssues = 0;
            let speedPoints = 0;
            let repoLanguageStats = {};
            
            // Check if we have cached data for this repo
            if (existingCache[repoKey]) {
                console.log(`📋 Using cached data for ${repo.name}`);
                const cachedRepo = existingCache[repoKey];
                commitCount = cachedRepo.commits || 0;
                solvedIssues = cachedRepo.solvedIssues || 0;
                speedPoints = cachedRepo.speedPoints || 0;
                repoLanguageStats = cachedRepo.languages || {};
            } else {
                console.log(`🔄 Processing fresh data for ${repo.name}`);
                
                // Get languages
                const languagesResponse = await apiCallWithRetry(`${repo.url}/languages`, headers);
                const languages = languagesResponse.data;
                
                // Get ALL commits
                const commits = await fetchAllCommits(repo.url, USERNAME, headers);
                commitCount = commits.length;
                
                // Get solved issues
                const closedIssuesResponse = await apiCallWithRetry(
                    `${repo.url}/issues?state=closed&creator=${USERNAME}`,
                    headers
                );
                solvedIssues = closedIssuesResponse.data.length;
                
                // Calculate speed points
                speedPoints = await calculateSpeedPoints(repo.url, headers);
                
                // Process languages
                const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
                for (const [language, bytes] of Object.entries(languages)) {
                    const percentage = bytes / totalBytes;
                    const languageCommits = Math.round(commitCount * percentage);
                    repoLanguageStats[language] = languageCommits;
                }
            }
            
            // Add to pool totals
            pool.totalCommits += commitCount;
            pool.totalSolvedIssues += solvedIssues;
            pool.totalSpeedPoints += speedPoints;
            
            // Merge language stats
            for (const [language, commits] of Object.entries(repoLanguageStats)) {
                pool.languageStats[language] = (pool.languageStats[language] || 0) + commits;
            }
            
            // Creator bonuses for original repos
            if (!repo.fork) {
                pool.originalReposCount++;
                pool.totalStars += repo.stargazers_count || 0;
                pool.totalForks += repo.forks_count || 0;
                
                // Calculate creator bonuses (simplified version)
                const repoQualityScore = Math.min(50, (repo.size || 0) / 20);
                const communityScore = Math.min(30, (repo.stargazers_count || 0) * 2);
                const impactScore = Math.min(20, (repo.forks_count || 0) * 5);
                const consistencyScore = Math.min(25, commitCount / 5);
                pool.creatorBonusAccuracy += repoQualityScore + communityScore + impactScore + consistencyScore;
                
                const repoAge = Math.max(1, (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
                const developmentVelocity = Math.min(40, commitCount / repoAge * 10);
                const maintenanceScore = Math.min(20, (Date.now() - new Date(repo.updated_at).getTime()) < (90 * 24 * 60 * 60 * 1000) ? 20 : 0);
                const completionScore = Math.min(30, (repo.size || 0) > 100 ? 30 : (repo.size || 0) / 3.33);
                pool.creatorBonusSpeed += developmentVelocity + maintenanceScore + completionScore;
            }
            
            pool.processedRepos.add(repo.full_name);
            
        } catch (error) {
            console.log(`Error processing ${repo.name}:`, error.message);
        }
    }
    
    pool.totalRepos = repos.length;
    pool.initialized = true;
    pool.lastUpdateDate = getTodayDate();
    
    console.log('✅ Pool initialization complete!');
    console.log(`📊 Initial Stats: ${pool.totalCommits} commits, ${pool.totalSolvedIssues} issues, ${pool.totalSpeedPoints} speed points`);
    console.log(`🎯 Top Languages: JavaScript: ${pool.languageStats.JavaScript || 0}, PHP: ${pool.languageStats.PHP || 0}, CSS: ${pool.languageStats.CSS || 0}`);
    
    return pool;
}

// Add only today's new activity to pool
async function updatePoolWithTodayActivity(headers, pool) {
    const today = getTodayDate();
    
    if (pool.lastUpdateDate === today) {
        console.log('✅ Pool already updated today, skipping...');
        return pool;
    }
    
    console.log(`📈 Adding today's activity to pool (last update: ${pool.lastUpdateDate})...`);
    
    const reposResponse = await apiCallWithRetry(`https://api.github.com/user/repos?per_page=100&type=all`, headers);
    const repos = reposResponse.data;
    
    let todayCommits = 0;
    let todayIssues = 0;
    let todaySpeedPoints = 0;
    const todayLanguages = {};
    
    for (const repo of repos) {
        try {
            // Get today's commits only
            const todayCommitsResponse = await apiCallWithRetry(
                `${repo.url}/commits?author=${USERNAME}&since=${today}T00:00:00Z&until=${today}T23:59:59Z`,
                headers
            );
            const todayRepoCommits = todayCommitsResponse.data.length;
            
            if (todayRepoCommits > 0) {
                todayCommits += todayRepoCommits;
                console.log(`📝 ${repo.name}: ${todayRepoCommits} new commits today`);
                
                // Get languages for today's commits
                const languagesResponse = await apiCallWithRetry(`${repo.url}/languages`, headers);
                const languages = languagesResponse.data;
                const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
                
                for (const [language, bytes] of Object.entries(languages)) {
                    const percentage = bytes / totalBytes;
                    const languageCommits = Math.round(todayRepoCommits * percentage);
                    todayLanguages[language] = (todayLanguages[language] || 0) + languageCommits;
                }
            }
            
            // Check for new closed issues today
            const todayIssuesResponse = await apiCallWithRetry(
                `${repo.url}/issues?state=closed&creator=${USERNAME}&since=${today}T00:00:00Z`,
                headers
            );
            const todayRepoIssues = todayIssuesResponse.data.length;
            todayIssues += todayRepoIssues;
            
        } catch (error) {
            console.log(`Error checking today's activity for ${repo.name}:`, error.message);
        }
    }
    
    // Add today's activity to pool
    pool.totalCommits += todayCommits;
    pool.totalSolvedIssues += todayIssues;
    pool.totalSpeedPoints += todaySpeedPoints;
    
    for (const [language, commits] of Object.entries(todayLanguages)) {
        pool.languageStats[language] = (pool.languageStats[language] || 0) + commits;
    }
    
    pool.lastUpdateDate = today;
    
    console.log(`📈 Today's additions: ${todayCommits} commits, ${todayIssues} issues`);
    console.log(`📊 Updated totals: ${pool.totalCommits} commits, ${pool.totalSolvedIssues} issues`);
    
    return pool;
}

// Helper functions (same logic as original)
async function fetchAllCommits(repoUrl, author, headers) {
    let page = 1;
    let allCommits = [];
    const per_page = 100;
    const maxPages = 20;

    while (page <= maxPages) {
        const commitsResponse = await apiCallWithRetry(
            `${repoUrl}/commits?author=${author}&per_page=${per_page}&page=${page}`,
            headers
        );
        
        const commits = commitsResponse.data;
        if (commits.length === 0) break;
        
        allCommits = allCommits.concat(commits);
        if (commits.length < per_page) break;
        
        page++;
    }

    return allCommits;
}

async function calculateSpeedPoints(repoUrl, headers) {
    try {
        const issuesResponse = await apiCallWithRetry(
            `${repoUrl}/issues?state=closed&creator=${USERNAME}`,
            headers
        );
        
        let totalSpeedPoints = 0;
        const issues = issuesResponse.data;
        
        for (const issue of issues) {
            const createdDate = new Date(issue.created_at);
            const closedDate = new Date(issue.closed_at);
            const daysToClose = Math.floor((closedDate - createdDate) / (1000 * 60 * 60 * 24));
            
            if (daysToClose <= 30) {
                if (daysToClose <= 3) totalSpeedPoints += 10;
                else if (daysToClose <= 6) totalSpeedPoints += 9;
                else if (daysToClose <= 9) totalSpeedPoints += 8;
                else if (daysToClose <= 12) totalSpeedPoints += 7;
                else if (daysToClose <= 15) totalSpeedPoints += 6;
                else if (daysToClose <= 18) totalSpeedPoints += 5;
                else if (daysToClose <= 21) totalSpeedPoints += 4;
                else if (daysToClose <= 24) totalSpeedPoints += 3;
                else if (daysToClose <= 27) totalSpeedPoints += 2;
                else if (daysToClose <= 30) totalSpeedPoints += 1;
            }
        }
        
        return totalSpeedPoints;
    } catch (error) {
        return 0;
    }
}

// Quest functions (fixed to work with actual Quest.json structure)
async function getDailyQuest(commits) {
    const questsData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    const currentDate = new Date().toLocaleDateString();
    
    if (questsData.daily.lastUpdate !== currentDate) {
        const quests = [
            "Organizing Code Sanctuary",
            "Debugging the Ancient Scripts",
            "Merging Parallel Dimensions",
            "Refactoring the Legacy Temple",
            "Optimizing the Data Streams",
            "Testing the Battle Scenarios",
            "Documenting the Wisdom Scrolls"
        ];
        
        questsData.daily.current = quests[Math.floor(Math.random() * quests.length)];
        questsData.daily.lastUpdate = currentDate;
        fs.writeFileSync('Quest.json', JSON.stringify(questsData, null, 2));
    }
    
    return questsData.daily.current;
}

async function getWeeklyQuest() {
    const questsData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    if (questsData.weekly && questsData.weekly.special_quests) {
        const randomIndex = Math.floor(Math.random() * questsData.weekly.special_quests.length);
        return questsData.weekly.special_quests[randomIndex];
    }
    return "API Version Management";
}

async function getMonthlyQuest() {
    const questsData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    if (questsData.monthly && questsData.monthly.boss_raids) {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        const monthlyRaid = questsData.monthly.boss_raids.find(raid => raid.month === currentMonth);
        return monthlyRaid ? monthlyRaid.raid : "Legacy Code Migration Marathon";
    }
    return "Legacy Code Migration Marathon";
}

async function getSeasonalQuest() {
    const questsData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    if (questsData.seasonal && questsData.seasonal.epic_quests) {
        const currentMonth = new Date().getMonth() + 1; // 1-12
        let currentSeason;
        if (currentMonth >= 3 && currentMonth <= 5) currentSeason = "Spring";
        else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = "Summer";
        else if (currentMonth >= 9 && currentMonth <= 11) currentSeason = "Fall";
        else currentSeason = "Winter";
        
        const seasonalQuest = questsData.seasonal.epic_quests.find(quest => quest.season === currentSeason);
        return seasonalQuest ? seasonalQuest.quest : "The Great System Renewal";
    }
    return "The Great System Renewal";
}

async function getYearlyQuest() {
    const questsData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    if (questsData.yearly && questsData.yearly.legendary_quest) {
        return questsData.yearly.legendary_quest.name;
    }
    return "The Grand Architecture Evolution";
}

// Main pool processing function
const processPoolStats = async () => {
    if (!TOKEN) {
        throw new Error('PERSONAL_GITHUB_TOKEN is not set in environment variables');
    }

    const headers = {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': USERNAME,
        'Accept': 'application/vnd.github.v3+json'
    };

    try {
        console.log('🔄 Starting pool-based stats processing...');
        
        // Load or initialize pool
        let pool = loadPool();
        
        // Convert processedRepos from Array back to Set if needed
        if (Array.isArray(pool.processedRepos)) {
            pool.processedRepos = new Set(pool.processedRepos);
        }
        
        // Initialize pool if first time
        if (!pool.initialized) {
            pool = await initializePool(headers);
        } else {
            // Add today's new activity
            pool = await updatePoolWithTodayActivity(headers, pool);
        }
        
        // Save pool
        savePool(pool);
        
        // Calculate stats from pool
        const currentYear = new Date().getFullYear();
        const totalYears = currentYear - pool.accountCreationYear;
        
        // Battle stats calculation (same formula as original)
        const attackPower = Math.floor(pool.totalCommits * 0.8 + pool.totalSolvedIssues * 2 + pool.creatorBonusAccuracy * 0.1);
        const defensePower = Math.floor(pool.totalCommits * 0.7 + pool.totalRepos * 5 + pool.creatorBonusAccuracy * 0.15);
        const healthPoint = Math.floor(pool.totalCommits * 1.2 + pool.totalRepos * 8 + totalYears * 50);
        const manaPoint = Math.floor(Object.values(pool.languageStats).length * 25 + pool.totalSpeedPoints * 2 + pool.creatorBonusSpeed * 0.1);
        const accuracy = Math.floor(pool.totalSolvedIssues * 15 + pool.totalCommits * 0.3 + pool.creatorBonusAccuracy);
        const speed = Math.floor(pool.totalSpeedPoints * 5 + pool.totalCommits * 0.5 + pool.creatorBonusSpeed);
        
        // Level calculation
        const level = Math.floor((attackPower + defensePower + healthPoint + manaPoint + accuracy + speed) / 100);
        
        // Sort languages by commits
        const sortedLanguages = Object.entries(pool.languageStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 25);
        
        // Get quests
        const dailyQuest = await getDailyQuest(pool.totalCommits);
        const weeklyQuest = await getWeeklyQuest();
        const monthlyQuest = await getMonthlyQuest();
        const seasonalQuest = await getSeasonalQuest();
        const yearlyQuest = await getYearlyQuest();
        
        // Update README
        const readmeContent = `<div align="center">

# 🎮 Developer Guild Card

<!-- Replace with your profile image -->
<img src="./assets/profile.png" width="150" height="150" style="border-radius: 50%"/>

![](https://komarev.com/ghpvc/?username=Kiyoraka&style=flat)
</div>

##  📌 Basic Info
### 👤 Name : Kiyoraka Ken
### 🎖️ Class : Full-Stack Developer
### 🎪 Guild : Kiyo Software Tech Lab 
### 🔰 Rank : E 
### ⭐ Level : ${level}

---
## 📊 Battle Stats

### ⚔️ Attack Power  : ${attackPower} 
### 🛡️ Defense Power : ${defensePower} 
### ❤️ Health Point  : ${healthPoint} 
### 🔮 Mana Point    : ${manaPoint} 
### 🎯 Accuracy      : ${accuracy} 
### ⚡ Speed         : ${speed}

---
## 💻 Programming Skills

${sortedLanguages.map(([language, commits]) => {
    const icon = LANGUAGE_ICONS[language] || '📄';
    return `### ${icon} ${language} : ${commits}`;
}).join('\n')}

---
## 📜 Active Quests

### 🌅 Daily Quest

#### Current Quest: ${dailyQuest}

### 📅 Weekly Quest
#### Current Mission: ${weeklyQuest}

### 🌙 Monthly Raid
#### ${monthlyQuest}

### 🌠 Seasonal Epic
#### ${seasonalQuest}

### 👑 Yearly Legend
#### ${yearlyQuest}

---
<div align="center">
  This profile auto update based on time by github workflow set by the user.
</div>`;

        fs.writeFileSync('README.md', readmeContent);
        
        console.log('✅ README updated successfully with pool stats!');
        console.log(`🎯 Current Level: ${level} (Pool-based, always increasing!)`);
        
    } catch (error) {
        console.error('❌ Error in pool stats processing:', error);
        throw error;
    }
};

// Export for use as module or run directly
if (require.main === module) {
    processPoolStats().catch(console.error);
}

module.exports = { processPoolStats }; 