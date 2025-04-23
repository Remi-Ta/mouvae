import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Initialize Firebase (assurez-vous que cette partie est déjà incluse dans votre HTML)
const db = getFirestore(app);

async function fetchTrafficInfos() {
    const querySnapshot = await getDocs(collection(db, 'traffic_infos'));
    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
    });
    return data;
}

async function fetchAnnouncements() {
    const querySnapshot = await getDocs(collection(db, 'annonces'));
    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
    });
    return data;
}

async function fetchSuspensions() {
    const querySnapshot = await getDocs(collection(db, 'suspensions'));
    const data = [];
    querySnapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
    });
    return data;
}

async function addTrafficInfo() {
    const line = document.getElementById('traffic-line-input').value.trim();
    const date = document.getElementById('traffic-date-input').value.trim();
    const detail = document.getElementById('traffic-detail-input').value.trim();

    if (line && date && detail) {
        await addDoc(collection(db, 'traffic_infos'), { line, date, detail });
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
        await addDoc(collection(db, 'annonces'), { text: value });
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
        await addDoc(collection(db, 'suspensions'), { periods, stops: suspensions, message });
        resetSuspensionForm();
        updateSuspensionList();
    }
}

async function loadStops() {
    const periods = Array.from(document.getElementById('suspension-period-select').selectedOptions).map(option => option.value);
    const response = await fetch(`https://raw.githubusercontent.com/Remi-Ta/mouvae/main/${periods[0]}.json`);
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
    trafficInfos.forEach((info) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p><strong>Ligne(s):</strong> ${info.line}</p>
            <p><strong>Dates:</strong> ${info.date}</p>
            <p><strong>Détail:</strong> ${info.detail}</p>
            <button class="edit" onclick="editTrafficInfo('${info.id}')">Modifier</button>
            <button class="delete" onclick="deleteTrafficInfo('${info.id}')">Supprimer</button>
        `;
        list.appendChild(item);
    });
}

async function updateAnnouncementList() {
    const list = document.getElementById('announcement-list');
    list.innerHTML = '';
    const announcements = await fetchAnnouncements();
    announcements.forEach((announcement) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p>${announcement.text}</p>
            <button class="edit" onclick="editAnnouncement('${announcement.id}')">Modifier</button>
            <button class="delete" onclick="deleteAnnouncement('${announcement.id}')">Supprimer</button>
        `;
        list.appendChild(item);
    });
}

async function updateSuspensionList() {
    const list = document.getElementById('suspension-list');
    list.innerHTML = '';
    const suspensions = await fetchSuspensions();
    suspensions.forEach((suspension) => {
        const item = document.createElement('div');
        item.classList.add('info-item');
        item.innerHTML = `
            <p><strong>Périodes:</strong> ${suspension.periods.join(', ')}</p>
            <p><strong>Arrêts:</strong> ${suspension.stops.map(stop => stop.stop).join(', ')}</p>
            <p><strong>Message:</strong> ${suspension.message}</p>
            <button class="edit" onclick="editSuspension('${suspension.id}')">Modifier</button>
            <button class="delete" onclick="deleteSuspension('${suspension.id}')">Supprimer</button>
        `;
        list.appendChild(item);
    });
}

async function editTrafficInfo(id) {
    const trafficInfos = await fetchTrafficInfos();
    const info = trafficInfos.find(info => info.id === id);
    document.getElementById('traffic-line-input').value = info.line;
    document.getElementById('traffic-date-input').value = info.date;
    document.getElementById('traffic-detail-input').value = info.detail;
    await deleteDoc(doc(db, 'traffic_infos', id));
    updateTrafficInfoList();
}

async function editAnnouncement(id) {
    const announcements = await fetchAnnouncements();
    const announcement = announcements.find(announcement => announcement.id === id);
    document.getElementById('announcement-input').value = announcement.text;
    await deleteDoc(doc(db, 'annonces', id));
    updateAnnouncementList();
}

async function editSuspension(id) {
    const suspensions = await fetchSuspensions();
    const suspension = suspensions.find(suspension => suspension.id === id);
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
    await deleteDoc(doc(db, 'suspensions', id));
    updateSuspensionList();
    updateSelectedStopsList();
}

async function deleteTrafficInfo(id) {
    await deleteDoc(doc(db, 'traffic_infos', id));
    updateTrafficInfoList();
}

async function deleteAnnouncement(id) {
    await deleteDoc(doc(db, 'annonces', id));
    updateAnnouncementList();
}

async function deleteSuspension(id) {
    await deleteDoc(doc(db, 'suspensions', id));
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

document.getElementById('suspension-stop-select').addEventListener('change', updateSelectedStopsList);

updateTrafficInfoList();
updateAnnouncementList();
updateSuspensionList();
