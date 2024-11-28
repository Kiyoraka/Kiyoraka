const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

// Language icons mapping
const LANGUAGE_ICONS = {
  // Web Languages
  JavaScript: '📋',
  TypeScript: '🔷',
  HTML: '🌐',
  CSS: '🎨',
  PHP: '🐘',
  
  // General Purpose Languages
  Python: '🐍',
  Java: '☕',
  'C++': '➕',
  'C#': '🎯',
  Ruby: '💎',
  Swift: '📱',
  Kotlin: '🔰',
  Go: '🐹',
  Rust: '🦀',
  
  // Scripting Languages
  Lua: '🌙',
  Bash: '📺',
  PowerShell: '💠',
  'Batch': '📋',
  Shell: '🐚',
  
  // Game Development
  "Ren'Py": '🎭',
  Unity: '🎮',
  
  // Frontend Frameworks
  React: '⚛️',
  Vue: '💚',
  Angular: '🅰️',
  Svelte: '🎨',
  'Next.js': '▲',
  'Nuxt.js': '💚',
  
  // Backend Frameworks
  'Express.js': '🚂',
  Django: '🌶️',
  Flask: '🌪️',
  'Spring Boot': '🍃',
  Laravel: '🎵',
  Blade: '🗡️',
  FastAPI: '⚡',
  NestJS: '🐈',
  
  // Mobile Frameworks
  Flutter: '📱',
  'React Native': '📱',
  
  // DevOps & Container
  Docker: '🐳',
  'Docker Compose': '🐋',
  Kubernetes: '☸️',
  Jenkins: '👷',
  
  // Documentation & Data
  Markdown: '📝',
  JSON: '📦',
  YAML: '⚙️',
  GraphQL: '📊',
  
  // Databases
  PostgreSQL: '🐘',
  MySQL: '🐬',
  MongoDB: '🍃',
  Redis: '⚡',
  SQLite: '🔷',
  
  // Design Tools
  Figma: '🎨',
  
  // State Management
  Redux: '💫',
  
  // CSS Frameworks
  'Tailwind CSS': '💨',
  Bootstrap: '🅱️',
  Sass: '💅',
  
};

// Configure axios with longer timeout and retry logic
axios.defaults.timeout = 30000;
axios.defaults.maxRedirects = 5;

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

// New function to fetch all commits for a repository
async function fetchAllCommits(repoUrl, author, headers) {
    let page = 1;
    let allCommits = [];
    const per_page = 100;  // Maximum allowed by GitHub API

    while (true) {
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

//Fetch Today Commit
async function getTodayCommits(repos, headers, username) {
    const today = new Date().toISOString().split('T')[0];
    let todayCommits = 0;

    for (const repo of repos) {
        try {
            const commits = await fetchAllCommits(repo.url, username, headers);
            const todayCommitsCount = commits.filter(commit => {
                const commitDate = new Date(commit.commit.author.date).toISOString().split('T')[0];
                return commitDate === today;
            }).length;
            todayCommits += todayCommitsCount;
        } catch (error) {
            console.log(`Error counting today's commits for ${repo.name}:`, error.message);
        }
    }

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

        // Fetch repositories
        console.log('Fetching repositories...');
        const reposResponse = await apiCallWithRetry(`https://api.github.com/user/repos?per_page=100&type=all`, headers);
        const repos = reposResponse.data;
        console.log(`Found ${repos.length} repositories`);

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

        // Process each repository
        for (const repo of repos) {
            const repoName = repo.full_name;
            if (repo.private) {
                privateRepoCount++;
                console.log(`Processing private repo: ${repoName}`);
            } else {
                publicRepoCount++;
                console.log(`Processing public repo: ${repoName}`);
            }

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

                // Calculate language stats
                const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
                for (const [language, bytes] of Object.entries(languages)) {
                    const percentage = bytes / totalBytes;
                    const languageCommits = Math.round(commitCount * percentage);
                    languageStats[language] = (languageStats[language] || 0) + languageCommits;
                }
            } catch (error) {
                console.log(`Error processing repo ${repoName}:`, error.message);
            }
        }

        // Calculate level with adjusted formula
        const totalLanguages = Object.keys(languageStats).length || 1;
        const level = Math.floor(
            totalYears + 
            (totalCommits * 0.01) + 
            (totalRepos / totalLanguages)
        );

        // Base stats multiplier 
        const levelMultiplier = 1 + (level * 0.05); // 5% increase per level

        // Attack Power: 
        const attackPower = Math.floor((
            (25 + // Base attack
            (totalCommits / Math.max(totalRepos, 1)) * 0.8 + // Reduced commit density impact
            (totalSolvedIssues * 0.15) + // Reduced issue bonus
            (level * 8)) * // Reduced level bonus
            levelMultiplier
        )*0.1);

        // Defense Power: 
        const defensePower = Math.floor((
            (20 + // Base defense
            (totalCommits / Math.max(totalLanguages, 1)) * 0.7 + // Reduced language efficiency impact
            (totalLanguages * 1.5) + // Reduced language diversity bonus
            (level * 10)) * // Level bonus
            levelMultiplier
        )*0.1);

        // Health Points
        const healthPoints = Math.floor((
            (80 + // Base HP
            (totalCommits * 0.75) + // Reduced commit impact
            (totalRepos * 12) + // Reduced repo bonus
            (level * 20)) * // Level bonus
            (1 + (totalLanguages / 30)) // Reduced language diversity scaling
        )*0.1);

        // Mana Points
        const manapoints = Math.floor((
            (60 + // Base MP
            (totalCommits * 0.75) + // Reduced commit bonus
            (totalLanguages * 15) + // Reduced language bonus
            (level * 15)) * // Reduced level bonus
            (1 + (reposWithSolvedIssues.size / 25)) // Reduced quality scaling
        )*0.1);

        // Accuracy Points
        const accuracypoint = Math.floor((
            (15 + // Base accuracy
            (totalSolvedIssues * 2) + // Reduced issue resolution bonus
            (reposWithSolvedIssues.size * 3) + // Reduced repo quality bonus
            (level * 4)) * // Level bonus
            (1 + (level / 50)) // Reduced level scaling
        )*0.1);

        // Speed Points
        const speedpoint = Math.floor((
            (20 + // Base speed
            (totalSpeedPoints * 0.8) + // Reduced completion bonus
            (level * 5) + // Reduced level bonus
            (totalSolvedIssues * 0.3)) * // Reduced issue efficiency bonus
            (1 + (level / 40)) // Reduced level scaling
        )*0.1);

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

        const todayCommits = await getTodayCommits(repos, headers, USERNAME);

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
