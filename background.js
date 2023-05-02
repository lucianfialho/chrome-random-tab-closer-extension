const MAX_OPENED_TABS = 10;

const TAB_CLOSE_INTERVAL_IN_MILLISECONDS = 300000; // 5 minutes

setInterval(function() {
  chrome.tabs.query({}, function(tabs) {
    if (tabs.length > MAX_OPENED_TABS) {
      var randomTab = tabs[Math.floor(Math.random() * tabs.length)];
      chrome.tabs.get(randomTab.id, function(tab) {
        const title = tab.title;
        console.log(`Closing tab: ${title}`);
        chrome.tabs.remove(randomTab.id);
      });
    }
  });
}, TAB_CLOSE_INTERVAL_IN_MILLISECONDS);
