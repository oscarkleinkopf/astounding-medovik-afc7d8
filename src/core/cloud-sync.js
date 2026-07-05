/**
 * @module cloud-sync
 * @description Provides 100% client-side cloud backup and synchronization
 * supporting GitHub Repositories/Gists and Google Drive API.
 */

const CONFIG_KEY = 'bookmarkOrganizer_cloudConfig';

/**
 * Loads saved cloud synchronization settings from localStorage.
 * @returns {Object} Config object
 */
export function loadCloudConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : { provider: 'github', githubToken: '', githubOwner: '', githubRepo: '', autoSync: false };
  } catch {
    return { provider: 'github', githubToken: '', githubOwner: '', githubRepo: '', autoSync: false };
  }
}

/**
 * Saves cloud synchronization settings to localStorage.
 * @param {Object} config - Config object
 */
export function saveCloudConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('[cloud-sync] Failed to save config:', err);
  }
}

/**
 * Helper to encode UTF-8 string to Base64 in browser safely.
 */
function utf8ToBase64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

/**
 * Helper to decode Base64 to UTF-8 string in browser safely.
 */
function base64ToUtf8(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str.replace(/\s/g, '')), (c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

/**
 * Pushes organized data as JSON backup to a GitHub repository.
 * 
 * @param {Object} organizedData - Organized categories and bookmarks
 * @param {string} token - GitHub Personal Access Token (PAT)
 * @param {string} owner - Repository owner (username/org)
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Response metadata
 */
export async function syncToGitHub(organizedData, token, owner, repo) {
  if (!token || !owner || !repo) {
    throw new Error('GitHub token, owner, and repository name are required.');
  }

  const path = 'bookmarkiq_backup.json';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const payloadData = {
    version: '3.0',
    timestamp: Date.now(),
    organizedData
  };

  const contentBase64 = utf8ToBase64(JSON.stringify(payloadData, null, 2));

  // Step 1: Check if file already exists to obtain its SHA
  let sha = null;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
  } catch (e) {
    console.warn('[cloud-sync] No existing file SHA found on GitHub:', e);
  }

  // Step 2: Push/Update file
  const body = {
    message: `BookmarkIQ Auto-Sync (${new Date().toLocaleString()})`,
    content: contentBase64,
    ...(sha ? { sha } : {})
  };

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const errorText = await putRes.text();
    throw new Error(`GitHub API push failed (${putRes.status}): ${errorText}`);
  }

  return await putRes.json();
}

/**
 * Pulls latest JSON backup from GitHub repository.
 * 
 * @param {string} token - GitHub Personal Access Token (PAT)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Parsed organized bookmark data
 */
export async function syncFromGitHub(token, owner, repo) {
  if (!token || !owner || !repo) {
    throw new Error('GitHub token, owner, and repository name are required.');
  }

  const path = 'bookmarkiq_backup.json';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const res = await fetch(apiUrl, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API pull failed (${res.status}). Verify credentials and repository.`);
  }

  const fileData = await res.json();
  const jsonText = base64ToUtf8(fileData.content);
  const parsed = JSON.parse(jsonText);

  return parsed.organizedData || parsed;
}
