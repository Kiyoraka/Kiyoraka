const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.GITHUB_TOKEN; // Changed to match workflow environment variable

const fetchGitHubStats = async () => {
  try {
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'User-Agent': 'Kiyoraka',
      'Accept': 'application/vnd.github.v3+json', // Added explicit API version
    };

    // Fetch user data
    const userData = await axios.get(`https://api.github.com/users/${USERNAME}`, { headers });
    const repos = await axios.get(userData.data.repos_url, { headers });

    let totalCommits = 0;
    let totalIssues = 0;
    const totalRepos = repos.data.length;
    const accountCreationYear = new Date(userData.data.created_at).getFullYear();
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
    const level = Math.max(1, Math.floor(Math.sqrt(totalCommits / 10)));
    const attackPower = Math.floor(totalCommits * 0.8);
    const defensePower = Math.floor((totalCommits - totalIssues) * 0.7);
    const healthPoints = Math.floor(totalCommits * totalRepos * 0.5);

    return { level, attackPower, defensePower, healthPoints };
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    throw error; // Propagate error to fail the workflow
  }
};

const updateReadme = async () => {
  try {
    const stats = await fetchGitHubStats();
    
    if (!stats) {
      throw new Error('Failed to fetch GitHub stats');
    }

    const { level, attackPower, defensePower, healthPoints } = stats;

    // Read existing README to preserve any custom content
    let readmeContent = fs.readFileSync('README.md', 'utf8');

    // Update stats while preserving the structure
    readmeContent = readmeContent.replace(/### ⭐ Level : \d+/, `### ⭐ Level : ${level}`);
    readmeContent = readmeContent.replace(/### ⚔️ Attack Power : \d+/, `### ⚔️ Attack Power : ${attackPower}`);
    readmeContent = readmeContent.replace(/### 🛡️ Defense Power : \d+/, `### 🛡️ Defense Power : ${defensePower}`);
    readmeContent = readmeContent.replace(/### ❤️ Health Point : \d+/, `### ❤️ Health Point : ${healthPoints}`);

    fs.writeFileSync('README.md', readmeContent);
    console.log("README.md has been updated successfully!");
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1); // Exit with error to fail the workflow
  }
};

updateReadme();