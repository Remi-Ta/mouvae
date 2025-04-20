document.getElementById('validate-button').addEventListener('click', showStopInfo);

let departuresData = {};
let selectedStop = '';
let displayedTime = new Date();
let currentDepartureSet = 0;
let progressInterval;
let numberOfTables = 3;
let selectedPeriod = '';

const urls = {
    'lav_sco': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/lav_sco.json',
    'lav_vac': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/lav_vac.json',
    'sam': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/sam.json',
    'dim': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/dim.json',
    'navette_n10': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/main/navette_n10.json',
    'melusine_jeu_ven_sam': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/main/melusine_jeu_ven_sam.json'
};

async function fetchTrafficInfos() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/traffic_infos.json');
        const data = await response.json();
        return data.length ? data : [];
    } catch (error) {
        console.error('Erreur lors du chargement des infos trafic:', error);
        return [];
    }
}

async function fetchAnnouncements() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/annonces.json');
        const data = await response.json();
        return data.length ? data : [];
    } catch (error) {
        console.error('Erreur lors du chargement des annonces:', error);
        return [];
    }
}

async function fetchSuspensions() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/7c690e00f8ddf01ba54cf04f101288410bfb46b4/suspensions.json');
        const data = await response.json();
        return data.length ? data : [];
    } catch (error) {
        console.error('Erreur lors du chargement des suspensions:', error);
        return [];
    }
}

async function fetchCalendrier() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/main/calendrier.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur lors du chargement du calendrier:', error);
        return [];
    }
}

async function updateInfo() {
    const trafficInfos = await fetchTrafficInfos();
    const announcements = await fetchAnnouncements();
    const suspensions = await fetchSuspensions();

    // Mettre à jour les informations sur la page
    // ...
}

async function loadPeriod() {
    const calendrier = await fetchCalendrier();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayDateString = today.toLocaleDateString('fr-FR');
    const tomorrowDateString = tomorrow.toLocaleDateString('fr-FR');

    const periodEntry = calendrier.find(entry => entry.date === todayDateString);
    const isFriday = today.getDay() === 5;
    const isThursday = today.getDay() === 4;
    const isSaturday = today.getDay() === 6;
    const isSunday = today.getDay() === 0;

    if (periodEntry && periodEntry.periode) {
        selectedPeriod = periodEntry.periode;
        console.log(`Chargement des données pour la période ${selectedPeriod}...`);
        try {
            const response = await fetch(urls[selectedPeriod]);
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            const data = await response.json();
            departuresData[selectedPeriod] = data.map(departure => {
                const [hours, minutes] = departure.Heure.split(':').map(Number);
                const departureTime = new Date();
                departureTime.setHours(hours, minutes, 0, 0);
                let adjustedDate = todayDateString;
                if (hours < 3) { // Si l'heure est entre 00h00 et 02h59, considérer comme le lendemain
                    adjustedDate = tomorrowDateString;
                }
                return { ...departure, departureTime, adjustedDate };
            });
            console.log(`Données chargées pour la période ${selectedPeriod}:`, data);
            populateStopSelect();
            document.getElementById('stop-selection').style.display = 'block';
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    } else {
        console.log('Aucun départ prévu aujourd\'hui.');
        document.getElementById('stop-selection').style.display = 'block';
    }

    // Charger les services spéciaux si nécessaire
    if (isFriday || (isThursday && isPublicHoliday(today))) {
        await loadSpecialService('navette_n10', todayDateString);
    }
    if (isThursday || isFriday || isSaturday) {
        await loadSpecialService('melusine_jeu_ven_sam', todayDateString);
    }
}

async function loadSpecialService(service, adjustedDate) {
    try {
        const response = await fetch(urls[service]);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();
        departuresData[service] = data.map(departure => {
            const [hours, minutes] = departure.Heure.split(':').map(Number);
            const departureTime = new Date();
            departureTime.setHours(hours, minutes, 0, 0);
            return { ...departure, departureTime, adjustedDate };
        });
        console.log(`Données chargées pour le service spécial ${service}:`, data);
    } catch (error) {
        console.error(`Erreur lors du chargement des données pour le service spécial ${service}:`, error);
    }
}

function isPublicHoliday(date) {
    // Implémentez cette fonction pour vérifier si une date est un jour férié
    // Vous pouvez utiliser un fichier JSON ou une API pour obtenir les jours fériés
    return false; // Par défaut, retourne false
}

async function populateStopSelect() {
    const stopSelect = document.getElementById('stop-select');
    const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/main/arrets.json');
    const data = await response.json();

    // Extraire les noms d'arrêts uniques
    const uniqueStops = [...new Set(data.map(item => item.nom_arret))];

    stopSelect.innerHTML = '';

    uniqueStops.sort(compareStops).forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        stopSelect.appendChild(option);
    });
    console.log(`Arrêts chargés:`, uniqueStops);
}

function compareStops(a, b) {
    const cleanString = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return cleanString(a).localeCompare(cleanString(b));
}

function showStopInfo() {
    selectedStop = document.getElementById('stop-select').value;
    if (selectedStop) {
        currentDepartureSet = 0;
        clearInterval(progressInterval);
        resetProgressBars();
        updateStopInfo();
        document.title = `mouvàe | ${selectedStop} | Prochains passages`;
        document.getElementById('progress-bars-container').style.display = 'flex';
        document.getElementById('info-container').style.display = 'block';
        startTrafficInfoCycle();
        startDepartureRotation();
        startProgressBars();
        checkForSuspensions();
    }
}

function updateStopInfo() {
    const selectedStopElement = document.getElementById('selected-stop');
    const currentTimeElement = document.getElementById('current-time');
    const departureInfoElement = document.getElementById('departure-info');
    const stopHeader = document.getElementById('stop-header');
    const departureLabels = document.getElementById('departure-labels');

    selectedStopElement.textContent = selectedStop;
    stopHeader.style.display = 'flex';
    departureLabels.style.display = 'block';

    const currentTime = new Date();
    const currentHours = currentTime.getHours().toString().padStart(2, '0');
    const currentMinutes = currentTime.getMinutes().toString().padStart(2, '0');
    displayedTime.setHours(currentHours, currentMinutes, 0, 0);
    currentTimeElement.textContent = `${currentHours}:${currentMinutes}`;

    departureInfoElement.innerHTML = '';

    const todayDateString = currentTime.toLocaleDateString('fr-FR');
    const tomorrowDateString = new Date(currentTime);
    tomorrowDateString.setDate(tomorrowDateString.getDate() + 1);
    tomorrowDateString.toLocaleDateString('fr-FR');

    let allDepartures = [];

    if (selectedPeriod) {
        allDepartures = departuresData[selectedPeriod]
            .filter(departure => departure.Arret === selectedStop && (departure.adjustedDate === todayDateString || departure.adjustedDate === tomorrowDateString))
            .map(departure => {
                return { ...departure, departureTime: new Date(departure.departureTime) };
            })
            .sort((a, b) => a.departureTime - b.departureTime);
    }

    // Ajouter les services spéciaux si disponibles
    if (departuresData['navette_n10']) {
        allDepartures = allDepartures.concat(departuresData['navette_n10']
            .filter(departure => departure.Arret === selectedStop && (departure.adjustedDate === todayDateString || departure.adjustedDate === tomorrowDateString))
            .map(departure => {
                return { ...departure, departureTime: new Date(departure.departureTime) };
            }));
    }
    if (departuresData['melusine_jeu_ven_sam']) {
        allDepartures = allDepartures.concat(departuresData['melusine_jeu_ven_sam']
            .filter(departure => departure.Arret === selectedStop && (departure.adjustedDate === todayDateString || departure.adjustedDate === tomorrowDateString))
            .map(departure => {
                return { ...departure, departureTime: new Date(departure.departureTime) };
            }));
    }

    allDepartures.sort((a, b) => a.departureTime - b.departureTime);

    const numberOfDepartures = allDepartures.length;

    if (numberOfDepartures >= 17) {
        numberOfTables = 3;
    } else if (numberOfDepartures >= 9) {
        numberOfTables = 2;
    } else {
        numberOfTables = 1;
    }

    const departuresToShow = allDepartures
        .filter(departure => {
            const waitTime = (departure.departureTime - displayedTime) / 1000 / 60;
            return waitTime >= 0;
        })
        .slice(currentDepartureSet * 8, currentDepartureSet * 8 + 8);

    if (departuresToShow.length === 0 && numberOfDepartures === 0) {
        const item = document.createElement('div');
        item.classList.add('departure-item');
        item.innerHTML = '<div class="line-box"></div><div class="departure-destination"><strong>Aucun départ prévu aujourd\'hui.</strong></div><div class="departure-wait-time"></div>';
        departureInfoElement.appendChild(item);

        for (let i = 1; i < 8; i++) {
            const emptyItem = document.createElement('div');
            emptyItem.classList.add('departure-item');
            emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
            departureInfoElement.appendChild(emptyItem);
        }
    } else if (departuresToShow.length === 0) {
        const item = document.createElement('div');
        item.classList.add('departure-item');
        item.innerHTML = '<div class="line-box"></div><div class="departure-destination"><strong>Service terminé.</strong></div><div class="departure-wait-time"></div>';
        departureInfoElement.appendChild(item);

        for (let i = 1; i < 8; i++) {
            const emptyItem = document.createElement('div');
            emptyItem.classList.add('departure-item');
            emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
            departureInfoElement.appendChild(emptyItem);
        }
    } else {
        for (let i = 0; i < 8; i++) {
            const departure = departuresToShow[i];
            const waitTime = departure ? (departure.departureTime - displayedTime) / 1000 / 60 : null;
            const waitText = waitTime !== null && waitTime >= 0
                ? waitTime === 0
                ? "<span class='approaching'>À l'approche</span>"
                : waitTime > 60
                ? `${departure.Heure}`
                : `${Math.round(waitTime)} min`
                : '';

            const item = document.createElement('div');
            item.classList.add('departure-item');
            item.innerHTML = departure ? `
                <div class="line-box" style="background-color: ${departure.Couleur_fond}; color: ${departure.Couleur_indice};">${departure.Ligne}</div>
                <div class="departure-destination">${departure.Destination}</div>
                <div class="departure-wait-time">${waitText}</div>
            ` : '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
            departureInfoElement.appendChild(item);
        }
    }

    const progressBarsContainer = document.getElementById('progress-bars-container');
    progressBarsContainer.innerHTML = '';
    progressBarsContainer.style.justifyContent = 'center';
    for (let i = 0; i < numberOfTables; i++) {
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        const progressBarFill = document.createElement('div');
        progressBarFill.classList.add('progress-bar-fill');
        progressBar.appendChild(progressBarFill);
        progressBarsContainer.appendChild(progressBar);
    }

    startProgressBars();
}

function updateDateTime() {
    const currentTimeElement = document.getElementById('current-time');
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}`;

    displayedTime.setHours(hours, minutes, 0, 0);

    if (selectedStop) {
        updateStopInfo();
    }
}

async function startTrafficInfoCycle() {
    let index = 0;
    const trafficInfoDetails = document.getElementById('traffic-info-details');
    const trafficInfos = await fetchTrafficInfos();
    const announcements = await fetchAnnouncements();

    function updateInfo() {
        if (trafficInfos.length > 0 || announcements.length > 0) {
            if (index % 2 === 0 && trafficInfos.length > 0) {
                const info = trafficInfos[Math.floor(index / 2) % trafficInfos.length];
                trafficInfoDetails.innerHTML = `
                    <p><strong>Ligne(s) : </strong> ${info.line}</p>
                    <p><strong>Dates : </strong> ${info.date}</p>
                    <p>${info.detail}</p>
                `;
            } else if (announcements.length > 0) {
                const announcement = announcements[Math.floor(index / 2) % announcements.length];
                trafficInfoDetails.innerHTML = `<p>${announcement}</p>`;
            }
            index = (index + 1);
        }
    }

    updateInfo();

    setInterval(updateInfo, 17000);
}

function startDepartureRotation() {
    progressInterval = setInterval(() => {
        currentDepartureSet = (currentDepartureSet + 1) % numberOfTables;
        updateStopInfo();
    }, 10000);
}

function startProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar-fill');
    progressBars.forEach((bar, index) => {
        bar.style.width = '0%';
        bar.style.transition = 'width 10s linear';
        if (index === currentDepartureSet) {
            bar.style.width = '100%';
            bar.style.backgroundColor = '#001b69';
        } else {
            bar.style.backgroundColor = '#ccc';
        }
    });
}

function resetProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar-fill');
    progressBars.forEach(bar => {
        bar.style.width = '0%';
        bar.style.backgroundColor = '#ccc';
    });
}

async function checkForSuspensions() {
    const suspensions = await fetchSuspensions();
    const suspensionContainer = document.getElementById('suspension-container');
    const suspensionMessage = document.getElementById('suspension-message');

    const currentPeriod = selectedPeriod;
    const selectedStop = document.getElementById('stop-select').value;
    const relevantSuspension = suspensions.find(suspension =>
        suspension.periods.includes(currentPeriod) && suspension.stops.some(stop => stop.stop === selectedStop)
    );

    if (relevantSuspension) {
        const specificLines = relevantSuspension.stops.find(stop => stop.stop === selectedStop).lines;
        if (specificLines.length > 0) {
            const departureInfoElement = document.getElementById('departure-info');
            const departuresToShow = Array.from(departureInfoElement.children).filter(item => {
                const line = item.querySelector('.line-box').textContent;
                return !specificLines.includes(line);
            });
            departureInfoElement.innerHTML = '';
            departuresToShow.forEach(item => departureInfoElement.appendChild(item));

            while (departureInfoElement.children.length < 8) {
                const emptyItem = document.createElement('div');
                emptyItem.classList.add('departure-item');
                emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
                departureInfoElement.appendChild(emptyItem);
            }
        } else {
            suspensionMessage.textContent = relevantSuspension.message;
            suspensionContainer.style.display = 'flex';
            document.getElementById('departure-info').style.display = 'none';
            document.getElementById('departure-labels').style.display = 'none';
        }
    } else {
        suspensionContainer.style.display = 'none';
        document.getElementById('departure-info').style.display = 'block';
        document.getElementById('departure-labels').style.display = 'block';
    }
}

setInterval(updateDateTime, 1000);

updateDateTime();
loadPeriod();
