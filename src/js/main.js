/*
 * Configuration parameters
 */

var selectedN; // stores the N value selected
var selectedK; // stores the K value selected
var selectedL; // stores the L value selected
var selectedB; // stores the B value selected
var selectedA; // stores the A value selected
var selectedE; // stores the E value selected

var wait = 3;                    // how many iterations we wait before we show index for SWARE algorithm
var delay = 1000;                // delay between animations
var total_data = [];            // stores the workload data
var total_exchanges_data = [];  // stores the exchanges data
var running = true;             // flag to check if animation is running

/* Parameters for the SWARE algorithm */

var buffer = [];                      // the buffer
var tree = [];                        // the tree
var zones = [];                       // the zones
var lastSortedIndex = -1;             // last sorted index
var moved = false;                    // used to check if the element is moved
var partitioned_data = [];            // partitioned data, 10 elements per partition
var state = 0;                        // used to decide which step nextStep() will be performed
var sware_max_tree = Number.MIN_SAFE_INTEGER;   // stores the max value in the tree
var sware_max_buffer = Number.MIN_SAFE_INTEGER; // stores the max value in the buffer
var numInsideBuffer = 0;             // number of elements inside the buffer
var overlapped;                      // stores the overlapped element
var overlapper;                      // stores the overlapping element that is added later
var overlapperSet = false;           // used when calculating lastSortedIndex
var zones_dict = {};                 // dictionary to store the zones

/* Parameters for the QuIT algorithm */

var inserted_data_quit = []; // stores the inserted data
var leaf_node_size = 10;     // size of the leaf node
var pole = [];                // current pole
var pole_prev = [];           // previous pole
let pole_next = [];           // next pole

/* Parameters for the charts */

var sware_sorts = 0;
var sware_sorts_history = [];
var sware_flushes = 0;
var sware_flushes_history = [];
var sware_average_pages_per_flush = 0;
var sware_average_pages_per_flush_history = [];
var sware_bulk_loads = 0;
var sware_bulk_loads_history = [];
var sware_top_inserts = 0;
var sware_top_inserts_history = [];
var quit_fast_inserts = 0;
var quit_fast_inserts_history = [];
var quit_top_inserts = 0;
var quit_top_inserts_history = [];
var quit_pole_resets = 0;
var quit_pole_resets_history = [];
var exchangesDatasets = [];
var klDatasets = [];

// array that holds the field user inputted
// order is [n,k,l,b,exchanges]
var inputedDataE = [];
var inputedDatakl = [];
var totalCharts = 0;

/*
 * Gets called after "Generate Workload" button is clicked
 */
function visualize_workload() {
    console.log("Visualising workload:");

    // parameters
    const minN = 20;
    const maxN = 100000;

    // Get the inputs
    selectedN = parseInt(document.getElementById('cmp-select-N').value);
    selectedK = parseFloat(document.getElementById('cmp-select-K').value);
    selectedL = parseFloat(document.getElementById('cmp-select-L').value);
    selectedB = parseFloat(document.getElementById('cmp-select-B').value);
    selectedA = parseFloat(document.getElementById('cmp-select-A').value);
    // selectedE = parseInt(document.getElementById('cmp-select-E').value);

    let flag = true; // flag to generate graph when parameters are acceptable

    // Show the inputs in console
    console.log("Input N:", selectedN);
    console.log("Input K:", selectedK);
    console.log("Input L:", selectedL);
    console.log("Input B:", selectedB);

    // Validate all parameters before proceeding
    if (isNaN(selectedN) || selectedN !== parseInt(selectedN)) {
        alert("N should be an integer");
        flag = false;
    } else if (selectedN < minN || selectedN > maxN) {
        alert("N should be between " + minN + " and " + maxN);
        flag = false;
    }

    if (isNaN(selectedK)) {
        alert("K should be a number");
        flag = false;
    } else if (selectedK < 0 || selectedK > 100) {
        alert("K should be between 0 and 100");
        flag = false;
    }

    if (isNaN(selectedL)) {
        alert("L should be a number");
        flag = false;
    } else if (selectedL < 0 || selectedL > 100) {
        alert("L should be between 0 and 100");
        flag = false;
    }

    if (isNaN(selectedB) || selectedB !== parseFloat(selectedB)) {
        alert("B should be a float");
        flag = false;
    } else if (selectedB < 0) {
        alert("B should be greater than 0");
        flag = false;
    }

    /*
    if (isNaN(selectedE) || selectedE !== parseInt(selectedE)) {
        alert("E should be an integer");
        flag = false;
    }
    // verification to make sure data generation won't break
    if (flag) {
        if (selectedE > (selectedN / 2)) {
            alert("Exchange value is too large for the N value");
            flag = false;
        }
    }
    */

    // If all parameters are valid, generate the visualization
    if (flag) {
        console.log("All parameters valid, generating visualization.");

        // Show chart elements
        document.getElementById('chart-column').classList.remove('hidden');

        // Get the data from the imitated server
        running = true;
        selectedE = Math.round((selectedN * selectedK) / 200);
        let title = "N" + selectedN + "_K" + selectedK + "_L" + selectedL + "_B" + selectedB;
        var tempArray = [selectedN, selectedK, selectedL, selectedB, selectedE, selectedA];
        inputedDataE.push(tempArray);
        inputedDatakl.push(tempArray);
        total_data = generate(Math.round((selectedN * selectedK) / 100), Math.round(selectedN * selectedL / 100),
            selectedN, selectedB, selectedA);
        klDatasets.push(total_data);
        // TODO: make exchanges method more randomized
        total_exchanges_data = generateInversion(selectedN, selectedE);
        exchangesDatasets.push(total_exchanges_data);

        // Draw charts
        const tickCount = 10;

        // Google charts uses the upper bound when generating 
        // ticks. This function manually creates the ticks 
        // using N.
        function createTicks(selectedN) {
            let tickArr = [];
            tickArr.push(0);
            let n = Math.round(selectedN / tickCount);
            for (let i = n; i < selectedN; i += n) {
                tickArr.push(i);
            }
            tickArr.push(selectedN);
            return tickArr;
        }

        let graphCount;
        // remove previously drawn graphs and redraw them all
        document.getElementById("klCharts").innerHTML = '';
        document.getElementById("inversionCharts").innerHTML = '';
        // Force button visibility
        document.getElementById('chart-column').classList.remove('hidden');
        let runBtn;
        
        //draw kl charts most recently created chart is drawn first
        for (let i = klDatasets.length - 1; i >= 0; i--) {
            // Adjust data for plotting, k-l data
            var plot_data = adjust_for_plotly_plotting(klDatasets[i]);
            // Options for the graph
            const layout = {
                title: {
                    text: "K-L Metric",
                    font: {
                        size: 14,           // Smaller size (default is usually 17-18)
                        family: 'Arial',
                    }
                },
                width: 500,
                height: 500,
                margin: {
                    l: 60,
                    r: 40,
                    t: 40,
                    b: 100
                },
                xaxis: {
                    title: 'position',
                    range: [0, null],
                    automargin: true
                },
                yaxis: {
                    title: 'value',
                    range: [0, null],
                    automargin: true
                },
                legend: {
                    orientation: 'h',
                    x: 0.2,
                    y: 1.05,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: 'black',
                    borderwidth: 0
                },
                showlegend: true,
                annotations: [{
                    text: "(N=" + inputedDatakl[i][0] + ", K=" + inputedDatakl[i][1]
                        + ", L=" + inputedDatakl[i][2] + ", B=" + inputedDatakl[i][3] + ", A=" + inputedDatakl[i][5] + ")",
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: -0.15,
                    xanchor: 'center',
                    yanchor: 'top',
                    showarrow: false,
                    font: {
                        size: 14,
                        family: 'Arial'
                    }
                }]
            };
            
            const config = {
                responsive: true         // Enable responsive behavior
            };

            // Draw the charts
            let deleteButton = document.createElement("button");
            deleteButton.classList.add("deleteButton");
            deleteButton.textContent = "✖";
            deleteButton.onclick = function() {
                let wrapper = deleteButton.parentNode;
                klDatasets.splice(parseInt(wrapper.id), 1);
                inputedDatakl.splice(parseInt(wrapper.id), 1);
                wrapper.remove();
            };
            let klChartWrapper = document.createElement("div");
            klChartWrapper.style.position = "relative";
            klChartWrapper.id = i;
            let klChart = document.createElement("div");
            klChart.id = "chart_div" + i;
            klChart.classList.add("equal-height", "chart_div");
            klChart.style.width = "100%";
            klChart.style.height = "500px";
            klChart.style.minHeight = "500px";
            klChart.style.padding = "0px";
            klChartWrapper.appendChild(klChart);
            document.getElementById("klCharts").appendChild(klChartWrapper);
            Plotly.newPlot("chart_div" + i, plot_data, layout, config);
            klChartWrapper.appendChild(deleteButton);
        }
        
        //draw inversions charts, most recently created chart is drawn first
        for (let i = exchangesDatasets.length - 1; i >= 0; i--) {
            // Adjust data for plotting, k-l data
            var plot_data = adjust_for_plotly_plotting(exchangesDatasets[i]);
            // Options for the graph
            const layout = {
                title: {
                    text: "Exchanges",
                    font: {
                        size: 14,           // Smaller size (default is usually 17-18)
                        family: 'Arial',
                    }
                },
                //autosize:true,
                width: 500,
                height: 500,
                margin: {
                    l: 60,
                    r: 40,
                    t: 40,
                    b: 100
                },
                xaxis: {
                    title: 'position',
                    //scaleanchor:'y',
                    //scaleratio:0.3,
                    range: [0, null],
                    automargin: true
                },
                yaxis: {
                    title: 'value',
                    range: [0, null],
                    automargin: true
                },
                legend: {
                    x: 0.2,
                    y: 1.05,
                    orientation: 'h',
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: 'black',
                    borderwidth: 0
                },
                showlegend: true,
                annotations: [{
                    text: "(N=" + inputedDataE[i][0] + ", E=" + inputedDataE[i][4] + ")",
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: -0.15,
                    xanchor: 'center',
                    yanchor: 'top',
                    showarrow: false,
                    font: {
                        size: 14,
                        family: 'Arial'
                    }
                }]
            };

            const config = {
                responsive: true         // Enable responsive behavior
            };

            // Draw the charts
            let deleteButton = document.createElement("button");
            deleteButton.classList.add("deleteButton");
            deleteButton.textContent = "✖";
            deleteButton.onclick = function() {
                let wrapper = deleteButton.parentNode;
                exchangesDatasets.splice(parseInt(wrapper.id), 1);
                inputedDataE.splice(parseInt(wrapper.id), 1);
                wrapper.remove();
            };

            let inversionChartWrapper = document.createElement("div");
            inversionChartWrapper.style.position = "relative";
            inversionChartWrapper.id = i;
            let inversionChart = document.createElement("div");
            inversionChart.id = "inversion_chart_div" + i;
            inversionChart.classList.add("equal-height", "chart_div");
            inversionChart.style.width = "100%";
            inversionChart.style.height = "500px";
            inversionChart.style.minHeight = "500px";
            inversionChart.style.padding = "0px";
            inversionChartWrapper.appendChild(inversionChart);
            document.getElementById("inversionCharts").appendChild(inversionChartWrapper);
            Plotly.newPlot("inversion_chart_div" + i, plot_data, layout, config);
            inversionChartWrapper.appendChild(deleteButton);
        }

        document.getElementById("runBtn").classList.remove("hidden");
        document.getElementById("run-button-contain").classList.remove("hidden");

        // Partition the data    
        for (let i = 0; i < total_data.length; i += 10) {
            const part = total_data.slice(i, i + 10);
            partitioned_data.push(part);
        }

        // Fill up zones, zones_dict
        for (let i = 0; i < partitioned_data.length; i++) {
            const min = Math.min(...partitioned_data[i]);
            const max = Math.max(...partitioned_data[i]);
            zones.push([min, max]);
            zones_dict[max] = partitioned_data[i];
        }

    } else {
        console.log("Invalid parameters detected, visualization aborted");
    }
}

/*
 * Gets called after "Run" button is clicked
 */
function run_operations() {
    console.log("Starting to run the algorithm.");

    // Show hidden divs
    document.getElementById('buffer-area').classList.remove('hidden');
    document.getElementById('buttons-container-wrapper').classList.remove('hidden');
    document.getElementById('dashed-line').classList.remove('hidden');
    document.getElementById('quit-area').classList.remove("hidden");
    document.getElementById('results-panel').classList.remove("hidden");
    document.getElementById('plots').classList.remove("hidden");
    document.getElementById('animations-div').classList.remove("hidden");

    document.getElementById("stop-button").disabled = false; // enable stop button
    document.getElementById("continue-button").disabled = true; // disable continue button
    document.getElementById("nextstep-button").disabled = true; // disable nextstep button

    state = 2; // SWARE buffer is empty initially

    // The main loop
    let interval = setInterval(() => {
        if (running == false) {
            clearInterval(interval);
            return;
        }
        next_step();
    }, delay);
}

//Function for the data.html file
function run2_operations() {
    console.log("Starting to run the algorithm.");

    // Show hidden divs
    document.getElementById('plots').classList.remove("hidden");

    document.getElementById("stop-button").disabled = false; // enable stop button
    document.getElementById("continue-button").disabled = true; // disable continue button
    document.getElementById("nextstep-button").disabled = true; // disable nextstep button

    state = 2; // SWARE buffer is empty initially

    // The main loop
    let interval = setInterval(() => {
        if (running == false) {
            clearInterval(interval);
            return;
        }
        next_step();
    }, delay);
}

/*
 * Runs one step of both algorithms and updates the UI
 */
function next_step() {
    sware();
    quit();
    update_history();
    update_table();
    update_charts();
}

function generateSources(n, k, taken) {
    let count = 0;
    let sources = new Array();
    let r;
    while (count < Math.floor(k / 2)) {
        r = Math.floor(Math.random() * n) + 1;
        if (taken.get(r) === true) {
            taken.set(r, false);
            sources.push(r);
            count++;
        }
    }
    return sources;
}

function swapElements(array, x, y) {
    let temp;
    temp = array[x];
    array[x] = array[y];
    array[y] = temp;
}

//returns a array with numbers of (k-l) sortedness
function generate(k, l, n, b, a) {
    l--;
    let array = [];
    let betaValue;
    for (let i = 1; i < n + 1; i++) {
        array.push(i);
    }
    let firstSwap;
    let max, min;
    let betaIndex = 0;
    let taken = new Map();
    let sources = new Array();
    let swappingFirst = true;
    let randomPick;
    //precautionary so no value not in array is swapped
    taken.set(0, false);
    taken.set(n + 1, false);
    //set all array indexes to true because you can swap with any of them
    for (let i = 0; i < n; i++) {
        taken.set(i, true);
    }
    //swap first element by l to ensure there is a max displacement of l
    if (k < 2) {
        swappingFirst = false;
    }
    while (swappingFirst) {
        if (Math.random() < 0.5) {
            firstSwap = Math.floor((n - l) * Math.random());
            if (firstSwap + l < n && taken.get(firstSwap) && taken.get(firstSwap + l)) {
                swapElements(array, firstSwap, firstSwap + l);
                taken.set(firstSwap, false);
                taken.set(firstSwap + l, false);
                swappingFirst = false;
                console.log("firstSwap: " + firstSwap, firstSwap + l);
            }
        }
        else {
            firstSwap = l + Math.floor((n - l) * Math.random());
            if (firstSwap - l > 1 && taken.get(firstSwap) && taken.get(firstSwap - l)) {
                swapElements(array, firstSwap, firstSwap - l);
                taken.set(firstSwap, false);
                taken.set(firstSwap - l, false);
                swappingFirst = false;
                console.log("firstSwap: " + firstSwap, firstSwap - l);
            }
        }
    }
    //indexes of elements we will swap
    let regenerateCount = 0;
    sources = generateSources(n, k - 2, taken);
    console.log(sources.length, n);
    while (sources.length != 0 && regenerateCount < 5000) {
        console.log("length: " + sources.length);
        for (let j = 0; j < (n / 100) && sources.length != 0; j++) {
            for (let i = 0; i < sources.length; i++) {
                min = Math.max(0, sources[i] - l);
                max = Math.min(n - 1, sources[i] + l);
                betaValue = jStat.beta.sample(a, b);
                if (Math.random() < 0.5) {
                    randomPick = Math.floor(sources[i] - (sources[i] - min) * betaValue);
                }
                else {
                    randomPick = Math.floor(sources[i] + (max - sources[i]) * betaValue);
                }
                //console.log(randomPick);
                if (taken.get(randomPick) && randomPick != sources[i]) {
                    swapElements(array, sources[i], randomPick);
                    taken.set(randomPick, false);
                    taken.set(sources[i], false);
                    sources.splice(i, 1);
                    i--;
                }
            }
        }
        console.log("regenerate");
        regenerateCount++;
        for (let i = 0; i < sources.length; i++) {
            taken.set(sources[i], true);
        }
        sources = generateSources(n, (2 * sources.length), taken);
    }
    console.log("final: " + sources.length);
    for (let i = Math.max(0, sources[0] - l); i < Math.min(n - 1, sources[0] + l); i++) {
        if (taken.get(i)) {
            console.log("index: ", i, "value: ", array[i]);
        }
    }
    //if odd n swap element that has already been swapped with an element that hasn't already been swapped
    if (k % 2 == 1) {
        let odd = Math.floor(Math.random() * n);
        while (taken.get(odd) && odd > 0) {
            odd = Math.floor(Math.random() * n);
        }
        min = Math.max(1, odd - l);
        max = Math.min(n, odd + l);
        betaValue = jStat.beta.sample(a, b);
        let oddSwap;
        oddSwap = Math.floor(min + (max - min) * betaValue);
        while (!taken.get(oddSwap) && !((Math.abs(array[odd] - odd)) < l) && !((Math.abs(array[oddSwap] - oddSwap)) < l)) {
            betaValue = jStat.beta.sample(a, b);
            oddSwap = Math.floor(min + (max - min) * betaValue);
        }
        swapElements(array, odd, oddSwap);
    }
    return array;
}

//returns array of length n with i inversionss
function generateInversion(n, i) {
    let array = [];
    let inversions = i;
    for (let a = 1; a < n + 1; a++) {
        array.push(a);
    }
    /*
    let insertPos;
    for(let i = n;i>0;i--)
    {
        insertPos = Math.min(array.length,inversions);
        //add element to array
        array.splice(insertPos,0,i);
        inversions-=insertPos;
    }
    return array;
    */
    let taken = new Map();
    //precautionary so no value not in array is swapped
    taken.set(0, false);
    taken.set(n + 1, false);
    for (let a = 1; a < n + 1; a++) {
        taken.set(a, true);
    }

    let sources1 = generateSources(n, 2 * inversions, taken);
    let sources2 = generateSources(n, 2 * inversions, taken);
    for (let a = 0; a < inversions; a++) {
        swapElements(array, sources1[a], sources2[a])
    }
    return array;
}