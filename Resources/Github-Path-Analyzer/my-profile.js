const axios = require('axios');
const fs = require('fs');

const USERNAME = 'YOUR_GITHUB_USERNAME'; // Replace with your GitHub username
const TOKEN = process.env.PERSONAL_GITHUB_TOKEN;

// Language icons mapping
const LANGUAGE_ICONS = {
  // Web & Frontend Languages
  HTML: '🌐',           // .html, .htm
  CSS: '🎨',            // .css
  JavaScript: '📋',     // .js, .jsx
  TypeScript: '🔷',     // .ts, .tsx
  PHP: '🐘',            // .php
  WebAssembly: '⚡',    // .wasm
  
  // CSS Preprocessors & Variants
  SCSS: '💅',           // .scss
  Sass: '💅',           // .sass
  Less: '💄',           // .less
  Stylus: '🎨',         // .styl
  
  // Core Programming Languages
  Python: '🐍',         // .py
  Java: '☕',           // .java
  'C++': '➕',          // .cpp, .cc
  'C#': '🎯',           // .cs
  C: '©️',              // .c
  Ruby: '💎',           // .rb
  Swift: '🏃',          // .swift
  Kotlin: '🔰',         // .kt
  Go: '🐹',            // .go
  Rust: '🦀',          // .rs
  Hack: '⚡',           // .hack
  Perl: '🐪',           // .pl
  Lua: '🌙',           // .lua
  R: '📊',              // .r
  Julia: '🔯',          // .jl
  Scala: '⚡',          // .scala
  Dart: '🎯',          // .dart
  "Ren'Py": '🎭',       // .rpy
  
  // Data & Config Languages
  JSON: '📦',           // .json
  YAML: '⚙️',           // .yml, .yaml
  XML: '📄',            // .xml
  Markdown: '📝',       // .md
  SQL: '🗃️',           // .sql
};

const CAREER_PATHS = {
  'Frontend Developer': {
    languages: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'SCSS', 'Sass', 'Less'],
    description: 'Specializes in creating user interfaces and web applications',
    icon: '🎨'
  },
  'Backend Developer': {
    languages: ['Python', 'Java', 'PHP', 'Ruby', 'Go', 'C#', 'SQL', 'TypeScript'],
    description: 'Focuses on server-side logic and database management',
    icon: '⚙️'
  },
  'Full Stack Developer': {
    languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'HTML', 'CSS', 'SQL'],
    description: 'Capable of working on both frontend and backend development',
    icon: '🔄'
  },
  'Game Developer': {
    languages: ['C++', 'C#', 'Python', 'Lua', "Ren'Py", 'GDScript', 'UnrealScript', 'GLSL', 'HLSL'],
    description: 'Creates games and interactive entertainment software',
    icon: '🎮'
  },
  'Mobile Developer': {
    languages: ['Swift', 'Kotlin', 'Java', 'Dart', 'Objective-C'],
    description: 'Develops applications for mobile devices',
    icon: '📱'
  },
  'Data Scientist': {
    languages: ['Python', 'R', 'SQL', 'Julia', 'MATLAB'],
    description: 'Analyzes and interprets complex data',
    icon: '📊'
  },
  'DevOps Engineer': {
    languages: ['Shell', 'Python', 'YAML', 'Dockerfile', 'HCL', 'Bash', 'PowerShell'],
    description: 'Manages deployment, scaling, and operations',
    icon: '🔧'
  },
  'Systems Programmer': {
    languages: ['C', 'C++', 'Rust', 'Assembly', 'Go'],
    description: 'Works on low-level systems and performance-critical software',
    icon: '💻'
  }
};

// Configure axios
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

async function fetchAllCommits(repoUrl, author, headers) {
    let page = 1;
    let allCommits = [];
    const per_page = 100;

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

function calculateCareerPathScores(languageStats) {
    const scores = {};
    const totalBytes = Object.values(languageStats).reduce((a, b) => a + b, 0);

    for (const [path, info] of Object.entries(CAREER_PATHS)) {
        let pathScore = 0;
        let matchedLanguages = [];

        for (const language of info.languages) {
            if (languageStats[language]) {
                const percentage = (languageStats[language] / totalBytes) * 100;
                pathScore += percentage;
                matchedLanguages.push(language);
            }
        }

        scores[path] = {
            score: pathScore,
            matchedLanguages,
            icon: info.icon,
            description: info.description
        };
    }

    return scores;
}

function calculateProficiencyLevel(totalCommits, totalYears) {
    if (totalCommits < 100) return 'Beginner';
    if (totalCommits < 500) return 'Intermediate';
    if (totalCommits < 1000) return 'Advanced';
    if (totalCommits < 5000) return 'Expert';
    return 'Master';
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
        let totalSolvedIssues = 0;
        let reposWithSolvedIssues = new Set();
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

                // Get ALL commits
                const commits = await fetchAllCommits(repo.url, USERNAME, headers);
                const commitCount = commits.length;
                totalCommits += commitCount;

                // Fetch closed issues
                const closedIssuesResponse = await apiCallWithRetry(
                    `${repo.url}/issues?state=closed&creator=${USERNAME}`,
                    headers
                );

                const solvedIssues = closedIssuesResponse.data.length;
                if (solvedIssues > 0) {
                    totalSolvedIssues += solvedIssues;
                    reposWithSolvedIssues.add(repo.name);
                }

                // Calculate language stats
                const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
                for (const [language, bytes] of Object.entries(languages)) {
                    languageStats[language] = (languageStats[language] || 0) + Math.round(commitCount * (bytes / totalBytes));
                }
            } catch (error) {
                console.log(`Error processing repo ${repoName}:`, error.message);
            }
        }

        const careerPathScores = calculateCareerPathScores(languageStats);
        const proficiencyLevel = calculateProficiencyLevel(totalCommits, totalYears);

        // Sort career paths by score
        const sortedPaths = Object.entries(careerPathScores)
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, 3); // Get top 3 career paths

        return {
            proficiencyLevel,
            careerPaths: sortedPaths,
            languageStats,
            details: {
                totalYears,
                totalCommits,
                totalRepos,
                totalLanguages: Object.keys(languageStats).length,
                publicRepos: publicRepoCount,
                privateRepos: privateRepoCount,
                totalSolvedIssues
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

        const { proficiencyLevel, careerPaths, languageStats, details } = stats;

        // Create career paths section
        const careerPathsSection = careerPaths
            .map(([path, info]) => `
### ${info.icon} ${path}
- Match Score: ${info.score.toFixed(2)}%
- ${info.description}
- Key Languages: ${info.matchedLanguages.join(', ')}`)
            .join('\n');

        // Create language skills section
        const languageSkillsSection = Object.entries(languageStats)
            .sort(([, a], [, b]) => b - a)
            .map(([language, commits]) => {
                const icon = LANGUAGE_ICONS[language] || '📝';
                return `### ${icon} ${language}: ${commits} commits`;
            })
            .join('\n');

        const readmeContent = `
<div align="center">

# 💼 Developer Profile

<img src="./assets/profile.png" width="150" height="150" style="border-radius: 50%"/>

![](https://komarev.com/ghpvc/?username=${USERNAME}&style=flat)
</div>

## 👤 Basic Info
### Name: ${USERNAME}
### Level: ${proficiencyLevel}
### Active Years: ${details.totalYears}
### Total Contributions: ${details.totalCommits}

---
## 🎯 Career Path Analysis
${careerPathsSection}

---
## 💻 Programming Skills
${languageSkillsSection}

---
## 📊 GitHub Statistics
- Total Repositories: ${details.totalRepos} (Public: ${details.publicRepos}, Private: ${details.privateRepos})
- Languages Known: ${details.totalLanguages}
- Issues Solved: ${details.totalSolvedIssues}

---
<div align="center">
  Profile automatically updated via GitHub Actions
</div>`;

        fs.writeFileSync('README.md', readmeContent.trim());
        console.log('README.md updated successfully!');

    } catch (error) {
        console.error('Failed to update README:', error);
        process.exit(1);
    }
};

updateReadme();