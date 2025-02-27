document.getElementById('load-button').addEventListener('click', handleFileUpload);
document.getElementById('validate-button').addEventListener('click', showStopInfo);

let departuresData = [];
let selectedStop = '';
let displayedTime = null; // Stocker l'heure affichée
let currentDepartureSet = 0; // Index pour la rotation des départs
let progressInterval; // Interval pour la progression des barres

function handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                departuresData = results.data;
                populateStopSelect();
            }
        });
    }
}

function populateStopSelect() {
    const stopSelect = document.getElementById('stop-select');
    stopSelect.innerHTML = ''; // Clear previous options
    document.getElementById('stop-selection').style.display = 'block'; // Show the stop selection

    const stops = [...new Set(departuresData.map(departure => departure.Arret))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'accent' })
    );
    stops.forEach(stop => {
        const option = document.createElement('option');
        option.value = stop;
        option.textContent = stop;
        stopSelect.appendChild(option);
    });
}

function showStopInfo() {
    selectedStop = document.getElementById('stop-select').value;
    if (selectedStop) {
        currentDepartureSet = 0; // Réinitialiser l'index des départs
        clearInterval(progressInterval); // Arrêter l'intervalle précédent
        resetProgressBars(); // Réinitialiser les barres de progression
        updateStopInfo();
        document.getElementById('file-selection').style.display = 'none';
        document.title = `mouvàe | ${selectedStop} | Prochains passages`;
        document.getElementById('progress-bars-container').style.display = 'flex';
        document.getElementById('info-container').style.display = 'block';
        startTrafficInfoCycle();
        startDepartureRotation();
        startProgressBars();
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
    displayedTime = new Date();
    displayedTime.setHours(currentHours, currentMinutes, 0, 0);
    currentTimeElement.textContent = `${currentHours}:${currentMinutes}`;

    departureInfoElement.innerHTML = '';

    // Combine departures for the current day
    let allDepartures = departuresData
        .filter(departure => departure.Arret === selectedStop)
        .map(departure => {
            let [hours, minutes] = departure.Heure.split(':').map(Number);
            const departureTime = new Date();
            departureTime.setHours(hours, minutes, 0, 0);
            return { ...departure, departureTime };
        })
        .sort((a, b) => a.departureTime - b.departureTime);

    // Filter departures for the current day only
    const todayDepartures = allDepartures.filter(departure => {
        const departureDate = new Date(departure.departureTime);
        const today = new Date();
        return departureDate.getDate() === today.getDate() && departure.departureTime >= displayedTime;
    });

    const totalDepartures = todayDepartures.length;
    let maxSets = 1;

    if (totalDepartures > 16) {
        maxSets = 3;
    } else if (totalDepartures > 8) {
        maxSets = 2;
    }

    const departuresToShow = todayDepartures.slice(currentDepartureSet * 8, (currentDepartureSet + 1) * 8);

    if (departuresToShow.length === 0 && currentDepartureSet === 0) {
        const item = document.createElement('div');
        item.classList.add('departure-item');
        item.textContent = "Service terminé.";
        departureInfoElement.appendChild(item);
    } else {
        departuresToShow.forEach(departure => {
            const waitTime = (departure.departureTime - displayedTime) / 1000 / 60;
            const waitText = waitTime === 0
                ? "<span class='approaching'>À l'approche</span>"
                : waitTime > 60
                ? `${departure.Heure}`
                : `${Math.round(waitTime)} min`;

            const item = document.createElement('div');
            item.classList.add('departure-item');
            item.innerHTML = `
                <div class="line-box" style="background-color: ${departure.Couleur_fond}; color: ${departure.Couleur_indice};">${departure.Ligne}</div>
                <div class="departure-destination">${departure.Destination}</div>
                <div class="departure-wait-time">${waitText}</div>
            `;
            departureInfoElement.appendChild(item);
        });

        // Add empty lines if there are fewer than 8 departures
        const emptyLines = 8 - departuresToShow.length;
        for (let i = 0; i < emptyLines; i++) {
            const item = document.createElement('div');
            item.classList.add('departure-item');
            item.style.height = '50px'; // Set height for empty lines
            departureInfoElement.appendChild(item);
        }
    }

    // Update progress bars
    startProgressBars(maxSets);
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
    const trafficInfosMouvae = JSON.parse(localStorage.getItem('trafficInfosMouvae')) || [];
    const announcementsMouvae = JSON.parse(localStorage.getItem('announcementsMouvae')) || [];

    function updateInfo() {
        if (trafficInfosMouvae.length > 0 || announcementsMouvae.length > 0) {
            if (index % 2 === 0 && trafficInfosMouvae.length > 0) {
                const info = trafficInfosMouvae[Math.floor(index / 2) % trafficInfosMouvae.length];
                trafficInfoDetails.innerHTML = `
                    <p><strong>Ligne(s) : </strong> ${info.line}</p>
                    <p><strong>Dates : </strong> ${info.date}</p>
                    <p>${info.detail}</p>
                `;
            } else if (announcementsMouvae.length > 0) {
                const announcement = announcementsMouvae[Math.floor(index / 2) % announcementsMouvae.length];
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
    const totalDepartures = departuresData.filter(departure => departure.Arret === selectedStop).length;
    let maxSets = 1;

    if (totalDepartures > 16) {
        maxSets = 3;
    } else if (totalDepartures > 8) {
        maxSets = 2;
    }

    progressInterval = setInterval(() => {
        currentDepartureSet = (currentDepartureSet + 1) % maxSets; // Rotate between sets of departures
        updateStopInfo();
    }, 10000); // Change every 10 seconds
}

function startProgressBars(maxSets) {
    const progressBarsContainer = document.getElementById('progress-bars-container');
    progressBarsContainer.innerHTML = ''; // Clear previous bars

    for (let i = 0; i < maxSets; i++) {
        const progressBar = document.createElement('div');
        progressBar.classList.add('progress-bar');
        const progressBarFill = document.createElement('div');
        progressBarFill.classList.add('progress-bar-fill');
        progressBar.appendChild(progressBarFill);
        progressBarsContainer.appendChild(progressBar);
    }

    const progressBars = document.querySelectorAll('.progress-bar-fill');
    progressBars.forEach((bar, index) => {
        bar.style.width = '0%';
        bar.style.transition = 'width 10s linear'; // Enable smooth transition
        if (index === currentDepartureSet) {
            bar.style.backgroundColor = '#001b69';
            setTimeout(() => {
                bar.style.width = '100%';
            }, 100); // Short delay to restart the animation
        } else {
            bar.style.backgroundColor = '#ccc';
        }
    });

    // Reset and start the progress bar animation
    setTimeout(() => {
        progressBars.forEach((bar, index) => {
            if (index === currentDepartureSet) {
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = '100%';
                }, 100); // Short delay to restart the animation
            }
        });
    }, 10000); // Reset after 10 seconds
}

function resetProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar-fill');
    progressBars.forEach(bar => {
        bar.style.width = '0%';
        bar.style.backgroundColor = '#ccc';
    });
}

// Mettre à jour la date et l'heure toutes les secondes pour un suivi plus précis
setInterval(updateDateTime, 1000);

// Initialisation
updateDateTime();
