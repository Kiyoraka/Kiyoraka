const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.GITHUB_TOKEN;

// Function to check rate limits
const checkRateLimit = async (headers) => {
  try {
    const response = await axios.get('https://api.github.com/rate_limit', { headers });
    const { remaining, reset } = response.data.rate.core;
    console.log(`Rate limit remaining: ${remaining}`);
    if (remaining < 100) {
      const resetTime = new Date(reset * 1000);
      console.log(`Rate limit too low. Resets at ${resetTime}`);
      process.exit(0);
    }
  } catch (error) {
    console.warn('Rate limit check error:', error.message);
  }
};

const fetchGitHubStats = async () => {
  try {
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
      'User-Agent': 'Kiyoraka',
      'Accept': 'application/vnd.github.v3+json',
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

    // Fetch detailed stats for each repository
    for (const repo of allRepos) {
      try {
        // Get commit statistics
        const commitsResponse = await axios.get(
          `https://api.github.com/repos/${repo.full_name}/commits?author=${USERNAME}&per_page=1`,
          { headers }
        );

        // Extract total commits from Link header
        const linkHeader = commitsResponse.headers.link;
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (match) {
            totalCommits += parseInt(match[1]);
          } else {
            totalCommits += commitsResponse.data.length; // Add single page of commits
          }
        } else {
          totalCommits += commitsResponse.data.length;
        }

        // Get issues and pull requests
        const issuesResponse = await axios.get(
          `https://api.github.com/repos/${repo.full_name}/issues?creator=${USERNAME}&state=all&per_page=1`,
          { headers }
        );

        // Extract total issues from Link header
        const issueLinkHeader = issuesResponse.headers.link;
        if (issueLinkHeader) {
          const match = issueLinkHeader.match(/page=(\d+)>; rel="last"/);
          if (match) {
            totalIssues += parseInt(match[1]);
          } else {
            totalIssues += issuesResponse.data.length;
          }
        } else {
          totalIssues += issuesResponse.data.length;
        }

        completedRepos++;
        console.log(`Processed ${completedRepos}/${allRepos.length} repositories`);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`Error processing repo ${repo.full_name}:`, error.message);
      }
    }

    // Calculate stats based on activity
    const yearsActive = Math.max(1, currentYear - startYear);
    const activeRepos = allRepos.filter(repo => !repo.archived && !repo.disabled).length;
    
    // Enhanced calculations
    const level = Math.max(1, Math.floor(Math.sqrt(totalCommits / 10))); // More balanced level progression
    const attackPower = totalCommits; // Raw commit power
    const defensePower = Math.max(0, totalCommits - totalIssues); // Defense reduced by issues
    const healthPoints = totalCommits * activeRepos; // HP scales with both commits and active repos

    // Log final stats for verification
    console.log('\nFinal Stats:');
    console.log(`Total Commits: ${totalCommits}`);
    console.log(`Total Issues: ${totalIssues}`);
    console.log(`Active Repos: ${activeRepos}`);
    console.log(`Years Active: ${yearsActive}`);
    console.log(`Level: ${level}`);
    console.log(`Attack Power: ${attackPower}`);
    console.log(`Defense Power: ${defensePower}`);
    console.log(`Health Points: ${healthPoints}`);

    return { level, attackPower, defensePower, healthPoints };
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    throw error;
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
    console.log("\nREADME.md has been updated successfully!");
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
};

updateReadme();
