const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

// Configuration for rate limiting and performance
const CONFIG = {
    MAX_REPOS_TO_PROCESS: 25,        // Maximum repos to process fresh per run
    CACHE_DURATION_DAYS: 7,          // How long to cache repo data (days)
    RECENT_ACTIVITY_MONTHS: 6,       // Consider repos with activity in last N months as priority
    API_TIMEOUT: 30000,              // API call timeout in milliseconds
    MAX_RETRIES: 3                   // Maximum retry attempts for failed API calls
};

// Language icons mapping
const LANGUAGE_ICONS = {
    JavaScript: '📜',      // JavaScript from Programming-Emoji.txt
    CSS: '🎨',             // CSS from Programming-Emoji.txt
    HTML: '🌐',            // HTML from Programming-Emoji.txt
    PHP: '🐘',             // PHP from Programming-Emoji.txt
    "Ren'Py": '📚',        // Visual novel = storybook (custom)
    Blade: '🧷',           // Symbolizes template binding (custom)
    Dart: '🎯',            // Dart from Programming-Emoji.txt
    Batchfile: '🗂️',       // Batch = file automation (custom)
    Python: '🐍',          // Python from Programming-Emoji.txt
    Java: '☕',            // Java from Programming-Emoji.txt
    SCSS: '🎨',            // Using CSS icon for SCSS
    "C++": '➕',           // C++ from Programming-Emoji.txt
    Hack: '🧬',            // Mutation/scripting (custom)
    "C#": '🎯',            // C# from Programming-Emoji.txt
    VBA: '📊',             // Excel/Office scripting (custom)
    C: '🎯',               // C from Programming-Emoji.txt
    CMake: '🧱',           // Building blocks, compilation (custom)
    Ruby: '💎',            // Ruby from Programming-Emoji.txt
    Swift: '📱',           // Swift from Programming-Emoji.txt
    "Objective-C": '🍎',    // Apple-related (custom)
    Kotlin: '🔰',          // Kotlin from Programming-Emoji.txt
    TypeScript: '🔷',      // TypeScript from Programming-Emoji.txt
    Vue: '💚',             // Vue.js (custom, but matches the green theme)
    Go: '🐹',              // Go from Programming-Emoji.txt
    Rust: '🦀',            // Rust from Programming-Emoji.txt
    Shell: '🐚',           // Shell (custom)
    R: '🧪',               // R from Programming-Emoji.txt
    Scala: '⚡',           // Scala from Programming-Emoji.txt
    Perl: '🌟',           // Perl from Programming-Emoji.txt
  };
  
  
  

// Configure axios with longer timeout and retry logic
axios.defaults.timeout = 30000;
axios.defaults.maxRedirects = 5;

// Add caching mechanism
const CACHE_FILE = 'github_cache.json';
const CACHE_DURATION = CONFIG.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;

function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            return cache;
        }
    } catch (error) {
        console.log('Error loading cache:', error.message);
    }
    return { repos: {}, lastUpdate: 0 };
}

function saveCache(cache) {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
        console.log('Error saving cache:', error.message);
    }
}

function shouldProcessRepo(repo, cache) {
    const now = Date.now();
    const repoKey = repo.full_name;
    
    // Always process if not in cache
    if (!cache.repos[repoKey]) {
        return true;
    }
    
    const cachedRepo = cache.repos[repoKey];
    const cacheAge = now - (cachedRepo.lastProcessed || 0);
    
    // Force refresh if cache is older than CACHE_DURATION
    if (cacheAge > CACHE_DURATION) {
        return true;
    }
    
    // Process if repo was updated since last cache
    const repoUpdated = new Date(repo.updated_at).getTime();
    const lastCached = cachedRepo.lastProcessed || 0;
    if (repoUpdated > lastCached) {
        return true;
    }
    
    return false;
}

function prioritizeRepos(repos) {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (CONFIG.RECENT_ACTIVITY_MONTHS * 30 * 24 * 60 * 60 * 1000));
    
    return repos
        .map(repo => {
            const updatedAt = new Date(repo.updated_at);
            const createdAt = new Date(repo.created_at);
            const isRecent = updatedAt > cutoffDate;
            const size = repo.size || 0;
            const hasActivity = repo.stargazers_count > 0 || repo.forks_count > 0;
            
            // Calculate priority score
            let priority = 0;
            if (isRecent) priority += 100;
            if (hasActivity) priority += 50;
            if (size > 100) priority += 25; // Non-trivial repos
            if (!repo.fork) priority += 25; // Original repos
            
            // Bonus for very recent activity
            const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 30) priority += 50;
            if (daysSinceUpdate < 7) priority += 100;
            
            return { ...repo, priority };
        })
        .sort((a, b) => b.priority - a.priority);
}

async function apiCallWithRetry(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { 
                headers,
                proxy: false
            });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Retry ${i + 1}/${retries} for ${url}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// New function to fetch all commits for a repository (with safety limits)
async function fetchAllCommits(repoUrl, author, headers) {
    let page = 1;
    let allCommits = [];
    const per_page = 100;  // Maximum allowed by GitHub API
    const maxPages = 20;   // Safety limit: max 2000 commits per repo to prevent excessive API calls

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

    if (page > maxPages) {
        console.log(`⚠️  Reached safety limit of ${maxPages} pages for ${repoUrl}, total commits: ${allCommits.length}`);
    }

    return allCommits;
}

//Fetch Today Commit (Optimized with cache)
async function getTodayCommits(reposToProcess, cache, headers, username) {
    const today = new Date().toISOString().split('T')[0];
    let todayCommits = 0;

    // Only check today's commits from repos we just processed (fresh data)
    for (const repo of reposToProcess) {
        try {
            // We already have fresh commit data from the main processing
            // So we can just query for today's commits specifically
            const todayCommitsResponse = await apiCallWithRetry(
                `${repo.url}/commits?author=${username}&since=${today}T00:00:00Z&until=${today}T23:59:59Z`,
                headers
            );
            todayCommits += todayCommitsResponse.data.length;
        } catch (error) {
            console.log(`Error counting today's commits for ${repo.name}:`, error.message);
        }
    }

    // For cached repos, we can't easily get today's commits without additional API calls
    // So we'll estimate based on recent activity or skip for rate limiting
    console.log(`Today's commits calculated from ${reposToProcess.length} recently processed repos`);
    
    return todayCommits;
}

const fetchGitHubStats = async () => {
    if (!TOKEN) {
        throw new Error('PERSONAL_GITHUB_TOKEN is not set in environment variables');
    }

    const headers = {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': USERNAME,
        'Accept': 'application/vnd.github.v3+json'
    };

    try {
        console.log('Testing connection to GitHub API...');
        const testResponse = await apiCallWithRetry('https://api.github.com/rate_limit', headers);
        console.log('Connection successful. Rate limit remaining:', testResponse.data.rate.remaining);

        // Fetch user data
        console.log('Fetching user data...');
        const userData = await apiCallWithRetry(`https://api.github.com/users/${USERNAME}`, headers);
        console.log('User data fetched successfully');

        // Load cache and fetch repositories
        const cache = loadCache();
        console.log('Fetching repositories...');
        const reposResponse = await apiCallWithRetry(`https://api.github.com/user/repos?per_page=100&type=all`, headers);
        const repos = reposResponse.data;
        console.log(`Found ${repos.length} repositories`);

        // Prioritize repositories for processing
        const prioritizedRepos = prioritizeRepos(repos);
        console.log(`Prioritized ${prioritizedRepos.length} repositories`);

        // Check current rate limit and adjust processing accordingly
        const rateLimit = testResponse.data.rate;
        const remainingCalls = rateLimit.remaining;
        const resetTime = new Date(rateLimit.reset * 1000);
        const now = new Date();
        const timeUntilReset = Math.max(0, (resetTime - now) / 1000 / 60); // minutes
        
        console.log(`Rate limit status: ${remainingCalls} calls remaining, resets in ${timeUntilReset.toFixed(1)} minutes`);
        
        // Dynamically adjust max repos based on rate limit
        let dynamicMaxRepos = CONFIG.MAX_REPOS_TO_PROCESS;
        const estimatedCallsPerRepo = 4; // languages + commits (pages) + issues + speed points
        
        if (remainingCalls < CONFIG.MAX_REPOS_TO_PROCESS * estimatedCallsPerRepo) {
            dynamicMaxRepos = Math.floor(remainingCalls / estimatedCallsPerRepo / 2); // Leave 50% buffer
            console.log(`⚠️  Rate limit protection: Reducing max repos from ${CONFIG.MAX_REPOS_TO_PROCESS} to ${dynamicMaxRepos}`);
        }

        // Determine which repos to process vs use cache
        const reposToProcess = [];
        const maxReposToProcess = Math.max(1, dynamicMaxRepos); // Always process at least 1 repo
        
        for (const repo of prioritizedRepos) {
            if (reposToProcess.length >= maxReposToProcess) {
                break;
            }
            if (shouldProcessRepo(repo, cache)) {
                reposToProcess.push(repo);
            }
        }

        console.log(`Processing ${reposToProcess.length} repositories, using cache for ${repos.length - reposToProcess.length}`);

        // Initialize stats (will combine fresh data with cached data)
        let totalCommits = 0;
        let totalSolvedIssues = 0;
        let reposWithSolvedIssues = new Set();
        let totalSpeedPoints = 0;
        const totalRepos = repos.length;
        const accountCreationYear = new Date(userData.data.created_at).getFullYear();
        const currentYear = new Date().getFullYear();
        const totalYears = currentYear - accountCreationYear;

        let languageStats = {};
        let privateRepoCount = 0;
        let publicRepoCount = 0;

        // First, load cached data for all repos not being processed
        for (const repo of repos) {
            if (repo.private) {
                privateRepoCount++;
            } else {
                publicRepoCount++;
            }

            const repoKey = repo.full_name;
            const cachedRepo = cache.repos[repoKey];
            
            // If repo is not being processed fresh, use cached data
            if (!reposToProcess.find(r => r.full_name === repo.full_name) && cachedRepo) {
                totalCommits += cachedRepo.commits || 0;
                totalSolvedIssues += cachedRepo.solvedIssues || 0;
                totalSpeedPoints += cachedRepo.speedPoints || 0;
                
                if (cachedRepo.solvedIssues > 0) {
                    reposWithSolvedIssues.add(repo.name);
                }
                
                // Merge language stats
                if (cachedRepo.languages) {
                    for (const [language, commits] of Object.entries(cachedRepo.languages)) {
                        languageStats[language] = (languageStats[language] || 0) + commits;
                    }
                }
            }
        }

        // Function to calculate speed points based on completion time
        async function calculateSpeedPoints(repoUrl, headers) {
            try {
                // Fetch closed issues
                const issuesResponse = await apiCallWithRetry(
                    `${repoUrl}/issues?state=closed&creator=${USERNAME}`,
                    headers
                );
                
                let totalSpeedPoints = 0;
                const issues = issuesResponse.data;
                
                for (const issue of issues) {
                    const createdDate = new Date(issue.created_at);
                    const closedDate = new Date(issue.closed_at);
                    
                    // Calculate days taken to close the issue
                    const daysToClose = Math.floor((closedDate - createdDate) / (1000 * 60 * 60 * 24));
                    
                    // Only consider issues closed within 30 days
                    if (daysToClose <= 30) {
                        // Calculate points based on completion time
                        if (daysToClose <= 3) {
                            totalSpeedPoints += 10;
                        } else if (daysToClose <= 6) {
                            totalSpeedPoints += 9;
                        } else if (daysToClose <= 9) {
                            totalSpeedPoints += 8;
                        }else if (daysToClose <= 12) {
                            totalSpeedPoints += 7;
                        }else if (daysToClose <= 15) {
                            totalSpeedPoints += 6;
                        }else if (daysToClose <= 18) {
                            totalSpeedPoints += 5;
                        }else if (daysToClose <= 21) {
                            totalSpeedPoints += 4;
                        }else if (daysToClose <= 24) {
                            totalSpeedPoints += 3;
                        }else if (daysToClose <= 27) {
                            totalSpeedPoints += 2;
                        }else if (daysToClose <= 30) {
                            totalSpeedPoints += 1;
                        }
                        
                    }
                }
                
                return totalSpeedPoints;
            } catch (error) {
                console.log(`Error calculating speed points: ${error.message}`);
                return 0;
            }
        }

        // Process only selected repositories (fresh data)
        for (const repo of reposToProcess) {
            const repoName = repo.full_name;
            const repoKey = repo.full_name;
            console.log(`Processing repo: ${repoName} (Priority: ${repo.priority})`);

            try {
                // Fetch languages
                const languagesResponse = await apiCallWithRetry(`${repo.url}/languages`, headers);
                const languages = languagesResponse.data;

                // Get ALL commits using pagination
                const commits = await fetchAllCommits(repo.url, USERNAME, headers);
                const commitCount = commits.length;
                totalCommits += commitCount;

                // Fetch closed issues for accuracy calculation
                const closedIssuesResponse = await apiCallWithRetry(
                    `${repo.url}/issues?state=closed&creator=${USERNAME}`,
                    headers
                );

                const solvedIssues = closedIssuesResponse.data.length;
                if (solvedIssues > 0) {
                    totalSolvedIssues += solvedIssues;
                    reposWithSolvedIssues.add(repo.name);
                }

                // Calculate speed points for this repo
                const repoSpeedPoints = await calculateSpeedPoints(repo.url, headers);
                totalSpeedPoints += repoSpeedPoints;

                // Calculate language stats for this repo
                const repoLanguageStats = {};
                const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
                for (const [language, bytes] of Object.entries(languages)) {
                    const percentage = bytes / totalBytes;
                    const languageCommits = Math.round(commitCount * percentage);
                    languageStats[language] = (languageStats[language] || 0) + languageCommits;
                    repoLanguageStats[language] = languageCommits;
                }

                // Cache this repo's data
                cache.repos[repoKey] = {
                    commits: commitCount,
                    solvedIssues: solvedIssues,
                    speedPoints: repoSpeedPoints,
                    languages: repoLanguageStats,
                    lastProcessed: Date.now(),
                    lastUpdated: new Date(repo.updated_at).getTime()
                };

            } catch (error) {
                console.log(`Error processing repo ${repoName}:`, error.message);
            }
        }

        // Save updated cache
        cache.lastUpdate = Date.now();
        saveCache(cache);

        // Log optimization summary
        console.log('\n=== Optimization Summary ===');
        console.log(`Total repositories: ${totalRepos}`);
        console.log(`Processed fresh: ${reposToProcess.length}`);
        console.log(`Used cached data: ${totalRepos - reposToProcess.length}`);
        console.log(`API calls saved: ~${(totalRepos - reposToProcess.length) * 3}`);
        console.log(`Cache hit ratio: ${((totalRepos - reposToProcess.length) / totalRepos * 100).toFixed(1)}%`);
        console.log(`Max repos limit: ${maxReposToProcess} (${maxReposToProcess === CONFIG.MAX_REPOS_TO_PROCESS ? 'normal' : 'rate-limited'})`);
        console.log('=============================\n');

        // Calculate level with adjusted formula - more balanced progression
        const totalLanguages = Object.keys(languageStats).length || 1;
        const level = Math.floor(
            totalYears * 2 + // Base from years
            (totalCommits * 0.008) + // Slightly reduced commit impact
            (totalRepos / totalLanguages) * 1.5 // Increased repo/language ratio impact
        );

        // Base stats multiplier - slightly reduced to prevent exponential scaling
        const levelMultiplier = 1 + (level * 0.04); // 4% increase per level instead of 5%

        // Attack Power: Modified to scale better with commits and repos
        const attackPower = Math.floor((
            (5 + // Base attack
            (totalCommits * 0.5) + // Direct commit impact
            (totalRepos ) + // Reward for having repositories
            (totalSolvedIssues * 0.2) + // Issue resolution impact
            (level * 7)) * // Level bonus
            levelMultiplier
        )*0.15);

        // Defense Power: Better balance between commits and languages
        const defensePower = Math.floor((
            (5 + // Base defense
            (totalCommits * 0.5) + // Direct commit impact
            (totalLanguages * 1.5 ) + // Significant bonus for language diversity
            (level * 7)) * // Level bonus
            levelMultiplier
        )*0.15);

        // Health Points: Good scaling, no changes needed
        const healthPoints = Math.floor((
            (100 + // Base HP
            (totalCommits * 0.8) + // Commit impact
            (totalRepos * 15) + // Repo bonus
            (level * 25)) * // Level bonus
            (1 + (totalLanguages / 25)) // Language diversity scaling
        )*0.15);

        // Mana Points: Good scaling with languages and solved issues
        const manapoints = Math.floor((
            (75 + // Base MP
            (totalCommits * 0.8) + // Commit impact
            (totalLanguages * 18) + // Language bonus
            (level * 12)) * // Level bonus
            (1 + (reposWithSolvedIssues.size / 20)) // Quality scaling
        )*0.15);

        // Accuracy Points: Good balance with solved issues
        const accuracypoint = Math.floor((
            (7 + // Base accuracy
            (totalSolvedIssues * 2.5) + // Issue resolution impact
            (reposWithSolvedIssues.size * 3.5) + // Repo quality impact
            (level * 9)) * // Level bonus
            (1 + (level / 45)) // Level scaling
        )*0.15);

        // Speed Points: Good overall balance
        const speedpoint = Math.floor((
            (7 + // Base speed
            (totalSpeedPoints * 0.9) + // Completion bonus
            (level * 9) + // Level bonus
            (totalSolvedIssues * 1.5)) * // Issue efficiency bonus
            (1 + (level / 35)) // Level scaling
        )*0.15);


        // Rank point calculation with adjusted weights
        const totalRankPoints = Math.floor(
            attackPower * 1.25 +    // Reduced offensive weight
            defensePower * 1.25 +   // Reduced defensive weight
            healthPoints * 1 +   // Reduced HP weight
            manapoints * 1 +     // Reduced MP weight
            accuracypoint * 1.5 +  // Reduced accuracy weight
            speedpoint * 1.25      // Reduced speed weight
        );

        // Rank thresholds with smoother progression
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

        const todayCommits = await getTodayCommits(reposToProcess, cache, headers, USERNAME);

        return {
            level,
            attackPower,
            defensePower,
            healthPoints,
            manapoints,
            accuracypoint,
            speedpoint,
            rank,
            languageStats,
            details: {
                totalYears,
                totalCommits,
                todayCommits,
                totalRepos,
                totalLanguages,
                publicRepos: publicRepoCount,
                privateRepos: privateRepoCount,
                totalRankPoints,
                totalSolvedIssues,
                reposWithSolvedIssuesCount: reposWithSolvedIssues.size
            }
        };
    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw new Error(`GitHub API Error: ${error.message}`);
    }
};

//Fetch Weekly Quest
async function getWeeklyQuest() {
    const questData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    const currentWeek = Math.floor((new Date().getTime() / (1000 * 60 * 60 * 24 * 7)));
    return questData.weekly.special_quests[currentWeek % questData.weekly.special_quests.length];
}

//Fetch Monthly Quest
async function getMonthlyQuest() {
    const questData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    const currentMonth = new Date().getMonth();
    return questData.monthly.boss_raids[currentMonth];
}

//Fetch Seasonal Quest
async function getSeasonalQuest() {
    const questData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    const currentMonth = new Date().getMonth();
    const season = Math.floor(currentMonth / 3);
    return questData.seasonal.epic_quests[season];
}

//Fetch Yearly Quest
async function getYearlyQuest() {
    const questData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    return questData.yearly.legendary_quest;
}

// Modify the getDailyQuest function
async function getDailyQuest(commits) {
    const questData = JSON.parse(fs.readFileSync('Quest.json', 'utf8'));
    
    if (commits === 0) {
        return questData.daily.idle[Math.floor(Math.random() * questData.daily.idle.length)];
    }
    
    const tiers = {
        novice: [1, 10],
        intermediate: [11, 20],
        advanced: [21, 50],
        expert: [51, 100],
        legendary: [101, 10000]
    };

    for (const [tier, [min, max]] of Object.entries(tiers)) {
        if (commits >= min && commits <= max) {
            return questData.daily[tier].quests[
                Math.floor(Math.random() * questData.daily[tier].quests.length)
            ];
        }
    }
    
    return questData.daily.legendary.quests[
        Math.floor(Math.random() * questData.daily.legendary.quests.length)
    ];
}

const updateReadme = async () => {
    try {
        console.log('Starting README update process...');
        const stats = await fetchGitHubStats();
        
        if (!stats) {
            throw new Error('Failed to fetch GitHub stats');
        }

        const { level, attackPower, defensePower, healthPoints, manapoints, accuracypoint, speedpoint, rank, languageStats, details } = stats;

        // Get all quests
        const today = new Date().toISOString().split('T')[0];
        const todayCommits = stats.details.todayCommits || 0;
        const dailyQuest = await getDailyQuest(todayCommits);
        const weeklyQuest = await getWeeklyQuest();
        const monthlyQuest = await getMonthlyQuest();
        const seasonalQuest = await getSeasonalQuest();
        const yearlyQuest = await getYearlyQuest();

        // Create language skills section
        const languageSkillsSection = Object.entries(languageStats)
            .sort(([, a], [, b]) => b - a)
            .map(([language, points]) => {
                const icon = LANGUAGE_ICONS[language] || '📝';
                return `### ${icon} ${language} : ${points}`;
            })
            .join('\n');

        const readmeContent = `

<div align="center">

# 🎮 Developer Guild Card

<!-- Replace with your profile image -->
<img src="./assets/profile.png" width="150" height="150" style="border-radius: 50%"/>

![](https://komarev.com/ghpvc/?username=Kiyoraka&style=flat)
</div>

##  📌 Basic Info
### 👤 Name : Kiyoraka Ken
### 🎖️ Class : Full-Stack Developer
### 🎪 Guild : Kiyo Software Tech Lab 
### 🔰 Rank : ${rank} 
### ⭐ Level : ${level}

---
## 📊 Battle Stats

### ⚔️ Attack Power  : ${attackPower} 
### 🛡️ Defense Power : ${defensePower} 
### ❤️ Health Point  : ${healthPoints} 
### 🔮 Mana Point    : ${manapoints} 
### 🎯 Accuracy      : ${accuracypoint} 
### ⚡ Speed         : ${speedpoint}

---
## 💻 Programming Skills

${languageSkillsSection}

---
## 📜 Active Quests

### 🌅 Daily Quest

#### Current Quest: ${dailyQuest}

### 📅 Weekly Quest
#### Current Mission: ${weeklyQuest}

### 🌙 Monthly Raid
#### ${monthlyQuest.raid}
#### ${monthlyQuest.description}

### 🌠 Seasonal Epic
#### ${seasonalQuest.quest}
#### ${seasonalQuest.description}

### 👑 Yearly Legend
#### ${yearlyQuest.name}
#### Current Phase: ${yearlyQuest.phases[Math.floor((new Date().getMonth()) / 1.5)]}

---
<div align="center">
  This profile auto update based on time by github workflow set by the user.
</div>`;

        fs.writeFileSync('README.md', readmeContent.trim());
        console.log('README.md updated successfully!');

    } catch (error) {
        console.error('Failed to update README:', error);
        process.exit(1);
    }
};

updateReadme();
