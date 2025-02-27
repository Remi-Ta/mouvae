let trafficInfosMouvae = JSON.parse(localStorage.getItem('trafficInfosMouvae')) || [];
let announcementsMouvae = JSON.parse(localStorage.getItem('announcementsMouvae')) || [];
let suspensionsMouvae = JSON.parse(localStorage.getItem('suspensionsMouvae')) || [];

function showTab(tabId) {
    const trafficTab = document.getElementById('traffic-tab');
    const announcementTab = document.getElementById('announcement-tab');
    const suspensionTab = document.getElementById('suspension-tab');

    if (tabId === 'traffic') {
        trafficTab.style.display = 'block';
        announcementTab.style.display = 'none';
        suspensionTab.style.display = 'none';
    } else if (tabId === 'announcement') {
        trafficTab.style.display = 'none';
        announcementTab.style.display = 'block';
        suspensionTab.style.display = 'none';
    } else {
        trafficTab.style.display = 'none';
        announcementTab.style.display = 'none';
        suspensionTab.style.display = 'block';
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

function addSuspension() {
    const period = document.getElementById('suspension-period-input').value;
    const stops = Array.from(document.getElementById('suspension-stop-input').selectedOptions).map(option => option.value);
    const message = document.getElementById('suspension-message-input').value.trim();

    if (period && stops.length > 0 && message) {
        suspensionsMouvae.push({ period, stops, message });
        localStorage.setItem('suspensionsMouvae', JSON.stringify(suspensionsMouvae));
        document.getElementById('suspension-message-input').value = '';
        updateSuspensionList();
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
            <button class="edit" onclick="editTrafficInfo(${index})">Modifier</button>
            <button class="delete" onclick="deleteTrafficInfo(${index})">Supprimer</button>
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
            <button class="edit" onclick="editAnnouncement(${index})">Modifier</button>
            <button class="delete" onclick="deleteAnnouncement(${index})">Supprimer</button>
        `;
        list.appendChild(item);
    });
}

function updateSuspensionList() {
    const list = document.getElementById('suspension-list');
    list.innerHTML = '';
    suspensionsMouvae.forEach((suspension, index) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p><strong>Période:</strong> ${suspension.period}</p>
            <p><strong>Arrêts:</strong> ${suspension.stops.join(', ')}</p>
            <p><strong>Message:</strong> ${suspension.message}</p>
            <button class="edit" onclick="editSuspension(${index})">Modifier</button>
            <button class="delete" onclick="deleteSuspension(${index})">Supprimer</button>
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

function editSuspension(index) {
    const suspension = suspensionsMouvae[index];
    document.getElementById('suspension-period-input').value = suspension.period;
    const stopSelect = document.getElementById('suspension-stop-input');
    stopSelect.innerHTML = '';
    suspension.stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        option.selected = true;
        stopSelect.appendChild(option);
    });
    document.getElementById('suspension-message-input').value = suspension.message;
    suspensionsMouvae.splice(index, 1);
    localStorage.setItem('suspensionsMouvae', JSON.stringify(suspensionsMouvae));
    updateSuspensionList();
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

function deleteSuspension(index) {
    suspensionsMouvae.splice(index, 1);
    localStorage.setItem('suspensionsMouvae', JSON.stringify(suspensionsMouvae));
    updateSuspensionList();
}

// Initialisation
updateTrafficInfoList();
updateAnnouncementList();
updateSuspensionList();
