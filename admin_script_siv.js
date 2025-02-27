let trafficInfosMouvae = JSON.parse(localStorage.getItem('trafficInfosMouvae')) || [];
let announcementsMouvae = JSON.parse(localStorage.getItem('announcementsMouvae')) || [];

function showTab(tabId) {
    const trafficTab = document.getElementById('traffic-tab');
    const announcementTab = document.getElementById('announcement-tab');

    if (tabId === 'traffic') {
        trafficTab.style.display = 'block';
        announcementTab.style.display = 'none';
    } else {
        trafficTab.style.display = 'none';
        announcementTab.style.display = 'block';
    }
}

function addTrafficInfo() {
    const line = document.getElementById('traffic-line-input').value.trim();
    const date = document.getElementById('traffic-date-input').value.trim();
    const detail = document.getElementById('traffic-detail-input').value.trim();

    if (line && date && detail) {
        trafficInfosMouvae.push({ line, date, detail });
        localStorage.setItem('trafficInfosMouvae', JSON.stringify(trafficInfosMouvae));
        document.getElementById('traffic-line-input').value = '';
        document.getElementById('traffic-date-input').value = '';
        document.getElementById('traffic-detail-input').value = '';
        updateTrafficInfoList();
    }
}

function addAnnouncement() {
    const input = document.getElementById('announcement-input');
    const value = input.value.trim();
    if (value) {
        announcementsMouvae.push(value);
        localStorage.setItem('announcementsMouvae', JSON.stringify(announcementsMouvae));
        input.value = '';
        updateAnnouncementList();
    }
}

function updateTrafficInfoList() {
    const list = document.getElementById('traffic-info-list');
    list.innerHTML = '';
    trafficInfosMouvae.forEach((info, index) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p><strong>Ligne(s):</strong> ${info.line}</p>
            <p><strong>Dates:</strong> ${info.date}</p>
            <p><strong>Détail:</strong> ${info.detail}</p>
            <button onclick="editTrafficInfo(${index})">Modifier</button>
            <button onclick="deleteTrafficInfo(${index})">Supprimer</button>
        `;
        list.appendChild(item);
    });
}

function updateAnnouncementList() {
    const list = document.getElementById('announcement-list');
    list.innerHTML = '';
    announcementsMouvae.forEach((announcement, index) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p>${announcement}</p>
            <button onclick="editAnnouncement(${index})">Modifier</button>
            <button onclick="deleteAnnouncement(${index})">Supprimer</button>
        `;
        list.appendChild(item);
    });
}

function editTrafficInfo(index) {
    const info = trafficInfosMouvae[index];
    document.getElementById('traffic-line-input').value = info.line;
    document.getElementById('traffic-date-input').value = info.date;
    document.getElementById('traffic-detail-input').value = info.detail;
    trafficInfosMouvae.splice(index, 1);
    localStorage.setItem('trafficInfosMouvae', JSON.stringify(trafficInfosMouvae));
    updateTrafficInfoList();
}

function editAnnouncement(index) {
    const input = document.getElementById('announcement-input');
    input.value = announcementsMouvae[index];
    announcementsMouvae.splice(index, 1);
    localStorage.setItem('announcementsMouvae', JSON.stringify(announcementsMouvae));
    updateAnnouncementList();
}

function deleteTrafficInfo(index) {
    trafficInfosMouvae.splice(index, 1);
    localStorage.setItem('trafficInfosMouvae', JSON.stringify(trafficInfosMouvae));
    updateTrafficInfoList();
}

function deleteAnnouncement(index) {
    announcementsMouvae.splice(index, 1);
    localStorage.setItem('announcementsMouvae', JSON.stringify(announcementsMouvae));
    updateAnnouncementList();
}

// Initialisation
updateTrafficInfoList();
updateAnnouncementList();
