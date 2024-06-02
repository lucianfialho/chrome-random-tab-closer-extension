let closedTabs = [];
let inactiveTabs = {};
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 1 minuto

function initializeTabs() {
  chrome.tabs.query({}, function (tabs) {
    const now = Date.now();
    for (let tab of tabs) {
      if (!tab.active) {
        inactiveTabs[tab.id] = { lastActive: now, url: tab.url };
        console.log("Inicializando aba inativa:", tab.id, tab.url);
      } else {
        console.log("Aba ativa no momento da inicialização:", tab.id, tab.url);
      }
    }
  });
}

function checkInactiveTabs() {
  const now = Date.now();
  console.log("Verificando abas inativas às", new Date());
  chrome.tabs.query(
    { active: true, currentWindow: true },
    function (activeTabs) {
      if (activeTabs.length === 0) {
        console.log("Nenhuma aba ativa encontrada.");
        return;
      }
      const activeTabId = activeTabs[0].id;
      for (const tabId in inactiveTabs) {
        if (
          inactiveTabs[tabId] &&
          now - inactiveTabs[tabId].lastActive > INACTIVITY_LIMIT &&
          parseInt(tabId) !== activeTabId
        ) {
          console.log(
            "Fechando aba por inatividade:",
            tabId,
            inactiveTabs[tabId].url
          );
          chrome.tabs.remove(parseInt(tabId), () => {
            closedTabs.push(inactiveTabs[tabId].url || "URL desconhecida"); // Adiciona o URL do tab fechado à lista
            delete inactiveTabs[tabId];
            console.log("Tab fechada por inatividade:", tabId);
          });
        }
      }
    }
  );
}

function updateTabActivity(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    inactiveTabs[tabId] = { lastActive: Date.now(), url: tab.url };
    console.log("Atividade atualizada para a aba:", tabId, tab.url);
  } else if (changeInfo.status === "loading") {
    delete inactiveTabs[tabId];
    console.log("Aba carregando, removida da lista de inatividade:", tabId);
  }
}

function handleTabActivated(activeInfo) {
  const tabId = activeInfo.tabId;
  chrome.tabs.get(tabId, (tab) => {
    if (tab.url) {
      inactiveTabs[tabId] = { lastActive: Date.now(), url: tab.url };
      console.log("Aba ativada:", tabId, tab.url);
    }
  });
}

chrome.tabs.onUpdated.addListener(updateTabActivity);
chrome.tabs.onRemoved.addListener((tabId) => {
  delete inactiveTabs[tabId];
  console.log("Aba removida:", tabId);
});
chrome.tabs.onActivated.addListener(handleTabActivated);

setInterval(checkInactiveTabs, 1 * 60 * 1000); // Verifica a cada 1 minuto

function createDailyAlarm() {
  const millisecondsUntilAlarm = 5 * 60 * 1000; // 5 minutos
  chrome.alarms.create("dailyNotification", {
    when: Date.now() + millisecondsUntilAlarm,
    periodInMinutes: 1440, // Repetir diariamente
  });
  console.log("Alarme criado para 5 minutos a partir de agora.");
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === "dailyNotification") {
    console.log("Alarme disparado:", new Date());
    createNotification();
  }
});

function createNotification() {
  console.log("Criando notificação...");
  console.log(chrome.runtime.getURL("icon.png"));
  chrome.notifications.create(
    "dailyNotification",
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon.png"), // Verifique se o caminho do ícone está correto e disponível
      title: "Links Fechados Hoje",
      message: "Clique para ver os links fechados hoje",
      priority: 2,
    },
    function (notificationId) {
      if (chrome.runtime.lastError) {
        console.error(
          "Erro ao criar notificação:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("Notificação criada com ID:", notificationId);
      }
    }
  );
}

chrome.notifications.onClicked.addListener(function (notificationId) {
  if (notificationId === "dailyNotification") {
    chrome.tabs.create({
      url: "data:text/plain," + encodeURIComponent(closedTabs.join("\n")),
    });
    closedTabs = []; // Limpa a lista após abrir a nova aba
    console.log("Notificação clicada, aba criada com links fechados.");
  }
});

// Inicializa o estado das abas e cria o alarme para daqui a 5 minutos
initializeTabs();
createDailyAlarm();
