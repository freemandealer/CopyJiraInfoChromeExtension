document.getElementById('copyButton').addEventListener('click', async () => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [summaryResult, linksResult] = await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => document.querySelector('h1#summary-val').innerText
      }),
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => Array.from(document.querySelectorAll('a.issue-link'), link => link.href)
      })
    ]);

    const summaryText = summaryResult[0].result;
    const issueLinks = linksResult[0].result;

    const combinedText = `${summaryText} ${issueLinks.join('\n')}`;

    await navigator.clipboard.writeText(combinedText);
    console.log('Combined text copied to clipboard:', combinedText);
  } catch (error) {
    console.error('Error copying combined text to clipboard:', error);
  }
});
