document.getElementById('validate-button').addEventListener('click', showStopInfo);

let departuresData = {};
let selectedStop = '';
let displayedTime = new Date();
let currentDepartureSet = 0;
let progressInterval;
let numberOfTables = 1;
let selectedPeriod = '';
let trafficInfoIndex = 0;
let trafficInfoInterval;
let suspensionsData = [];
let hadDeparturesToday = false;

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
        suspensionsData = data;
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

function isAnnouncementActive(announcement) {
    const now = new Date();
    const startDateTime = new Date(`${announcement.Date_debut}T${announcement.Heure_debut}`);
    const endDateTime = new Date(`${announcement.Date_fin}T${announcement.Heure_fin}`);
    return now >= startDateTime && now <= endDateTime;
}

function isSuspensionActive(suspension) {
    const now = new Date();
    const startDateTime = new Date(`${suspension.Date_debut}T${suspension.Heure_debut}`);
    const endDateTime = new Date(`${suspension.Date_fin}T${suspension.Heure_fin}`);
    return now >= startDateTime && now <= endDateTime;
}

async function updateInfo() {
    const annoncesTrafic = await fetchAnnoncesTrafic();
    const suspensions = await fetchSuspensions();
}

async function loadPeriod() {
    await fetchSuspensions();
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
        try {
            const response = await fetch(urls[selectedPeriod]);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            departuresData[selectedPeriod] = data.map(departure => {
                const [hours, minutes] = departure.Heure.split(':').map(Number);
                const departureTime = new Date();
                departureTime.setHours(hours, minutes, 0, 0);

                // Gestion des heures après minuit
                if (hours < 3) {
                    departureTime.setDate(departureTime.getDate() + 1);
                }

                return { ...departure, departureTime };
            });
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        }
    } else {
        console.log('Aucun départ prévu aujourd\'hui.');
    }

    // Charger les services spéciaux
    if (isFriday || (isThursday && isPublicHoliday(today))) {
        await loadSpecialService('navette_n10', todayDateString);
    }
    if (isThursday) {
        await loadSpecialService('melusine_jeu', todayDateString);
    }
    if (isFriday) {
        await loadSpecialService('melusine_ven', todayDateString);
    }

    populateStopSelect();
    document.getElementById('stop-selection').style.display = 'block';
}

async function loadSpecialService(service, adjustedDate) {
    try {
        const response = await fetch(urls[service]);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        departuresData[service] = data.map(departure => {
            const [hours, minutes] = departure.Heure.split(':').map(Number);
            const departureTime = new Date();
            departureTime.setHours(hours, minutes, 0, 0);

            // Gestion des heures après minuit
            if (hours < 3) {
                departureTime.setDate(departureTime.getDate() + 1);
            }

            return { ...departure, departureTime };
        });
    } catch (error) {
        console.error(`Erreur lors du chargement des données pour ${service}:`, error);
    }
}

function isPublicHoliday(date) {
    // À implémenter avec une liste de jours fériés
    return false;
}

async function populateStopSelect() {
    const stopSelect = document.getElementById('stop-select');
    const response = await fetch('https://raw.githubusercontent.com/Remi-Ta/mouvae/main/arrets.json');
    const data = await response.json();
    const uniqueStops = [...new Set(data.map(item => item.nom_arret))];

    stopSelect.innerHTML = '';
    uniqueStops.sort(compareStops).forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        stopSelect.appendChild(option);
    });
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

    // Collecter tous les départs pertinents
    if (selectedPeriod) {
        allDepartures = departuresData[selectedPeriod]
            .filter(departure => departure.Arret === selectedStop)
            .map(departure => ({ ...departure, departureTime: new Date(departure.departureTime) }));
    }

    // Ajouter les services spéciaux
    ['navette_n10', 'melusine_jeu', 'melusine_ven'].forEach(service => {
        if (departuresData[service]) {
            allDepartures = allDepartures.concat(departuresData[service]
                .filter(departure => departure.Arret === selectedStop)
                .map(departure => ({ ...departure, departureTime: new Date(departure.departureTime) })));
        }
    });

    // Trier les départs par heure
    allDepartures.sort((a, b) => a.departureTime - b.departureTime);

    // Filtrer les départs pertinents
    const departuresToShow = allDepartures.filter(departure => {
        const waitTime = (departure.departureTime - displayedTime) / 1000 / 60;
        return waitTime >= 0; // Ne garder que les départs futurs
    });

    // Déterminer le nombre de tableaux
    const numberOfDepartures = departuresToShow.length;
    if (numberOfDepartures >= 17) {
        numberOfTables = 3;
    } else if (numberOfDepartures >= 9) {
        numberOfTables = 2;
    } else {
        numberOfTables = 1;
    }

    const departuresToDisplay = departuresToShow.slice(currentDepartureSet * 8, currentDepartureSet * 8 + 8);

    if (departuresToDisplay.length === 0) {
        // Aucun départ à afficher
        const item = document.createElement('div');
        item.classList.add('departure-item');
        item.innerHTML = '<div class="line-box"></div><div class="departure-destination"><strong>' +
            (allDepartures.length > 0 ? 'Service terminé.' : 'Aucun service prévu aujourd\'hui.') +
            '</strong></div><div class="departure-wait-time"></div>';
        departureInfoElement.appendChild(item);

        // Remplir les lignes vides
        for (let i = 1; i < 8; i++) {
            const emptyItem = document.createElement('div');
            emptyItem.classList.add('departure-item');
            emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
            departureInfoElement.appendChild(emptyItem);
        }
    } else {
        // Afficher les départs
        for (let i = 0; i < 8; i++) {
            const departure = departuresToDisplay[i];
            if (!departure) {
                // Si pas de départ, créer un élément vide
                const emptyItem = document.createElement('div');
                emptyItem.classList.add('departure-item');
                emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
                departureInfoElement.appendChild(emptyItem);
                continue;
            }

            const waitTime = (departure.departureTime - displayedTime) / 1000 / 60;
            const waitText = waitTime >= 0
                ? waitTime === 0
                    ? "<span class='approaching'>Imminent</span>"
                    : waitTime > 60
                        ? `${departure.Heure}`
                        : `${Math.round(waitTime)} min`
                : null;

            // Ne pas afficher les départs passés
            if (waitText === null) continue;

            const item = document.createElement('div');
            item.classList.add('departure-item');
            item.innerHTML = `
                <div class="line-box" style="background-color: ${departure.Couleur_fond}; color: ${departure.Couleur_indice};">${departure.Ligne}</div>
                <div class="departure-destination">${departure.Destination}</div>
                <div class="departure-wait-time">${waitText}</div>
            `;
            departureInfoElement.appendChild(item);
        }
    }

    // Mise à jour des barres de progression
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

    // Filtrer les annonces actives
    const activeAnnonces = annoncesTrafic.filter(isAnnouncementActive);

    function updateInfo() {
        if (activeAnnonces.length > 0) {
            const info = activeAnnonces[trafficInfoIndex % activeAnnonces.length];
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
        } else {
            trafficInfoDetails.innerHTML = `<p>Aucune information trafic actuelle.</p>`;
        }
    }

    updateInfo();

    if (trafficInfoInterval) {
        clearInterval(trafficInfoInterval);
    }
    trafficInfoInterval = setInterval(updateInfo, 10000);
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
    const departureLabels = document.getElementById('departure-labels');
    const progressBarsContainer = document.getElementById('progress-bars-container');

    const now = new Date();

    // Filtrer les suspensions actives pour l'arrêt sélectionné
    const activeSuspensions = suspensionsData.filter(suspension =>
        suspension.Arret === selectedStop && isSuspensionActive(suspension)
    );

    if (activeSuspensions.length > 0) {
        const suspension = activeSuspensions[0];
        const specificLines = suspension.Lignes ? suspension.Lignes.split(',').map(line => line.trim()) : [];
        const specificDestinations = suspension.Destination ? suspension.Destination.split(',').map(dest => dest.trim()) : [];

        if (specificLines.includes('Toutes')) {
            // Suspension totale
            suspensionMessage.innerHTML = `
                <div style="background-color: rgba(255, 255, 255, 0.5); padding: 20px; border-radius: 5px; text-align: center;">
                    <p><strong>CET ARRÊT N'EST PAS DESSERVI</strong></p>
                    <br><br>
                    <p><strong>Date(s) : </strong> ${suspension.Date_affichage}${suspension.Heure_affichage ? ` - ${suspension.Heure_affichage}` : ''}</p>
                    <br>
                    <p>${suspension.Message}</p>
                </div>
            `;

            suspensionContainer.style.display = 'flex';
            departureInfoElement.style.display = 'none';
            departureLabels.style.display = 'none';
            progressBarsContainer.style.display = 'none';
        } else {
            // Suspension partielle - masquer uniquement les départs concernés
            const departuresToShow = Array.from(departureInfoElement.children).filter(item => {
                const lineElement = item.querySelector('.line-box');
                const destinationElement = item.querySelector('.departure-destination');

                if (!lineElement || !destinationElement) return false;

                const line = lineElement.textContent.trim();
                const destination = destinationElement.textContent.trim();

                // Vérifier si la ligne ou la destination est concernée par la suspension
                const lineSuspended = specificLines.includes(line);
                const destinationSuspended = specificDestinations.length > 0 && specificDestinations.includes(destination);

                // Si la ligne est suspendue ET (soit aucune destination spécifique, soit la destination est suspendue)
                return !(lineSuspended && (specificDestinations.length === 0 || destinationSuspended));
            });

            // Si aucun départ n'est disponible après suspension
            if (departuresToShow.length === 0) {
                const item = document.createElement('div');
                item.classList.add('departure-item');
                item.innerHTML = '<div class="line-box"></div><div class="departure-destination"><strong>Aucun départ prévu aujourd\'hui.</strong></div><div class="departure-wait-time"></div>';
                departureInfoElement.innerHTML = '';
                departureInfoElement.appendChild(item);

                // Remplir les lignes vides
                for (let i = 1; i < 8; i++) {
                    const emptyItem = document.createElement('div');
                    emptyItem.classList.add('departure-item');
                    emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
                    departureInfoElement.appendChild(emptyItem);
                }
            } else {
                // Sinon, afficher les départs restants
                departureInfoElement.innerHTML = '';
                departuresToShow.forEach(item => departureInfoElement.appendChild(item));

                // Remplir les lignes vides
                while (departureInfoElement.children.length < 8) {
                    const emptyItem = document.createElement('div');
                    emptyItem.classList.add('departure-item');
                    emptyItem.innerHTML = '<div class="line-box"></div><div class="departure-destination"></div><div class="departure-wait-time"></div>';
                    departureInfoElement.appendChild(emptyItem);
                }
            }
        }
    } else {
        // Rétablir l'affichage normal
        suspensionContainer.style.display = 'none';
        departureInfoElement.style.display = 'block';
        departureLabels.style.display = 'block';
        progressBarsContainer.style.display = 'flex';
    }
}
setInterval(updateDateTime, 1000);

updateDateTime();
loadPeriod();
