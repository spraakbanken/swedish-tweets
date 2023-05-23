
// index in the DATA elements
const [dDate, dTweets, dToxicity, dWords] = [0, 1, 2, 3];
const MIN_MAX = ['min', 'max'];

function buildDataset(label, color, yaxis, yfunction) {
    return {
        label: label,
        yAxisID: yaxis,
        data: DATA.map((d, k) => ({x: Date.parse(d[dDate]), y: yfunction(k)})),
        backgroundColor: color,
        borderColor: color,
    }
}

function dataAverage(key, center, window) {
    window = Math.round(window);
    let sum = 0, count = 0;
    for (let k = center - window; k <= center + window; k++) {
        if (0 <= k && k < DATA.length) {
            sum += DATA[k][key];
            count++;
        }
    }
    return sum / count;
}


const config = {
    type: 'line',
    options: {
        parsing: false,
        animation: false,
        aspectRatio: 3/2,
        plugins: {},
    },
};

config.options.elements = {
    point: {
        radius: 0,
        borderWidth: 1,
    },
    line: {
        tension: 0.3,
        borderWidth: 1,
    },
};

config.options.scales = {
    x: {
        type: 'time',
        time: {
            unit: 'day',
            displayFormats: {
                day: 'yyyy-MM-dd'
            },
            tooltipFormat: 'd MMM yyyy'
        }
    },
    yleft: {
        type: 'linear',
        position: 'left',
        min: 75000,
        ticks: {stepSize: 25000},
        max: 300000,
    }, 
    yright: {
        type: 'linear',
        position: 'right',
        min: 0.8,
        max: 1.5,
        grid: {display: false},
    },
};

config.options.interaction = {
    intersect: false,
    mode: 'index',
};

config.options.onClick = (evt, elems) => updateDateInfo(elems[0].index);

config.options.plugins.decimation = {
    // enabled: true,
    algorithm: 'lttb',
    samples: 200,
    threshold: 100,
};

config.options.plugins.zoom = {
    zoom: {
        wheel: {enabled: true},
        pinch: {enabled: true},
        mode: 'x',
        onZoomComplete: ({chart}) => updateDateRange(chart),
    },
    pan: {
        enabled: true,
        mode: 'x',
        onPanComplete: ({chart}) => updateDateRange(chart),
    },
    limits: {
        x: {
            min: 'original', 
            max: 'original',
            minRange: 30 * 24 * 60 * 60 * 1000,
        },
    }
};

config.options.plugins.tooltip = {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    callbacks: {
        label: (cxt) => {
            let k = cxt.dataIndex;
            switch (cxt.datasetIndex) {
                case 0: return `${DATA[k][dTweets]} tweets`;
                case 1: return `${DATA[k][dToxicity]/100} toxicitet`;
            }
        },
        footer: (cxt) => {
            let k = cxt[0].dataIndex;
            return DATA[k][dWords].map((w) => w[0]);
        }
    }
};


function updateZoom(chart) {
    let range = getDateRange();
    chart.zoomScale('x', range);
    updateChart(chart);
}

function getDateRange() {
    let range = {};
    for (let key of MIN_MAX) {
        range[key] = Date.parse(document.getElementById(`range-${key}`).value);
    }
    return range;
}

function updateDateRange(chart) {
    for (let key of MIN_MAX) {
        let date = new Date(chart.scales.x[key]);
        let datestr = date.toISOString().substring(0, 10);
        document.getElementById(`range-${key}`).value = datestr;
    }
    updateChart(chart);
}

function updateChart(chart, reset=false) {
    let range = getDateRange();
    let days = Math.round((range.max-range.min) / (1000 * 60 * 60 * 24));
    document.getElementById('range-days').innerText = days;
    
    let per_mille_window = parseInt(document.getElementById('average-window').value);
    let window_size = days * per_mille_window / 1000;
    chart.data.datasets = [
        buildDataset('antal tweets', 'green', 'yleft', (k) => Math.round(dataAverage(dTweets, k, window_size))),
        buildDataset('toxicitet', 'red', 'yright', (k) => dataAverage(dToxicity, k, window_size) / 100),
    ];
    if (reset) chart.resetZoom();
    chart.update();
}

function updateDateInfo(k) {
    document.getElementById('selected-date').innerText = DATA[k][dDate];
    document.getElementById('date-tweets').innerText = DATA[k][dTweets];
    document.getElementById('date-toxicity').innerText = DATA[k][dToxicity]/100;
    let wordlist = document.getElementById('date-words');
    wordlist.innerHTML = `<tr><th>LMI</th><th>antal</th><th>ord</th></tr>`;
    for (let [word, lmi, count] of DATA[k][dWords]) {
        // lmi = Math.round(lmi/100);
        let item = document.createElement("tr");
        wordlist.innerHTML += `<tr><td>${lmi}</td><td>${count}</td><td>${word}</td></tr>`;
        wordlist.appendChild(item);
    }
};

function zoomChart(chart, zoom) {
    if (zoom === '--') {
        chart.resetZoom();
    } else if (zoom === '-') {
        chart.zoom(0); // this doubles the date range
    } else if (zoom === '+') {
        chart.zoom(1.5); // this halves the date range
    } else if (zoom === '++') {
        chart.zoom(9999);
    }
    updateDateRange(chart);
}


window.addEventListener('DOMContentLoaded', () => {
    let chart = new Chart('chart', config);    
    for (let key of MIN_MAX)
        document.getElementById(`range-${key}`).addEventListener('change', () => updateZoom(chart));
    for (let elem of document.getElementsByClassName('zoom-button')) 
        elem.addEventListener('click', (evt) => zoomChart(chart, evt.target.value));
    document.getElementById('average-window').addEventListener('change', () => updateChart(chart));
    updateChart(chart, reset=true);
});
