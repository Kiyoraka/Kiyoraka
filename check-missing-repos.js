const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

async function checkMissingRepos() {
    if (!TOKEN) {
        console.log('❌ PERSONAL_GITHUB_TOKEN not set');
        return;
    }

    const headers = {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': USERNAME,
        'Accept': 'application/vnd.github.v3+json'
    };

    try {
        // Load pool data
        const pool = JSON.parse(fs.readFileSync('pool.json', 'utf8'));
        const processedRepos = new Set(pool.processedRepos);
        
        console.log(`📊 Pool has ${pool.totalRepos} total repos, ${processedRepos.size} processed`);
        
        // Get all repositories from GitHub
        const reposResponse = await axios.get(
            `https://api.github.com/user/repos?per_page=100&type=all`,
            { headers }
        );
        const allRepos = reposResponse.data;
        
        console.log(`🔍 Found ${allRepos.length} repositories on GitHub`);
        
        // Find missing repositories
        const missingRepos = [];
        for (const repo of allRepos) {
            if (!processedRepos.has(repo.full_name)) {
                missingRepos.push(repo);
            }
        }
        
        console.log(`\n❌ Missing Repositories (${missingRepos.length}):`);
        for (const repo of missingRepos) {
            console.log(`  - ${repo.full_name} (${repo.private ? 'Private' : 'Public'})`);
            
            // Check if it's a Laravel project
            try {
                const languagesResponse = await axios.get(`${repo.url}/languages`, { headers });
                const languages = languagesResponse.data;
                
                const hasLaravel = languages.Blade || languages.PHP;
                const isLaravelProject = repo.name.toLowerCase().includes('laravel') || 
                                       repo.description?.toLowerCase().includes('laravel') ||
                                       hasLaravel;
                
                if (isLaravelProject) {
                    console.log(`    🐘 LARAVEL PROJECT DETECTED!`);
                    console.log(`    📊 Languages: ${Object.keys(languages).join(', ')}`);
                    console.log(`    📝 PHP: ${languages.PHP || 0}, Blade: ${languages.Blade || 0}`);
                }
                
            } catch (error) {
                console.log(`    ❌ Error checking languages: ${error.message}`);
            }
        }
        
        // Check for Laravel projects in processed repos
        console.log(`\n🐘 Laravel Projects in Processed Repos:`);
        for (const repoName of processedRepos) {
            if (repoName.toLowerCase().includes('laravel')) {
                console.log(`  ✅ ${repoName}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkMissingRepos();
