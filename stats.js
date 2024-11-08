const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

// Language icons mapping
const LANGUAGE_ICONS = {
  // Web Languages
  JavaScript: '📜',
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
  Unity: '⚫',
  
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
  
  // Cloud Platforms
  AWS: '☁️',
  Azure: '☁️',
  Vercel: '▲',
  
  // Tools & Technologies
  Git: '🔄',
  npm: '📦',
  Yarn: '🧶',
  Linux: '🐧',
  
  // Design Tools
  Figma: '🎨',
  
  // State Management
  Redux: '💫',
  
  // CSS Frameworks
  'Tailwind CSS': '💨',
  Bootstrap: '🅱️',
  Sass: '💅',
  
  // Package Managers
  Composer: '🎼',
  Pip: '📦',
  
  // IDEs & Editors
  'VS Code': '💻',
  'Visual Studio': '🎯',
  'IntelliJ IDEA': '🧠',
  
  // Server
  'Nginx': '⚡',
  'Apache': '🦅'
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
        let totalIssues = 0;
        let issueRelatedCommits = 0;
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
                        } else if (daysToClose <= 12) {
                            totalSpeedPoints += 7;
                        } else if (daysToClose <= 15) {
                            totalSpeedPoints += 6;
                        } else if (daysToClose <= 18) {
                            totalSpeedPoints += 5;
                        } else if (daysToClose <= 21) {
                            totalSpeedPoints += 4;
                        } else if (daysToClose <= 24) {
                            totalSpeedPoints += 3;
                        } else if (daysToClose <= 27) {
                            totalSpeedPoints += 2;
                        } else if (daysToClose <= 30) {
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

        // Function to check if a commit is related to an issue
        async function getIssueRelatedCommits(repoUrl, commits, headers) {
            let issueRelatedCommits = 0;
            
            for (const commit of commits) {
                // Check commit message for issue references (#number)
                const message = commit.commit.message.toLowerCase();
                if (message.includes('#') && /\#\d+/.test(message)) {
                    issueRelatedCommits++;
                }
            }
            
            return issueRelatedCommits;
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

                // Count issue-related commits
                const repoIssueCommits = await getIssueRelatedCommits(repo.url, commits, headers);
                issueRelatedCommits += repoIssueCommits;

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
        
        const attackPower = Math.floor(totalCommits / totalRepos);
        const defensePower = Math.floor(totalCommits / totalLanguages);
        const healthPoints = Math.floor((totalCommits + attackPower + totalRepos) * 0.5);
        const manapoints = Math.floor((totalCommits + defensePower + totalRepos) * 0.5);
        const accuracypoint = Math.floor(issueRelatedCommits + level);
        const speedpoint = Math.floor(totalSpeedPoints + level);

        // Calculate total rank points
        const totalRankPoints = attackPower + defensePower + healthPoints + manapoints + accuracypoint + speedpoint;

        // Determine rank based on total points
        let rank;
        if (totalRankPoints <= 999) {
            rank = 'G';
        } else if (totalRankPoints <= 2999) {
            rank = 'F';
        } else if (totalRankPoints <= 6999) {
            rank = 'D';
        } else if (totalRankPoints <= 11999) {
            rank = 'C';
        } else if (totalRankPoints <= 19999) {
            rank = 'B';
        } else if (totalRankPoints <= 34999) {
            rank = 'A';
        } else if (totalRankPoints <= 99999) {
            rank = 'S';
        } else {
            rank = 'X';
        }

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
                totalRepos,
                totalLanguages,
                publicRepos: publicRepoCount,
                privateRepos: privateRepoCount,
                totalRankPoints // Adding total rank points to details
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

const updateReadme = async () => {
    try {
        console.log('Starting README update process...');
        const stats = await fetchGitHubStats();
        
        if (!stats) {
            throw new Error('Failed to fetch GitHub stats');
        }

        const { level, attackPower, defensePower, healthPoints, manapoints, accuracypoint, speedpoint, rank, languageStats, details } = stats;

        // Create language skills section with icons
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
</div>

## Developer Stats   
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
---`;

        fs.writeFileSync('README.md', readmeContent.trim());
        console.log('README.md updated successfully!');

    } catch (error) {
        console.error('Failed to update README:', error);
        process.exit(1);
    }
};

updateReadme();