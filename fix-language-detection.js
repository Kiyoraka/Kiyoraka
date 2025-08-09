const axios = require('axios');
const fs = require('fs');

const USERNAME = 'Kiyoraka';
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

// Language file extensions mapping
const LANGUAGE_EXTENSIONS = {
    'JavaScript': ['.js', '.jsx', '.mjs', '.cjs'],
    'TypeScript': ['.ts', '.tsx'],
    'PHP': ['.php'],
    'Blade': ['.blade.php'],
    'CSS': ['.css'],
    'SCSS': ['.scss', '.sass'],
    'HTML': ['.html', '.htm'],
    'Vue': ['.vue'],
    'Dart': ['.dart'],
    'Python': ['.py'],
    'Java': ['.java'],
    'C++': ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    'C': ['.c', '.h'],
    'C#': ['.cs'],
    'Ruby': ['.rb'],
    'Go': ['.go'],
    'Rust': ['.rs'],
    'Swift': ['.swift'],
    'Kotlin': ['.kt', '.kts'],
    'Objective-C': ['.m', '.mm', '.h'],
    'Batchfile': ['.bat', '.cmd'],
    'Shell': ['.sh', '.bash', '.zsh'],
    'VBA': ['.vba', '.bas'],
    'CMake': ['.cmake', 'CMakeLists.txt'],
    'Hack': ['.hack', '.hh', '.hck'],
    'Ren\'Py': ['.rpy'],
    'ShaderLab': ['.shader'],
    'HLSL': ['.hlsl', '.fx']
};

// Get language from file path
function getLanguageFromFile(filePath) {
    const fileName = filePath.toLowerCase();
    
    // Check for specific patterns first
    if (fileName.includes('.blade.php')) return 'Blade';
    if (fileName.includes('cmakelists.txt')) return 'CMake';
    
    // Check file extensions
    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
        for (const ext of extensions) {
            if (fileName.endsWith(ext)) {
                return language;
            }
        }
    }
    
    return null;
}

async function apiCallWithRetry(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, { headers, proxy: false });
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`Retry ${i + 1}/${retries} for ${url}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// IMPROVED: Analyze actual commits to count languages properly
async function getLanguageStatsFromCommits(repoUrl, headers, commitCount) {
    console.log(`🔍 Analyzing commits for accurate language detection...`);
    
    const languageCommits = {};
    let page = 1;
    let totalAnalyzed = 0;
    const maxAnalyze = Math.min(commitCount, 100); // Analyze up to 100 commits
    
    while (page <= 5 && totalAnalyzed < maxAnalyze) {
        try {
            const commitsResponse = await apiCallWithRetry(
                `${repoUrl}/commits?author=${USERNAME}&per_page=100&page=${page}`,
                headers
            );
            
            const commits = commitsResponse.data;
            if (commits.length === 0) break;
            
            for (const commit of commits) {
                if (totalAnalyzed >= maxAnalyze) break;
                
                try {
                    // Get commit details to see changed files
                    const commitDetailResponse = await apiCallWithRetry(
                        commit.url,
                        headers
                    );
                    
                    const commitDetail = commitDetailResponse.data;
                    
                    // Count unique languages touched in this commit
                    const commitLanguages = new Set();
                    if (commitDetail.files) {
                        for (const file of commitDetail.files) {
                            const language = getLanguageFromFile(file.filename);
                            if (language) {
                                commitLanguages.add(language);
                            }
                        }
                    }
                    
                    // Each commit counts as 1 for each language it touched
                    for (const language of commitLanguages) {
                        languageCommits[language] = (languageCommits[language] || 0) + 1;
                    }
                    
                    totalAnalyzed++;
                    
                    // Rate limit protection
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.log(`Error analyzing commit: ${error.message}`);
                    continue;
                }
            }
            
            if (commits.length < 100) break;
            page++;
            
        } catch (error) {
            console.log(`Error fetching commits page ${page}:`, error.message);
            break;
        }
    }
    
    console.log(`📊 Analyzed ${totalAnalyzed} commits for language detection`);
    return languageCommits;
}

// Create a new pool.json with improved language detection
async function createImprovedPool() {
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
        console.log('🚀 Creating improved pool with commit-based language detection...');
        
        // Load current pool to get some base data
        const currentPool = JSON.parse(fs.readFileSync('pool.json', 'utf8'));
        console.log(`📊 Current pool has ${currentPool.totalCommits} commits`);
        
        // Create new pool structure
        const improvedPool = {
            initialized: true,
            lastUpdateDate: currentPool.lastUpdateDate,
            totalCommits: 0,
            totalSolvedIssues: 0,
            totalSpeedPoints: 0,
            languageStats: {},
            totalRepos: 0,
            accountCreationYear: currentPool.accountCreationYear,
            originalReposCount: 0,
            totalStars: 0,
            totalForks: 0,
            creatorBonusAccuracy: 0,
            creatorBonusSpeed: 0,
            processedRepos: []
        };
        
        // Get all repositories
        const reposResponse = await apiCallWithRetry(`https://api.github.com/user/repos?per_page=100&type=all`, headers);
        const repos = reposResponse.data;
        
        console.log(`📁 Re-processing ${repos.length} repositories with improved language detection...`);
        
        // Process each repository with improved language detection
        for (const repo of repos) {
            console.log(`\nProcessing: ${repo.name}`);
            
            try {
                // Get total commits for this repo
                let allCommits = [];
                let page = 1;
                
                while (page <= 20) { // Limit pages
                    const commitsResponse = await apiCallWithRetry(
                        `${repo.url}/commits?author=${USERNAME}&per_page=100&page=${page}`,
                        headers
                    );
                    
                    const commits = commitsResponse.data;
                    if (commits.length === 0) break;
                    
                    allCommits = allCommits.concat(commits);
                    if (commits.length < 100) break;
                    page++;
                }
                
                const commitCount = allCommits.length;
                console.log(`📝 Found ${commitCount} commits`);
                
                if (commitCount > 0) {
                    // IMPROVED: Get language stats based on actual commits
                    const repoLanguageStats = await getLanguageStatsFromCommits(repo.url, headers, commitCount);
                    
                    console.log(`🎯 Language distribution:`, repoLanguageStats);
                    
                    // Add to totals
                    improvedPool.totalCommits += commitCount;
                    
                    // Merge language stats
                    for (const [language, commits] of Object.entries(repoLanguageStats)) {
                        improvedPool.languageStats[language] = (improvedPool.languageStats[language] || 0) + commits;
                    }
                }
                
                // Get other stats (same as before)
                const closedIssuesResponse = await apiCallWithRetry(
                    `${repo.url}/issues?state=closed&creator=${USERNAME}`,
                    headers
                );
                const solvedIssues = closedIssuesResponse.data.length;
                improvedPool.totalSolvedIssues += solvedIssues;
                
                // Add to processed repos
                improvedPool.processedRepos.push(repo.full_name);
                
                if (!repo.fork) {
                    improvedPool.originalReposCount++;
                    improvedPool.totalStars += repo.stargazers_count || 0;
                    improvedPool.totalForks += repo.forks_count || 0;
                }
                
            } catch (error) {
                console.log(`❌ Error processing ${repo.name}:`, error.message);
            }
        }
        
        improvedPool.totalRepos = repos.length;
        
        // Copy other stats from current pool
        improvedPool.totalSpeedPoints = currentPool.totalSpeedPoints;
        improvedPool.creatorBonusAccuracy = currentPool.creatorBonusAccuracy;
        improvedPool.creatorBonusSpeed = currentPool.creatorBonusSpeed;
        
        // Save improved pool
        fs.writeFileSync('pool-improved.json', JSON.stringify(improvedPool, null, 2));
        
        console.log('\n✅ Improved pool created successfully!');
        console.log(`📊 Total commits: ${improvedPool.totalCommits}`);
        console.log(`🎯 Top languages (by actual commits):`);
        
        const sortedLanguages = Object.entries(improvedPool.languageStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
            
        for (const [language, commits] of sortedLanguages) {
            console.log(`  ${language}: ${commits} commits`);
        }
        
        // Compare with current system
        console.log('\n📊 Comparison with current system:');
        console.log('Current (file-size based):');
        const currentSorted = Object.entries(currentPool.languageStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        for (const [language, commits] of currentSorted) {
            console.log(`  ${language}: ${commits}`);
        }
        
        console.log('\nImproved (commit-based):');
        for (const [language, commits] of sortedLanguages.slice(0, 5)) {
            console.log(`  ${language}: ${commits} commits`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createImprovedPool();
