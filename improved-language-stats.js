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

// Analyze commits to count languages
async function analyzeCommitsByLanguage(repoUrl, headers) {
    const languageCommits = {};
    let page = 1;
    const maxPages = 10; // Limit to avoid rate limits
    
    while (page <= maxPages) {
        try {
            const commitsResponse = await axios.get(
                `${repoUrl}/commits?author=${USERNAME}&per_page=100&page=${page}`,
                { headers }
            );
            
            const commits = commitsResponse.data;
            if (commits.length === 0) break;
            
            for (const commit of commits) {
                // Get commit details to see changed files
                const commitDetailResponse = await axios.get(
                    commit.url,
                    { headers }
                );
                
                const commitDetail = commitDetailResponse.data;
                
                // Count files by language
                if (commitDetail.files) {
                    for (const file of commitDetail.files) {
                        const language = getLanguageFromFile(file.filename);
                        if (language) {
                            languageCommits[language] = (languageCommits[language] || 0) + 1;
                        }
                    }
                }
            }
            
            if (commits.length < 100) break;
            page++;
            
            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.log(`Error fetching commits page ${page}:`, error.message);
            break;
        }
    }
    
    return languageCommits;
}

// Test the improved system
async function testImprovedLanguageStats() {
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
        // Test with a Laravel repository
        const testRepo = 'Kiyoraka/Project-Laravel-Jaulah-Kembara-TMS';
        console.log(`🔍 Testing improved language stats for: ${testRepo}`);
        
        const languageStats = await analyzeCommitsByLanguage(
            `https://api.github.com/repos/${testRepo}`,
            headers
        );
        
        console.log('\n📊 Improved Language Stats (by actual commits):');
        const sortedStats = Object.entries(languageStats)
            .sort(([,a], [,b]) => b - a);
            
        for (const [language, commits] of sortedStats) {
            console.log(`  ${language}: ${commits} commits`);
        }
        
        // Compare with current method
        console.log('\n🔄 Comparing with current method...');
        const currentResponse = await axios.get(
            `https://api.github.com/repos/${testRepo}/languages`,
            { headers }
        );
        
        const totalBytes = Object.values(currentResponse.data).reduce((a, b) => a + b, 0);
        console.log('\n📊 Current Method (by file size):');
        for (const [language, bytes] of Object.entries(currentResponse.data)) {
            const percentage = (bytes / totalBytes * 100).toFixed(1);
            console.log(`  ${language}: ${bytes} bytes (${percentage}%)`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testImprovedLanguageStats();
