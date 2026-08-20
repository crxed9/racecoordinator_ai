# 📥 Download Race Coordinator AI

Welcome to the **Race Coordinator AI** download and release portal. Download the latest installer for your operating system or explore the release archive below.

---

## 💻 Latest Release Downloads

Select the installer that matches your operating system:

| Operating System | Recommended Download | Package Type | System Requirements |
| :--- | :--- | :--- | :--- |
| **🪟 Windows (10 / 11)** | [**⬇️ Download Windows Online Setup**](https://github.com/daufderheide/racecoordinator_ai/releases/latest/download/RaceCoordinatorAI_Online_Setup.exe){ .md-button .md-button--primary } | Online Setup *(Fast, automatic component downloader)* | Windows 10 or 11 (64-bit or 32-bit), Internet connection during install |
| **🪟 Windows (8, 7, XP / Offline)** | [**⬇️ Download Offline Standalone**](https://github.com/daufderheide/racecoordinator_ai/releases/latest/download/RaceCoordinatorAI_Offline_Setup.exe){ .md-button } | Full Offline Installer *(Bundled runtime)* | Windows XP SP3, 7, 8, 10, or 11; No internet required |
| **🍏 macOS** | [**⬇️ Download macOS DMG**](https://github.com/daufderheide/racecoordinator_ai/releases/latest/download/RaceCoordinator_Mac.dmg){ .md-button } | Universal Disk Image (`.dmg`) | macOS 10.15 (Catalina) through macOS 15+ (Intel & Apple Silicon) |
| **🐧 Linux / Raspberry Pi** | [**⬇️ Download Linux ARM64**](https://github.com/daufderheide/racecoordinator_ai/releases/latest/download/RaceCoordinatorAI-Linux-ARM64.tar.gz){ .md-button } | Compressed Archive (`.tar.gz`) | Raspberry Pi OS 64-bit, Debian, Ubuntu ARM64 |

> 💡 **Need help getting started?** Check out the [Installation & Setup Guide](installation.md) for step-by-step instructions and first-time configuration.

---

## 📦 Release Archive & Channels

Race Coordinator AI uses three release channels:

* 🟢 **Official Stable Releases**: Fully validated, production-ready builds recommended for all general and club race operations.
* 🟡 **Beta Previews**: Feature-rich preview builds released during active development cycles for community testing and feedback. *(Note: Beta releases for a version are retired once that version's official release is published).*
* 🔵 **Alpha / Nightly Builds**: Automated snapshot builds containing the latest code from the development branch.

---

<div id="release-loading" style="padding: 1.5em; text-align: center; color: var(--md-default-fg-color--light);">
  ⏳ <em>Loading available releases from GitHub...</em>
</div>

<div id="release-container" style="display: none;">

=== "🟢 Official Releases"
    <div id="official-releases-list">
      <p><em>Loading official releases...</em></p>
    </div>

=== "🟡 Beta Previews"
    <div id="beta-releases-list">
      <p><em>Loading beta releases...</em></p>
    </div>

=== "🔵 Alpha / Nightly Builds"
    <div id="alpha-releases-list">
      <p><em>Loading alpha releases...</em></p>
    </div>

</div>

<noscript>
<div class="admonition note">
<p class="admonition-title">JavaScript Required for Live Archive</p>
<p>JavaScript is disabled in your browser. You can view all releases and download files directly on the <a href="https://github.com/daufderheide/racecoordinator_ai/releases">GitHub Releases Page</a>.</p>
</div>
</noscript>

<script>
(function() {
  const apiUrl = 'https://api.github.com/repos/daufderheide/racecoordinator_ai/releases?per_page=100';

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return isoStr.substring(0, 10);
    }
  }

  function renderReleaseCard(rel) {
    const isPre = rel.prerelease;
    const tag = rel.tag_name || '';
    const name = rel.name || tag;
    const dateStr = formatDate(rel.published_at || rel.created_at);
    
    let winOnlineAsset = null;
    let winOfflineAsset = null;
    let macAsset = null;
    let linuxAsset = null;

    if (rel.assets && rel.assets.length > 0) {
      for (const asset of rel.assets) {
        const aname = asset.name.toLowerCase();
        if (aname.includes('online') && aname.endsWith('.exe')) winOnlineAsset = asset;
        else if (aname.includes('offline') && aname.endsWith('.exe')) winOfflineAsset = asset;
        else if (aname.endsWith('.dmg')) macAsset = asset;
        else if (aname.includes('linux') && aname.endsWith('.tar.gz')) linuxAsset = asset;
      }
    }

    let downloadButtons = '';
    if (winOnlineAsset) {
      downloadButtons += `<a href="${winOnlineAsset.browser_download_url}" class="md-button md-button--primary" style="margin: 0.25em 0.25em 0.25em 0; font-size: 0.85em;">🪟 Windows Setup (${formatBytes(winOnlineAsset.size)})</a> `;
    }
    if (winOfflineAsset) {
      downloadButtons += `<a href="${winOfflineAsset.browser_download_url}" class="md-button" style="margin: 0.25em 0.25em 0.25em 0; font-size: 0.85em;">🪟 Offline Setup (${formatBytes(winOfflineAsset.size)})</a> `;
    }
    if (macAsset) {
      downloadButtons += `<a href="${macAsset.browser_download_url}" class="md-button" style="margin: 0.25em 0.25em 0.25em 0; font-size: 0.85em;">🍏 macOS DMG (${formatBytes(macAsset.size)})</a> `;
    }
    if (linuxAsset) {
      downloadButtons += `<a href="${linuxAsset.browser_download_url}" class="md-button" style="margin: 0.25em 0.25em 0.25em 0; font-size: 0.85em;">🐧 Linux ARM64 (${formatBytes(linuxAsset.size)})</a> `;
    }

    if (!downloadButtons) {
      downloadButtons = `<a href="${rel.html_url}" class="md-button" style="font-size: 0.85em;">View Assets on GitHub</a>`;
    }

    return `
      <div style="border: 1px solid var(--md-default-fg-color--lightest); border-radius: 8px; padding: 1.2em; margin-bottom: 1.2em; background-color: var(--md-code-bg-color);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; margin-bottom: 0.5em;">
          <h3 style="margin: 0; font-size: 1.2em;"><strong>${name}</strong> <code style="font-size: 0.85em;">${tag}</code></h3>
          <span style="color: var(--md-default-fg-color--light); font-size: 0.9em;">📅 ${dateStr}</span>
        </div>
        <div style="margin: 0.8em 0;">
          ${downloadButtons}
        </div>
        ${rel.body ? `
          <details style="margin-top: 0.8em; font-size: 0.9em;">
            <summary style="cursor: pointer; color: var(--md-typeset-a-color);"><strong>View Release Details</strong></summary>
            <div style="padding: 0.5em 0 0 0.5em; opacity: 0.9; white-space: pre-wrap; font-family: inherit;">${rel.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </details>
        ` : ''}
      </div>
    `;
  }

  fetch(apiUrl)
    .then(res => {
      if (!res.ok) throw new Error('Status ' + res.status);
      return res.json();
    })
    .then(releases => {
      const loadingEl = document.getElementById('release-loading');
      const containerEl = document.getElementById('release-container');
      const officialList = document.getElementById('official-releases-list');
      const betaList = document.getElementById('beta-releases-list');
      const alphaList = document.getElementById('alpha-releases-list');

      if (!Array.isArray(releases) || releases.length === 0) {
        if (loadingEl) loadingEl.innerHTML = '<p>No releases found.</p>';
        return;
      }

      const officials = [];
      const betas = [];
      const alphas = [];

      for (const rel of releases) {
        const tag = (rel.tag_name || '').toLowerCase();
        if (tag.includes('alpha')) {
          alphas.push(rel);
        } else if (tag.includes('beta') || rel.prerelease) {
          betas.push(rel);
        } else {
          officials.push(rel);
        }
      }

      if (officialList) {
        officialList.innerHTML = officials.length > 0
          ? officials.map(renderReleaseCard).join('')
          : '<p style="color: var(--md-default-fg-color--light);"><em>No official stable releases published yet.</em></p>';
      }

      if (betaList) {
        betaList.innerHTML = betas.length > 0
          ? betas.map(renderReleaseCard).join('')
          : '<p style="color: var(--md-default-fg-color--light);"><em>No active beta preview releases at this time.</em></p>';
      }

      if (alphaList) {
        alphaList.innerHTML = alphas.length > 0
          ? alphas.map(renderReleaseCard).join('')
          : '<p style="color: var(--md-default-fg-color--light);"><em>No nightly/alpha builds found.</em></p>';
      }

      if (loadingEl) loadingEl.style.display = 'none';
      if (containerEl) containerEl.style.display = 'block';
    })
    .catch(err => {
      console.warn('Failed to load GitHub releases dynamically:', err);
      const loadingEl = document.getElementById('release-loading');
      const containerEl = document.getElementById('release-container');
      if (loadingEl) {
        loadingEl.innerHTML = `
          <div class="admonition note">
            <p class="admonition-title">Release Archive</p>
            <p>Direct download links are available in the table above. You can also browse the full archive on the <a href="https://github.com/daufderheide/racecoordinator_ai/releases" target="_blank" rel="noopener">GitHub Releases Page</a>.</p>
          </div>
        `;
      }
    });
})();
</script>
