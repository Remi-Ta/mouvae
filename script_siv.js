document.getElementById('validate-button').addEventListener('click', showStopInfo);

let departuresData = {};
let selectedStop = '';
let displayedTime = new Date(); // Initialiser displayedTime correctement
let currentDepartureSet = 0; // Index pour la rotation des départs
let progressInterval; // Interval pour la progression des barres
let numberOfTables = 3; // Par défaut, 3 tableaux
let selectedPeriod = '';

const urls = {
    'lav_sco': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/88f1c2e19e91b7354feaf5440fcd1acfe0c6abd6/lav_sco.json',
    'lav_vac': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/88f1c2e19e91b7354feaf5440fcd1acfe0c6abd6/lav_vac.json',
    'sam': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/88f1c2e19e91b7354feaf5440fcd1acfe0c6abd6/sam.json',
    'dim': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/88f1c2e19e91b7354feaf5440fcd1acfe0c6abd6/dim.json'
};

function loadPeriod(period) {
    selectedPeriod = period;
    console.log(`Chargement des données pour la période ${period}...`);
    fetch(urls[period])
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            departuresData[period] = data;
            console.log(`Données chargées pour la période ${period}:`, data);
            populateStopSelect();
            document.getElementById('file-selection').style.display = 'none';
            document.getElementById('stop-selection').style.display = 'block';
        })
        .catch(error => console.error('Erreur lors du chargement des données:', error));
}

function populateStopSelect() {
    const stopSelect = document.getElementById('stop-select');
    stopSelect.innerHTML = ''; // Clear previous options

    const stops = [...new Set(departuresData[selectedPeriod].map(departure => departure.Arret))].sort(compareStops);
    stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        stopSelect.appendChild(option);
    });
    console.log(`Arrêts chargés pour la période ${selectedPeriod}:`, stops);
}

function compareStops(a, b) {
    const cleanString = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return cleanString(a).localeCompare(cleanString(b));
}

function showStopInfo() {
    selectedStop = document.getElementById('stop-select').value;
    if (selectedStop) {
        currentDepartureSet = 0; // Réinitialiser l'index des départs
        clearInterval(progressInterval); // Arrêter l'intervalle précédent
        resetProgressBars(); // Réinitialiser les barres de progression
        updateStopInfo();
        document.title = `mouvàe | ${selectedStop} | Prochains passages`;
        document.getElementById('progress-bars-container').style.display = 'flex';
        document.getElementById('info-container').style.display = 'block';
        startTrafficInfoCycle();
        startDepartureRotation();
        startProgressBars();
        checkForSuspensions(); // Vérifier les suspensions de desserte
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
    departureInfoElement.style.display = 'block';
    departureLabels.style.display = 'block';

    const currentTime = new Date();
    const currentHours = currentTime.getHours().toString().padStart(2, '0');
    const currentMinutes = currentTime.getMinutes().toString().padStart(2, '0');
    displayedTime.setHours(currentHours, currentMinutes, 0, 0);
    currentTimeElement.textContent = `${currentHours}:${currentMinutes}`;

    departureInfoElement.innerHTML = '';

    // Filtrer les départs pour la journée actuelle seulement
    let allDepartures = departuresData[selectedPeriod]
        .filter(departure => departure.Arret === selectedStop)
        .map(departure => {
            let [hours, minutes] = departure.Heure.split(':').map(Number);
            const departureTime = new Date();
            departureTime.setHours(hours, minutes, 0, 0);
            return { ...departure, departureTime };
        })
        .filter(departure => departure.departureTime >= displayedTime) // Inclure les départs dont l'heure est passée d'une minute
        .sort((a, b) => a.departureTime - b.departureTime);

    // Calculer le nombre de départs prochains
    const numberOfDepartures = allDepartures.length;

    // Déterminer le nombre de tableaux à afficher
    if (numberOfDepartures >= 17) {
        numberOfTables = 3;
    } else if (numberOfDepartures >= 9) {
        numberOfTables = 2;
    } else {
        numberOfTables = 1;
    }

    // Afficher 8 lignes, même si certaines sont vides
    const departuresToShow = allDepartures
        .filter(departure => {
            const waitTime = (departure.departureTime - displayedTime) / 1000 / 60;
            return waitTime >= 0;
        })
        .slice(currentDepartureSet * 8, currentDepartureSet * 8 + 8);

    if (departuresToShow.length === 0 && numberOfDepartures === 0) {
        const item = document.createElement('div');
        item.classList.add('departure-item');
        item.innerHTML = '<div class="line-box"></div><div class="departure-destination">Service terminé.</div><div class="departure-wait-time"></div>';
        departureInfoElement.appendChild(item);

        // Ajouter 7 lignes vides
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

    // Adapter le nombre de barres de progression et les centrer
    const progressBarsContainer = document.getElementById('progress-bars-container');
    progressBarsContainer.innerHTML = ''; // Clear previous bars
    progressBarsContainer.style.justifyContent = 'center'; // Center the bars
    for (let i = 0; i < numberOfTables; i++) {
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        const progressBarFill = document.createElement('div');
        progressBarFill.classList.add('progress-bar-fill');
        progressBar.appendChild(progressBarFill);
        progressBarsContainer.appendChild(progressBar);
    }

    // Update progress bars
    startProgressBars();
}

function updateDateTime() {
    const currentTimeElement = document.getElementById('current-time');
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}`;

    // Update displayedTime
    displayedTime.setHours(hours, minutes, 0, 0);

    // Update departures immediately after updating the time
    if (selectedStop) {
        updateStopInfo();
    }
}

function startTrafficInfoCycle() {
    let index = 0;
    const trafficInfoDetails = document.getElementById('traffic-info-details');
    const trafficInfos = JSON.parse(localStorage.getItem('trafficInfosMouvae')) || [];
    const announcements = JSON.parse(localStorage.getItem('announcementsMouvae')) || [];

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

    // Initial update
    updateInfo();

    // Update every 12 seconds
    setInterval(updateInfo, 12000);
}

function startDepartureRotation() {
    progressInterval = setInterval(() => {
        currentDepartureSet = (currentDepartureSet + 1) % numberOfTables; // Rotate between the number of tables
        updateStopInfo();
    }, 10000); // Change every 10 seconds
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

function checkForSuspensions() {
    const suspensions = JSON.parse(localStorage.getItem('suspensionsMouvae')) || [];
    const suspensionContainer = document.getElementById('suspension-container');
    const suspensionMessage = document.getElementById('suspension-message');

    const currentPeriod = selectedPeriod;
    const selectedStop = document.getElementById('stop-select').value;

    const relevantSuspension = suspensions.find(suspension =>
        suspension.period === currentPeriod && suspension.stops.includes(selectedStop)
    );

    if (relevantSuspension) {
        suspensionMessage.textContent = relevantSuspension.message;
        suspensionContainer.style.display = 'block';
        document.getElementById('departure-info').style.display = 'none';
        document.getElementById('departure-labels').style.display = 'none';
    } else {
        suspensionContainer.style.display = 'none';
        document.getElementById('departure-info').style.display = 'block';
        document.getElementById('departure-labels').style.display = 'block';
    }
}

// Mettre à jour la date et l'heure toutes les secondes pour un suivi plus précis
setInterval(updateDateTime, 1000);

// Initialisation
updateDateTime();
