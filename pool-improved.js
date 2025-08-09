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

// Language file extensions mapping for commit analysis
const LANGUAGE_EXTENSIONS = {
    'JavaScript': ['.js', '.jsx', '.mjs', '.cjs'],
    'TypeScript': ['.ts', '.tsx'],
    'PHP': ['.php'],
    'Blade': ['.blade.php'],
    'CSS': ['.css'],
    'SCSS': ['.scss', '.sass'],
    'HTML': ['.html', '.htm'],
    'Vue': ['.vue'],
    'Dart': ['.dart'],
    'Python': ['.py'],
    'Java': ['.java'],
    'C++': ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    'C': ['.c', '.h'],
    'C#': ['.cs'],
    'Ruby': ['.rb'],
    'Go': ['.go'],
    'Rust': ['.rs'],
    'Swift': ['.swift'],
    'Kotlin': ['.kt', '.kts'],
    'Objective-C': ['.m', '.mm', '.h'],
    'Batchfile': ['.bat', '.cmd'],
    'Shell': ['.sh', '.bash', '.zsh'],
    'VBA': ['.vba', '.bas'],
    'CMake': ['.cmake', 'CMakeLists.txt'],
    'Hack': ['.hack', '.hh', '.hck'],
    'Ren\'Py': ['.rpy'],
    'ShaderLab': ['.shader'],
    'HLSL': ['.hlsl', '.fx']
};

// Get language from file path
function getLanguageFromFile(filePath) {
    const fileName = filePath.toLowerCase();
    
    // Check for specific patterns first
    if (fileName.includes('.blade.php')) return 'Blade';
    if (fileName.includes('cmakelists.txt')) return 'CMake';
    
    // Check file extensions
    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
        for (const ext of extensions) {
            if (fileName.endsWith(ext)) {
                return language;
            }
        }
    }
    
    return null;
}

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

// IMPROVED: Analyze commits to count languages by actual work
async function analyzeCommitsByLanguage(repoUrl, headers, maxCommits = 50) {
    const languageCommits = {};
    let page = 1;
    let totalAnalyzed = 0;
    
    while (page <= 5 && totalAnalyzed < maxCommits) { // Limit pages to avoid rate limits
        try {
            const commitsResponse = await apiCallWithRetry(
                `${repoUrl}/commits?author=${USERNAME}&per_page=100&page=${page}`,
                headers
            );
            
            const commits = commitsResponse.data;
            if (commits.length === 0) break;
            
            for (const commit of commits) {
                if (totalAnalyzed >= maxCommits) break;
                
                try {
                    // Get commit details to see changed files
                    const commitDetailResponse = await apiCallWithRetry(
                        commit.url,
                        headers
                    );
                    
                    const commitDetail = commitDetailResponse.data;
                    
                    // Count files by language
                    if (commitDetail.files) {
                        for (const file of commitDetail.files) {
                            const language = getLanguageFromFile(file.filename);
                            if (language) {
                                languageCommits[language] = (languageCommits[language] || 0) + 1;
                            }
                        }
                    }
                    
                    totalAnalyzed++;
                    
                    // Rate limit protection
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                } catch (error) {
                    console.log(`Error analyzing commit: ${error.message}`);
                    continue;
                }
            }
            
            if (commits.length < 100) break;
            page++;
            
        } catch (error) {
            console.log(`Error fetching commits page ${page}:`, error.message);
            break;
        }
    }
    
    return languageCommits;
}

// Initialize pool with ALL current data (IMPROVED with commit-based language detection)
async function initializePool(headers) {
    console.log('🚀 Initializing pool with all current data (IMPROVED language detection)...');
    
    const pool = loadPool();
    if (pool.initialized) {
        console.log('⚠️  Pool already initialized, skipping...');
        return pool;
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
            
            console.log(`🔄 Processing fresh data for ${repo.name}`);
            
            // Get ALL commits
            const commits = await fetchAllCommits(repo.url, USERNAME, headers);
            commitCount = commits.length;
            
            // IMPROVED: Get language stats by analyzing actual commits
            if (commitCount > 0) {
                console.log(`📊 Analyzing ${Math.min(commitCount, 50)} commits for language detection...`);
                repoLanguageStats = await analyzeCommitsByLanguage(repo.url, headers, Math.min(commitCount, 50));
            }
            
            // Get solved issues
            const closedIssuesResponse = await apiCallWithRetry(
                `${repo.url}/issues?state=closed&creator=${USERNAME}`,
                headers
            );
            solvedIssues = closedIssuesResponse.data.length;
            
            // Calculate speed points
            speedPoints = await calculateSpeedPoints(repo.url, headers);
            
            // Add to pool totals
            pool.totalCommits += commitCount;
            pool.totalSolvedIssues += solvedIssues;
            pool.totalSpeedPoints += speedPoints;
            
            // Merge language stats (now based on actual commits!)
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
    console.log(`🎯 Top Languages: JavaScript: ${pool.languageStats.JavaScript || 0}, PHP: ${pool.languageStats.PHP || 0}, Blade: ${pool.languageStats.Blade || 0}`);
    
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

// Quest functions (same as original)
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

// Main pool processing function (IMPROVED)
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
        console.log('🔄 Starting IMPROVED pool-based stats processing...');
        
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
            console.log('⚠️  Pool already initialized. To use improved language detection, delete pool.json and run again.');
        }
        
        // Save pool
        savePool(pool);
        
        // Calculate stats from pool (same formulas as before)
        const currentYear = new Date().getFullYear();
        const totalYears = currentYear - pool.accountCreationYear;
        
        // Calculate level with proper formula - more balanced progression
        const totalLanguages = Object.keys(pool.languageStats).length || 1;
        const level = Math.floor(
            totalYears * 2 + // Base from years
            (pool.totalCommits * 0.08) + // Commit impact (adjusted for proper scaling)
            (pool.totalRepos / totalLanguages) * 1.5 // Repo/language ratio impact
        );

        // Simpler battle stats calculation (closer to original system)
        const attackPower = Math.floor(
            pool.totalCommits * 0.8 + // Primary commit impact
            pool.totalSolvedIssues * 2 + // Issue resolution bonus
            (pool.creatorBonusAccuracy * 0.1) // Small creator bonus
        );

        const defensePower = Math.floor(
            pool.totalCommits * 0.7 + // Primary commit impact  
            pool.totalRepos * 5 + // Repository diversity
            (pool.creatorBonusAccuracy * 0.15) // Small creator bonus
        );

        const healthPoint = Math.floor(
            pool.totalCommits * 1.2 + // Primary commit impact
            pool.totalRepos * 8 + // Repository bonus
            totalYears * 50 // Experience bonus
        );

        const manaPoint = Math.floor(
            totalLanguages * 25 + // Language diversity
            pool.totalSpeedPoints * 2 + // Speed contribution
            (pool.creatorBonusSpeed * 0.1) // Small creator bonus
        );

        // Balanced accuracy calculation (emphasizes problem-solving quality)
        const accuracy = Math.floor(
            pool.totalSolvedIssues * 25 + // Issue solving (increased from 15 to 25)
            pool.totalCommits * 0.3 + // Commit consistency (same)
            (pool.creatorBonusAccuracy * 0.5) // Creator bonus (reduced from 1.0 to 0.5)
        );

        // Balanced speed calculation (reduced for better balance)
        const speed = Math.floor(
            pool.totalSpeedPoints * 2 + // Basic speed points (reduced from 5 to 2)
            pool.totalCommits * 0.2 + // Development velocity (reduced from 0.5 to 0.2)
            (pool.creatorBonusSpeed * 0.5) // Creator bonus (reduced from 1.0 to 0.5)
        );
        
        // Rank point calculation with proper weights
        const totalRankPoints = Math.floor(
            attackPower * 1.25 +    // Offensive weight
            defensePower * 1.25 +   // Defensive weight
            healthPoint * 1 +       // HP weight
            manaPoint * 1 +         // MP weight
            accuracy * 1.5 +        // Accuracy weight
            speed * 1.25            // Speed weight
        );

        // Rank thresholds with proper progression
        let rank;
        if (totalRankPoints <= 1200) {
            rank = 'G';
        } else if (totalRankPoints <= 3600) {
            rank = 'F';
        } else if (totalRankPoints <= 8400) {
            rank = 'E';
        } else if (totalRankPoints <= 14400) {
            rank = 'D';
        } else if (totalRankPoints <= 24000) {
            rank = 'C';
        } else if (totalRankPoints <= 42000) {
            rank = 'B';
        } else if (totalRankPoints <= 72000) {
            rank = 'A';
        } else if (totalRankPoints <= 120000) {
            rank = 'S';
        } else {
            rank = 'X';
        }

        function getRankIcon(rank) {
            const rankIcons = {
                "G": "🔰",
                "F": "🥉", 
                "E": "🥈",
                "D": "🥇",
                "C": "🥈",
                "B": "🥇",
                "A": "💎",
                "S": "👑",
                "X": "⭐"
            };
            return rankIcons[rank] || "🔰";
        }
        
        function getRankName(rank) {
            const rankNames = {
                "G": "Novice",
                "F": "Bronze", 
                "E": "Silver",
                "D": "Gold",
                "C": "Silver",
                "B": "Gold",
                "A": "Platinum",
                "S": "Legend",
                "X": "Mythic"
            };
            return rankNames[rank] || "Novice";
        }
        
        const rankIcon = getRankIcon(rank);
        const rankName = getRankName(rank);
        
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
### ${rankIcon} Rank : ${rank} (${rankName})
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
        
        console.log('✅ README updated successfully with IMPROVED pool stats!');
        console.log(`🎯 Current Level: ${level} (IMPROVED commit-based language detection!)`);
        
    } catch (error) {
        console.error('❌ Error in improved pool stats processing:', error);
        throw error;
    }
};

// Export for use as module or run directly
if (require.main === module) {
    processPoolStats().catch(console.error);
}

module.exports = { processPoolStats };
