document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const [summaryResult, linksResult, descResult, actionResult] = await Promise.all([
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => document.querySelector('h1#summary-val').innerText
            }),
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => Array.from(document.querySelectorAll('a.issue-link'), link => link.href)
            }),
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => document.querySelector('#description-val').innerText
            }),
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => Array.from(document.querySelectorAll('#issue_actions_container .action-body.flooded'), el => {
                    const user = el.previousElementSibling.querySelector('.user-hover.user-avatar').innerText;
                    return `${user}: ${el.innerText}`;
                })
            }),
        ]);

        const titleText = summaryResult[0].result;
        const issueLinks = linksResult[0].result;
        const descText = descResult[0].result;
        const commentText = actionResult[0].result.join('\n');

        console.log('Title:', titleText);
        console.log('Issue Links:', issueLinks);
        console.log('Description:', descText);
        console.log('Comments:', commentText);


        const combinedText = `${titleText} ${issueLinks.join('\n')}`;

        await navigator.clipboard.writeText(combinedText);
        console.log('Combined text copied to clipboard:', combinedText);
        document.body.innerHTML = '<p><h3>Link copied!</h3></p>'
        document.body.innerHTML += '<p><button id="summaryButton">Summary</button></p>';
        document.getElementById('summaryButton').addEventListener('click', async () => {
            try {
                document.body.innerHTML = '<p>Summarizing...</p>';
                const accessToken = await getAccessToken();
                console.log('Access Token:', accessToken);

                const descPrompt = "对下面的 jira issue 做一个一句话摘要:";
                const descMessages = [{ "role": "user", "content": descPrompt + descText }];

                const commentPrompt = "对评论区内容做一个一句话摘要:";
                const commentMessages = [{ "role": "user", "content": commentPrompt + commentText }];

                const [descSummaryResult, commentSummaryResult] = await Promise.all([
                    completion(accessToken, descMessages),
                    completion(accessToken, commentMessages)
                ]);

                descSummary = descSummaryResult.result;
                commentSummary = commentSummaryResult.result;

                console.log('Description Completion Result:', descSummary);
                console.log('Comment Completion Result:', commentSummary);

                document.body.innerHTML = '<p>[Summary]</p>';
                document.body.innerHTML += '<p class="content">' + descSummary + '</p>';
                document.body.innerHTML += '<p>[Progress]</p>';
                document.body.innerHTML += '<p class="content">' + commentSummary + '</p>';
                document.body.innerHTML += '</p><button id="summaryCopyButton">Copy Summary</button>';
                document.getElementById('summaryCopyButton').addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(combinedText + '\n[Summary]\n' + descSummary + '\n[Progress]\n' + commentSummary + '\n');
                        console.log('Summary text copied to clipboard');
                        document.body.innerHTML = '<p>Summary copied!</p>';
                    } catch (error) {
                        console.error('Error:', error);
                        console.error('Stack trace:', error.stack);
                        document.body.innerHTML = '<p>Error copying summary text</p>';
                        setTimeout(() => {
                            window.close();
                        }, 20000);
                    }
                });
                setTimeout(() => {
                    window.close();
                }, 200000);
            } catch (error) {
                console.error('Error:', error);
                console.error('Stack trace:', error.stack);
                document.body.innerHTML = '<p>Error summary</p>';
                setTimeout(() => {
                    window.close();
                }, 20000);
            }
        });
        setTimeout(() => {
            window.close();
        }, 200000);
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack trace:', error.stack);
        document.body.innerHTML = '<p>Error copying text</p>';
        setTimeout(() => {
            window.close();
        }, 20000);
    }
});



async function getAccessToken() {
    const response = await fetch('http://10.16.10.7:8080/getAccessToken', { method: 'POST' });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.access_token;
}

async function completion(accessToken, messages) {
    const response = await fetch('http://10.16.10.7:8080/completion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken, messages })
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
}
