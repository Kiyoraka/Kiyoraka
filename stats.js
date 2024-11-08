const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN; // Access token from environment variable

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

    // Fetch data for each repository (use a reduced API call to avoid rate limits)
    for (const repo of repos.data) {
      const repoName = repo.full_name;
      const commitsUrl = `https://api.github.com/repos/${repoName}/commits?per_page=1`;
      const issuesUrl = `https://api.github.com/repos/${repoName}/issues?per_page=1`;

      // Fetch commits count using the 'commits' API
      const commitsData = await axios.get(`${repo.url}/contributors`, { headers });
      const commitsCount = commitsData.data.find(contrib => contrib.login === USERNAME)?.contributions || 0;
      totalCommits += commitsCount;

      // Fetch issues count
      const issuesData = await axios.get(issuesUrl, { headers });
      totalIssues += issuesData.data.length;
    }

    // Calculations
    const level = Math.floor(totalCommits / totalYears);
    const attackPower = totalCommits;
    const defensePower = Math.max(0, totalCommits - totalIssues);
    const healthPoints = totalCommits * totalRepos;

    return { level, attackPower, defensePower, healthPoints };
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    return null;
  }
};

const updateReadme = async () => {
  const stats = await fetchGitHubStats();

  if (stats) {
    const { level, attackPower, defensePower, healthPoints } = stats;

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
### Level : ${level}
---
## 📊 Detailed Battle Stats

### ⚔️ Attack Power : ${attackPower}
### 🛡️ Defense Power : ${defensePower}
### ❤️ Health Point : ${healthPoints}
---
    `;
    fs.writeFileSync('README.md', readmeContent.trim());
    console.log("README.md has been updated successfully!");
  }
};

updateReadme();
