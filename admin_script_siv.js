const corsProxy = 'https://cors-anywhere.herokuapp.com/';

async function fetchTrafficInfos() {
    const response = await fetch(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/traffic_infos.json`);
    return await response.json();
}

async function fetchAnnouncements() {
    const response = await fetch(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/annonces.json`);
    return await response.json();
}

async function fetchSuspensions() {
    const response = await fetch(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/suspensions.json`);
    return await response.json();
}

async function saveToGitHub(url, data) {
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return await response.json();
}

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

async function addTrafficInfo() {
    const line = document.getElementById('traffic-line-input').value.trim();
    const date = document.getElementById('traffic-date-input').value.trim();
    const detail = document.getElementById('traffic-detail-input').value.trim();

    if (line && date && detail) {
        trafficInfosMouvae.push({ line, date, detail });
        await saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/traffic_infos.json`, trafficInfosMouvae);
        document.getElementById('traffic-line-input').value = '';
        document.getElementById('traffic-date-input').value = '';
        document.getElementById('traffic-detail-input').value = '';
        updateTrafficInfoList();
    }
}

async function addAnnouncement() {
    const input = document.getElementById('announcement-input');
    const value = input.value.trim();
    if (value) {
        announcementsMouvae.push(value);
        await saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/annonces.json`, announcementsMouvae);
        input.value = '';
        updateAnnouncementList();
    }
}

async function addSuspension() {
    const periods = Array.from(document.getElementById('suspension-period-select').selectedOptions).map(option => option.value);
    const stops = Array.from(document.getElementById('suspension-stop-select').selectedOptions).map(option => option.value);
    const message = document.getElementById('suspension-message-input').value.trim();

    const selectedStops = document.querySelectorAll('.selected-stop-item');
    const suspensions = [];

    selectedStops.forEach(stopItem => {
        const stopName = stopItem.querySelector('span').textContent;
        const lines = stopItem.querySelector('.line-checkbox-container input[type="checkbox"]').checked
            ? Array.from(stopItem.querySelector('.line-checkbox-container select').selectedOptions).map(option => option.value)
            : [];
        suspensions.push({ stop: stopName, lines });
    });

    if (periods.length > 0 && stops.length > 0 && message) {
        suspensionsMouvae.push({ periods, stops: suspensions, message });
        await saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/suspensions.json`, suspensionsMouvae);
        resetSuspensionForm();
        updateSuspensionList();
    }
}

async function loadStops() {
    const periods = Array.from(document.getElementById('suspension-period-select').selectedOptions).map(option => option.value);
    const response = await fetch(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/${periods[0]}.json`);
    const data = await response.json();
    availableStops = [...new Set(data.map(item => item.Arret))].sort();
    const stopSelect = document.getElementById('suspension-stop-select');
    stopSelect.innerHTML = '';
    availableStops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        stopSelect.appendChild(option);
    });
    document.getElementById('suspension-stop-selection').style.display = 'block';
}

async function updateTrafficInfoList() {
    const list = document.getElementById('traffic-info-list');
    list.innerHTML = '';
    const trafficInfos = await fetchTrafficInfos();
    trafficInfos.forEach((info, index) => {
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

async function updateAnnouncementList() {
    const list = document.getElementById('announcement-list');
    list.innerHTML = '';
    const announcements = await fetchAnnouncements();
    announcements.forEach((announcement, index) => {
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

async function updateSuspensionList() {
    const list = document.getElementById('suspension-list');
    list.innerHTML = '';
    const suspensions = await fetchSuspensions();
    suspensions.forEach((suspension, index) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p><strong>Périodes:</strong> ${suspension.periods.join(', ')}</p>
            <p><strong>Arrêts:</strong> ${suspension.stops.map(stop => stop.stop).join(', ')}</p>
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
    saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/traffic_infos.json`, trafficInfosMouvae);
    updateTrafficInfoList();
}

function editAnnouncement(index) {
    const input = document.getElementById('announcement-input');
    input.value = announcementsMouvae[index];
    announcementsMouvae.splice(index, 1);
    saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/annonces.json`, announcementsMouvae);
    updateAnnouncementList();
}

function editSuspension(index) {
    const suspension = suspensionsMouvae[index];
    document.getElementById('suspension-period-select').value = suspension.periods.join(', ');
    const stopSelect = document.getElementById('suspension-stop-select');
    stopSelect.innerHTML = '';
    suspension.stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop.stop;
        option.textContent = stop.stop;
        option.selected = true;
        stopSelect.appendChild(option);
    });
    document.getElementById('suspension-message-input').value = suspension.message;
    suspensionsMouvae.splice(index, 1);
    saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/suspensions.json`, suspensionsMouvae);
    updateSuspensionList();
    updateSelectedStopsList();
}

async function deleteTrafficInfo(index) {
    trafficInfosMouvae.splice(index, 1);
    await saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/traffic_infos.json`, trafficInfosMouvae);
    updateTrafficInfoList();
}

async function deleteAnnouncement(index) {
    announcementsMouvae.splice(index, 1);
    await saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/annonces.json`, announcementsMouvae);
    updateAnnouncementList();
}

async function deleteSuspension(index) {
    suspensionsMouvae.splice(index, 1);
    await saveToGitHub(`${corsProxy}https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/suspensions.json`, suspensionsMouvae);
    updateSuspensionList();
}

function updateSelectedStopsList() {
    const selectedStopsList = document.getElementById('selected-stops-list');
    selectedStopsList.innerHTML = '';
    const selectedStops = Array.from(document.getElementById('suspension-stop-select').selectedOptions).map(option => option.value);
    selectedStops.forEach(stop => {
        const item = document.createElement('div');
        item.classList.add('selected-stop-item');
        item.innerHTML = `
            <span>${stop}</span>
            <button onclick="removeSelectedStop('${stop}')">×</button>
            <div class="line-checkbox-container">
                <label>
                    <input type="checkbox"> Lignes spécifiques
                </label>
                <select multiple disabled>
                    <!-- Options des lignes seront ajoutées dynamiquement -->
                </select>
            </div>
        `;
        selectedStopsList.appendChild(item);
    });
}

function removeSelectedStop(stop) {
    const stopSelect = document.getElementById('suspension-stop-select');
    Array.from(stopSelect.selectedOptions).forEach(option => {
        if (option.value === stop) {
            option.selected = false;
        }
    });
    updateSelectedStopsList();
}

function resetSuspensionForm() {
    document.getElementById('suspension-period-select').innerHTML = '';
    document.getElementById('suspension-stop-select').innerHTML = '';
    document.getElementById('suspension-message-input').value = '';
    document.getElementById('suspension-stop-selection').style.display = 'none';
    updateSelectedStopsList();
}

document.getElementById('suspension-stop-select').addEventListener('change', updateSelectedStopsList);

updateTrafficInfoList();
updateAnnouncementList();
updateSuspensionList();
