const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

// Language icons mapping
const LANGUAGE_ICONS = {
  JavaScript: '🧠',
  TypeScript: '🌳',
  HTML: '🎨',
  CSS: '✨',
  Python: '🐍',
  Java: '☕',
  'C++': '⚙️',
  C: '📟',
  'C#': '🎯',
  Ruby: '💎',
  PHP: '🐘',
  Swift: '🦅',
  Kotlin: '🎯',
  Go: '🦦',
  Rust: '⚙️',
  Shell: '🐚',
  Vue: '🟩',
  React: '⚛️',
  Angular: '🔺',
  Dart: '🎯',
  Flutter: '🦋',
  Scala: '🌟',
  Lua: '🌙',
  Perl: '🐪',
  Haskell: '🎯',
  R: '📊',
  MATLAB: '🧮',
  Assembly: '🌩️',
  Dockerfile: '🐋',
  'Jupyter Notebook': '📓',
  Markdown: '📝',
  XML: '📑',
  YAML: '⚙️',
  JSON: '📦',
  PostgreSQL: '🐘',
  MySQL: '🐬',
  MongoDB: '🍃',
  Redis: '🔴'
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
        const totalRepos = repos.length;
        const accountCreationYear = new Date(userData.data.created_at).getFullYear();
        const currentYear = new Date().getFullYear();
        const totalYears = currentYear - accountCreationYear;

        let languageStats = {};
        let privateRepoCount = 0;
        let publicRepoCount = 0;

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

        return {
            level,
            attackPower,
            defensePower,
            healthPoints,
            manapoints,
            languageStats,
            details: {
                totalYears,
                totalCommits,
                totalRepos,
                totalLanguages,
                publicRepos: publicRepoCount,
                privateRepos: privateRepoCount
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

      const { level, attackPower, defensePower, healthPoints, manapoints, languageStats, details } = stats;

      // Create language skills section with icons
      const languageSkillsSection = Object.entries(languageStats)
          .sort(([, a], [, b]) => b - a)
          .map(([language, points]) => {
              const icon = LANGUAGE_ICONS[language] || '📝'; // Use default icon if not found
              return `### ${icon} ${language} : ${points}`;
          })
          .join('\n');

      const readmeContent = `
<div align="center">

# 🎮 Developer Guild Card

<!-- Replace with your profile image -->
<img src="./assets/profile.png" width="150" height="150" style="border-radius: 50%"/>
</div>

##    
### 👤 Name : Kiyoraka Ken
### 🎖️ Class : Full-Stack Developer
### ⭐ Level : ${level}
<!-- Level = ${details.totalYears} years + (${details.totalCommits} commits × 0.01) + (${details.totalRepos} repos ÷ ${details.totalLanguages} languages) -->

---
## 📊 Detailed Battle Stats

### ⚔️ Attack Power : ${attackPower} 
### 🛡️ Defense Power : ${defensePower} 
### ❤️ Health Point : ${healthPoints} 
### 🔮 Mana Point : ${manapoints} 

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