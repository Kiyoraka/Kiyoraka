const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN; // Changed to match workflow environment variable

const fetchGitHubStats = async () => {
  try {
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'User-Agent': 'Kiyoraka',
      'Accept': 'application/vnd.github.v3+json', // Added explicit API version
    };

    // Check rate limit before starting
    await checkRateLimit(headers);

    // Fetch user data
    const userData = await axios.get(`https://api.github.com/user`, { headers });
    console.log(`Fetching data for user: ${userData.data.login}`);

    // Fetch ALL repositories (both public and private)
    let allRepos = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const reposResponse = await axios.get(
        `https://api.github.com/user/repos?per_page=100&page=${page}&type=all`,
        { headers }
      );
      
      if (reposResponse.data.length === 0) {
        hasNextPage = false;
      } else {
        allRepos = [...allRepos, ...reposResponse.data];
        page++;
      }
    }

    console.log(`Total repositories found: ${allRepos.length}`);

    let totalCommits = 0;
    let totalIssues = 0;
    let completedRepos = 0;
    const startYear = new Date(userData.data.created_at).getFullYear();
    const currentYear = new Date().getFullYear();
    const totalYears = Math.max(1, currentYear - accountCreationYear);

    // Fetch data for each repository (with rate limit consideration)
    for (const repo of repos.data) {
      if (!repo.fork) { // Skip forked repositories
        const repoName = repo.full_name;
        
        try {
          // Fetch contributor stats
          const commitsData = await axios.get(`https://api.github.com/repos/${repoName}/stats/contributors`, { headers });
          const userStats = commitsData.data.find(contrib => contrib.author?.login === USERNAME);
          if (userStats) {
            totalCommits += userStats.total;
          }

          // Fetch issues count
          const issuesData = await axios.get(`https://api.github.com/repos/${repoName}/issues?state=all&creator=${USERNAME}`, {
            headers,
            params: { per_page: 1 }
          });
          
          // Get total from Link header if available
          const linkHeader = issuesData.headers.link;
          if (linkHeader) {
            const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
            if (match) {
              totalIssues += parseInt(match[1]);
            }
          }
        } catch (error) {
          console.warn(`Error fetching data for ${repoName}:`, error.message);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Enhanced calculations
    const level = Math.floor(totalCommits/ totalRepos) 
    const attackPower = totalCommits;
    const defensePower = totalCommits - totalIssues;
    const healthPoints = totalCommits * totalRepos;

    return { level, attackPower, defensePower, healthPoints };
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    throw error; // Propagate error to fail the workflow
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
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1); // Exit with error to fail the workflow
  }
};

updateReadme();
