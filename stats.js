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

const fetchGitHubStats = async () => {
  try {
    const headers = {
      'Authorization': `token ${TOKEN}`,
      'User-Agent': USERNAME,
    };

    // Fetch user data
    const userData = await axios.get(`https://api.github.com/users/${USERNAME}`, { headers });
    const repos = await axios.get(userData.data.repos_url, { headers });

    let totalCommits = 0;
    let totalIssues = 0;
    const totalRepos = repos.data.length;
    const accountCreationYear = new Date(userData.data.created_at).getFullYear();
    const currentYear = new Date().getFullYear();
    const totalYears = currentYear - accountCreationYear;

    // Initialize language stats
    let languageStats = {};

    // Fetch data for each repository
    for (const repo of repos.data) {
      const repoName = repo.full_name;
      console.log(`\n📂 Processing repository: ${repoName}`);

      // Fetch commits count
      const commitsData = await axios.get(`${repo.url}/contributors`, { headers });
      const commitsCount = commitsData.data.find(contrib => contrib.login === USERNAME)?.contributions || 0;
      totalCommits += commitsCount;

      // Fetch issues count
      const issuesUrl = `https://api.github.com/repos/${repoName}/issues?per_page=1`;
      const issuesData = await axios.get(issuesUrl, { headers });
      totalIssues += issuesData.data.length;

      // Fetch repository languages
      const languagesUrl = `https://api.github.com/repos/${repoName}/languages`;
      const languagesData = await axios.get(languagesUrl, { headers });
      
      // Calculate commit distribution per language based on language percentage
      const totalBytes = Object.values(languagesData.data).reduce((a, b) => a + b, 0);
      
      for (const [language, bytes] of Object.entries(languagesData.data)) {
        const percentage = bytes / totalBytes;
        const languageCommits = Math.round(commitsCount * percentage);
        languageStats[language] = (languageStats[language] || 0) + languageCommits;
      }
    }

    // Calculate total number of programming languages
    const totalLanguages = Object.keys(languageStats).length;

    // New level calculation
    // Level = Total Years + (Total Commits * 0.01) + (Total Repos / Total Languages)
    const level = Math.floor(
      totalYears + 
      (totalCommits * 0.01) + 
      (totalRepos / (totalLanguages || 1))  // Prevent division by zero
    );

    console.log('\n📊 Level Calculation Details:');
    console.log(`Total Years: ${totalYears}`);
    console.log(`Commit Bonus: ${(totalCommits * 0.01).toFixed(2)}`);
    console.log(`Repo/Language Bonus: ${(totalRepos / (totalLanguages || 1)).toFixed(2)}`);
    console.log(`Final Level: ${level}`);

    const attackPower = totalCommits;
    const defensePower = Math.max(0, totalCommits - totalIssues);
    const healthPoints = totalCommits * totalRepos;

    return { 
      level, 
      attackPower, 
      defensePower, 
      healthPoints,
      languageStats,
      // Add detailed stats for debugging
      details: {
        totalYears,
        totalCommits,
        totalRepos,
        totalLanguages
      }
    };
  } catch (error) {
    console.error('❌ Error fetching GitHub data:', error.message);
    return null;
  }
};

const updateReadme = async () => {
  const stats = await fetchGitHubStats();

  if (stats) {
    const { level, attackPower, defensePower, healthPoints, languageStats, details } = stats;

    // Create language skills section
    const languageSkillsSection = Object.entries(languageStats)
      .sort(([, a], [, b]) => b - a) // Sort by points
      .map(([language, points]) => {
        const icon = LANGUAGE_ICONS[language] || '📝';
        return `### ${icon} ${language} : ${points}`;
      })
      .join('\n');

    // Update README.md file
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

---
## 📊 Programming Skills

${languageSkillsSection}
---
    `;
    fs.writeFileSync('README.md', readmeContent.trim());
    console.log("✅ README.md has been updated successfully!");
  }
};

updateReadme();