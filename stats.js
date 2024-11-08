const axios = require('axios');
const fs = require('fs');

const USERNAME = 'YOUR_GITHUB_USERNAME';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

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

    // Fetch data for each repository
    for (const repo of repos.data) {
      const repoStats = await axios.get(repo.url, { headers });
      const commitsData = await axios.get(`${repo.url}/commits`, { headers });
      const issuesData = await axios.get(`${repo.url}/issues`, { headers });
      
      totalCommits += commitsData.data.length;
      totalIssues += issuesData.data.length;
    }

    // Calculations
    const level = Math.floor(totalCommits / totalRepos);
    const attackPower = totalCommits;
    const defensePower = totalCommits - totalIssues;
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
### ⭐ Level : ${level}
---
## 📊 Detailed Battle Stats

### ⚔️ Attack Power : ${attackPower}
### 🛡️ Defense Power : ${defensePower}
### ❤️ Health Point : ${healthPoints}
---
    `;
    fs.writeFileSync('README.md', readmeContent);
    console.log("README.md has been updated successfully!");
  }
};

updateReadme();
