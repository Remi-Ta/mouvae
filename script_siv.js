document.getElementById('validate-button').addEventListener('click', showStopInfo);

let departuresData = {};
let selectedStop = '';
let displayedTime = new Date();
let currentDepartureSet = 0;
let progressInterval;
let numberOfTables = 1; // Initialiser à 1 tableau
let selectedPeriod = '';
let trafficInfoIndex = 0; // Ajout d'un index pour la rotation des infos trafic
let trafficInfoInterval; // Ajout d'un interval pour la rotation des infos trafic
let suspensionsData = []; // Ajout pour stocker les données de suspensions

const urls = {
    'lav_sco': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/lav_sco.json',
    'lav_vac': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/lav_vac.json',
    'sam': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/sam.json',
    'dim': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/dim.json',
    'navette_n10': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/main/navette_n10.json',
    'melusine_jeu': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/main/melusine_jeu.json',
    'melusine_ven': 'https://raw.githubusercontent.com/Remi-Ta/mouvae/main/melusine_ven.json'
};

async function fetchAnnoncesTrafic() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/annonces_trafic.json');
        const data = await response.json();
        return data.length ? data : [];
    } catch (error) {
        console.error('Erreur lors du chargement des annonces trafic:', error);
        return [];
    }
}

async function fetchSuspensions() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/refs/heads/main/suspensions.json');
        const data = await response.json();
        suspensionsData = data; // Stocker les données de suspensions
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
    const annoncesTrafic = await fetchAnnoncesTrafic();
    const suspensions = await fetchSuspensions();

    // Mettre à jour les informations sur la page
    // ...
}

async function loadPeriod() {
    await fetchSuspensions(); // Charger les suspensions dès le début
    const calendrier = await fetchCalendrier();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayDateString = today.toLocaleDateString('fr-FR');
    const tomorrowDateString = tomorrow.toLocaleDateString('fr-FR');

    const periodEntry = calendrier.find(entry => entry.date === todayDateString);
    const isThursday = today.getDay() === 4;
    const isFriday = today.getDay() === 5;
    const isSaturday = today.getDay() === 6;

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
                if (hours < 3) { // Si l'heure est entre 00h00 et 02h59, considérer comme le jour même
                    adjustedDate = todayDateString;
                }
                return { ...departure, departureTime, adjustedDate };
            });
            console.log(`Données chargées pour la période ${selectedPeriod}:`, data);
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    } else {
        console.log('Aucun départ prévu aujourd\'hui.');
    }

    // Charger les services spéciaux si nécessaire
    if (isFriday || (isThursday && isPublicHoliday(today))) {
        await loadSpecialService('navette_n10', todayDateString);
    }
    if (isThursday) {
        await loadSpecialService('melusine_jeu', todayDateString);
    }
    if (isFriday) {
        await loadSpecialService('melusine_ven', todayDateString);
    }

    // Charger les arrêts même en jour férié
    populateStopSelect();
    document.getElementById('stop-selection').style.display = 'block';
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
        document.title = `Prochains départs : ${selectedStop} | mouvàe`;
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
            });
    }

    // Ajouter les services spéciaux si disponibles
    if (departuresData['navette_n10']) {
        allDepartures = allDepartures.concat(departuresData['navette_n10']
            .filter(departure => departure.Arret === selectedStop && (departure.adjustedDate === todayDateString || departure.adjustedDate === tomorrowDateString))
            .map(departure => {
                return { ...departure, departureTime: new Date(departure.departureTime) };
            }));
    }
    if (departuresData['melusine_jeu']) {
        allDepartures = allDepartures.concat(departuresData['melusine_jeu']
            .filter(departure => departure.Arret === selectedStop && (departure.adjustedDate === todayDateString || departure.adjustedDate === tomorrowDateString))
            .map(departure => {
                return { ...departure, departureTime: new Date(departure.departureTime) };
            }));
    }
    if (departuresData['melusine_ven']) {
        allDepartures = allDepartures.concat(departuresData['melusine_ven']
            .filter(departure => departure.Arret === selectedStop && (departure.adjustedDate === todayDateString || departure.adjustedDate === tomorrowDateString))
            .map(departure => {
                return { ...departure, departureTime: new Date(departure.departureTime) };
            }));
    }

    allDepartures.sort((a, b) => a.departureTime - b.departureTime);

    const departuresToShow = allDepartures
        .filter(departure => {
            const waitTime = (departure.departureTime - displayedTime) / 1000 / 60;
            return waitTime >= 0;
        });

    const numberOfDepartures = departuresToShow.length;

    if (numberOfDepartures >= 17) {
        numberOfTables = 3;
    } else if (numberOfDepartures >= 9) {
        numberOfTables = 2;
    } else {
        numberOfTables = 1;
    }

    const departuresToDisplay = departuresToShow.slice(currentDepartureSet * 8, currentDepartureSet * 8 + 8);

    if (departuresToDisplay.length === 0 && numberOfDepartures === 0) {
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
    } else if (departuresToDisplay.length === 0 && numberOfDepartures > 0) {
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
            const departure = departuresToDisplay[i];
            const waitTime = departure ? (departure.departureTime - displayedTime) / 1000 / 60 : null;
            const waitText = waitTime !== null && waitTime >= 0
                ? waitTime === 0
                ? "<span class='approaching'>Imminent</span>"
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
    const trafficInfoDetails = document.getElementById('traffic-info-details');
    const annoncesTrafic = await fetchAnnoncesTrafic();

    function updateInfo() {
        if (annoncesTrafic.length > 0) {
            const info = annoncesTrafic[trafficInfoIndex % annoncesTrafic.length];
            if (info.Type === 'Info trafic') {
                trafficInfoDetails.innerHTML = `
                    <p><strong>Date(s) : </strong> ${info.Date_affichage} ${info.Heure_affichage ? `- ${info.Heure_affichage}` : ''}</p>
                    <p><strong>Ligne(s) : </strong> ${info.Lignes}</p>
                    <p>${info.Message}</p>
                `;
            } else {
                trafficInfoDetails.innerHTML = `<p>${info.Message}</p>`;
            }
            trafficInfoIndex++;
        }
    }

    updateInfo();

    if (trafficInfoInterval) {
        clearInterval(trafficInfoInterval);
    }
    trafficInfoInterval = setInterval(updateInfo, 10000); // Réduire le temps de rotation à 10 secondes
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
    const suspensionContainer = document.getElementById('suspension-container');
    const suspensionMessage = document.getElementById('suspension-message');
    const departureInfoElement = document.getElementById('departure-info');

    const selectedStop = document.getElementById('stop-select').value;
    const relevantSuspension = suspensionsData.find(suspension =>
        suspension.Arret === selectedStop &&
        new Date() >= new Date(`${suspension.Date_debut}T${suspension.Heure_debut}`) &&
        new Date() <= new Date(`${suspension.Date_fin}T${suspension.Heure_fin}`)
    );

    if (relevantSuspension) {
        const specificLines = relevantSuspension.Lignes.split(',').map(line => line.trim());
        if (specificLines.includes('Toutes')) {
            suspensionMessage.innerHTML = `
                <div style="background-color: rgba(255, 255, 255, 0.5); padding: 20px; border-radius: 5px; text-align: center;">
                    <p><strong>CET ARRÊT N'EST PAS DESSERVI</strong></p>
                    <br><br><br><br>
                    <p><strong>Date(s) : </strong> ${relevantSuspension.Date_affichage}${relevantSuspension.Heure_affichage ? ` - ${relevantSuspension.Heure_affichage}` : ''}</p>
                    <br>
                    <p>${relevantSuspension.Message}</p>
                </div>
            `;
            suspensionContainer.style.display = 'flex';
            departureInfoElement.style.display = 'none';
            document.getElementById('departure-labels').style.display = 'none';
        } else {
            const departuresToShow = Array.from(departureInfoElement.children).filter(item => {
                const line = item.querySelector('.line-box').textContent;
                const destination = item.querySelector('.departure-destination').textContent;
                const relevantDestination = relevantSuspension.Destination ? relevantSuspension.Destination.trim() : '';
                return !(specificLines.includes(line) && (relevantDestination === '' || relevantDestination === destination));
            });
            departureInfoElement.innerHTML = '';
            departuresToShow.forEach(item => departureInfoElement.appendChild(item));

            while (departureInfoElement.children.length < 8) {
                const emptyItem = document.createElement('div');
                emptyItem.classList.add('departure-item');
                emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
                departureInfoElement.appendChild(emptyItem);
            }
        }
    } else {
        suspensionContainer.style.display = 'none';
        departureInfoElement.style.display = 'block';
        document.getElementById('departure-labels').style.display = 'block';
    }
}

setInterval(updateDateTime, 1000);

updateDateTime();
loadPeriod();
