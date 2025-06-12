// Config parameters

var selectedN; // stores the N value selected
var selectedK; // stores the K value selected
var selectedL; // stores the L value selected
var selectedB; // stores the B value selected
var selectedI; // stores the I value selected

var wait = 3; // how many iterations we wait before we show index for SWARE algorithm
var delay = 1000; // delay between animations
var total_data = []; // stores the workload data
var running = true; // flag to check if animation is running


/* Parameters for the SWARE algorithm */

var buffer = []; //the  buffer 
var tree = []; // the tree
var zones = []; // the zones
var lastSortedIndex = -1; // last sorted index
var moved = false; // used to check if the element is moved
var partitioned_data = []; // partitioned data, 10 elements per partition
var state = 0; // used to decide which step nextStep() will be performed
var sware_max = Number.MIN_SAFE_INTEGER; // stores the global max value
var numInsideBuffer = 0; // number of elements inside the buffer
var overlapped; // stores the overlapped element
var overlapper; // stores the overlapping element that is added later
var overlapperSet = false; // used when calculating lastSortedIndex
var zones_dict = {}; // dictionary to store the zones


/* Parameters for the QuIT algorithm */

var quit_max = Number.MIN_SAFE_INTEGER; // stores the global max value
var inserted_data_quit = []; // stores the inserted data
var leaf_node_size = 10; // size of the leaf node
var pole = []; // current pole
var pole_prev = []; // previous pole
let pole_next = []; // next pole

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



/* 
 * Gets called after "Visualize Workload" button is clicked
 */ 
function visualize_workload() {
    console.log("Visualising workload:")

    // parameters
    const minN = 20;
    const maxN = 10000;

    // Get the inputs
    selectedN = parseInt(document.getElementById('cmp-select-N').value);
    selectedK = parseInt(document.getElementById('cmp-select-K').value);
    selectedL = parseInt(document.getElementById('cmp-select-L').value);
    selectedB = parseFloat(document.getElementById('cmp-select-B').value);
    selectedI = parseInt(document.getElementById('cmp-select-I').value);

    let flag = true; // flag to generate graph when parameters are acceptable
    
    // Put the inputs in console
    console.log("Input N:", selectedN);
    console.log("Input K:", selectedK);
    console.log("Input L:", selectedL);
    console.log("Input B:", selectedB);
    
    // Validate all parameters before proceeding
    if (isNaN(selectedN) || selectedN != parseInt(selectedN)) {
        alert("N should be an integer");
        flag = false;
    }
    else if (selectedN < minN || selectedN > maxN) {
        alert("N should be between " + minN + " and " + maxN);
        flag = false;
    }

    if (isNaN(selectedK) || selectedK != parseInt(selectedK)) {
        alert("K should be an integer");
        flag = false;
    }
    else if (selectedK < 0 || selectedK > 100) {
        alert("K should be between 0 and 100");
        flag = false;
    }

    if (isNaN(selectedL) || selectedL != parseInt(selectedL)) {
        alert("L should be an integer");
        flag = false;
    }
    else if (selectedL < 0 || selectedL > 100) {
        alert("L should be between 0 and 100");
        flag = false;
    }

    if (isNaN(selectedB) || selectedB != parseFloat(selectedB)) {
        alert("B should be a float");
        flag = false;
    }
    else if (selectedB < 0 || selectedB > 1) {
        alert("B should be between 0 and 1");
        flag = false;
    }

    if (isNaN(selectedI) || selectedI != parseInt(selectedI)) {
        alert("I should be an integer");
        flag = false;
    }

    // If all parameters are valid, generate the visualization
    if (flag) {
        console.log("All parameters valid, generating visualization");
        
        // Show chart elements
        document.getElementById('chart-column').classList.remove('hidden');
        document.getElementById('run-button-container').classList.remove('hidden');
        
        // Generate data
        running = true;
        total_data = create_data(selectedN, selectedK, selectedL, selectedB);
        total_inversion_data = create_inversion_data(selectedN, selectedI);
        
        // Draw charts
        const tickCount = 10;

        // Google charts uses the upper bound when generating 
        // ticks. This function manually creates the ticks 
        // using N. 
        function createTicks(selectedN) {
            tickArr = [];
            tickArr.push(0);
            let n =  Math.round(selectedN / tickCount);
            for (let i = n; i < selectedN; i += n) {
                tickArr.push(i);
            }
            tickArr.push(selectedN);
    
            return tickArr;
        }
    
        // Adjust data for plotting
        var plot_data = generate_data(selectedN, total_data); 
        //console.log(plot_data);
        var data = google.visualization.arrayToDataTable(plot_data);
        // Options for the graph
        var options = {
            title: "position vs. value comparison (N=" + selectedN +", K=" + selectedK + ", L=" + selectedL + ", B=" + selectedB + ")",
            hAxis: {title: 'Position', minValue: 0, maxValue: selectedN, ticks: createTicks(selectedN)},
            vAxis: {title: 'Value', minValue: 0, maxValue: selectedN, ticks: createTicks(selectedN)},
            legend: 'none',
            explorer: { 
                zoomDelta: 0.8,
            }
        };
        
        // Draw the charts
        var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));
        chart.draw(data, options);
    
        // Adjust data for plotting
        plot_data = generate_data(selectedN, total_inversion_data); 
        //console.log(plot_data);
        data = google.visualization.arrayToDataTable(plot_data);
        // Options for the graph
        var options = {
            title: "example inversions data (N=" + selectedN + ", I=" + selectedI + ")",
            hAxis: {title: 'Position', minValue: 0, maxValue: selectedN, ticks: createTicks(selectedN)},
            vAxis: {title: 'Value', minValue: 0, maxValue: selectedN, ticks: createTicks(selectedN)},
            legend: 'none',
            explorer: { 
                zoomDelta: 0.8,
            }
        };
    
        var chart_inversions = new google.visualization.ScatterChart(document.getElementById('chart_div_inversions'));
        chart_inversions.draw(data, options)

        // Partition the data    
        for (let i = 0; i < total_data.length; i += 10) {
            const part = total_data.slice(i, i + 10);
            partitioned_data.push(part);
        }
        
        // Fill up zones, zones_dict
        for (let i = 0; i < partitioned_data.length; i += 1) {
            const min = Math.min(...partitioned_data[i]);
            const max = Math.max(...partitioned_data[i]);
            zones.push([min, max]);
            zones_dict[max] = partitioned_data[i];
        }
    
    
    } 
    else {
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


    
    state = 2; // buffer is empty initially

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






function update_colors() {
    if (state == 0) {
        // reset the colors
        reset_colors();
    }
    else if (state == 1) {
        reset_colors();
        if (lastSortedIndex == -1) {
            const first = document.getElementById("buffer0");
            first.style.backgroundColor = "#0097B5"; // dark blue (sorted)
        }
        else {
            for (let i = 0; i <= lastSortedIndex; i++) {
                const iter = document.getElementById("buffer" + i);
                if (i % 2 == 0) {
                    iter.style.backgroundColor = "#0097B5"; // dark blue (sorted)
                }
                else {
                    iter.style.backgroundColor = "#00D5FF"; // light blue (sorted)
                }
            }
        }     
    }
    else if (state == 2) {
        reset_colors();
        if (lastSortedIndex == -1) {
            const first = document.getElementById("buffer0");
            first.style.backgroundColor = "#05B51C"; // dark green (sorted)
            const next = document.getElementById("buffer1");
            next.style.backgroundColor = "#FF0000"; // red (overlaps)
            const d = document.getElementById("buffer" + overlapper);
            d.style.backgroundColor = "#FF0000"; // red (overlaps)
        }
        else {
            let i;
            for (i = 0; i <= lastSortedIndex; i++) {
                const iter = document.getElementById("buffer" + i);
                if (i % 2 == 0) {
                    iter.style.backgroundColor = "#05B51C"; // dark green (sorted)
                }
                else {
                    iter.style.backgroundColor = "#00FF22"; // light green (sorted)
                }
            }
            if (i < 10) {
                const overlapped = document.getElementById("buffer" + i);
                overlapped.style.backgroundColor = "#FF0000"; // red (overlaps)
                const d = document.getElementById("buffer" + overlapper);
                d.style.backgroundColor = "#FF0000"; // red (overlaps)
            }
        }     
    }
}

function reset_colors() {
    for (let i = 0; i < 10; i++) {
        const iter = document.getElementById("buffer" + i);
        if (i % 2 == 0) {
            iter.style.backgroundColor = "#808080";
        }
        else {
            iter.style.backgroundColor = "#d3d3d3";
        }
    }
}


function nextStep() {


    
    /*********************************************************/
    /************** QuIT Algorithm Starts Here ***************/
    /*********************************************************/




    /*********************************************************/
    /************** QuIT Algorithm Ends Here *****************/
    /*********************************************************/


    document.getElementById("sware-sorts").innerHTML = sware_sorts;
    document.getElementById("sware-flushes").innerHTML = sware_flushes;
    document.getElementById("sware-average-pages-per-flush").innerHTML = sware_average_pages_per_flush.toFixed(2);
    document.getElementById("sware-bulk-loads").innerHTML = sware_bulk_loads;
    document.getElementById("sware-top-inserts").innerHTML = sware_top_inserts;

    document.getElementById("quit-fast-inserts").innerHTML = quit_fast_inserts;
    document.getElementById("quit-top-inserts").innerHTML = quit_top_inserts;
    document.getElementById("quit-pole-resets").innerHTML = quit_pole_resets;


    update_charts();
}


function stop_animation() {
    running = false;
    document.getElementById("stop-button").disabled = true;
    document.getElementById("continue-button").disabled = false;
    document.getElementById("nextstep-button").disabled = false;

    console.log("Animation stopped.");
}

function continue_animation() {
    running = true;
    document.getElementById("stop-button").disabled = false;
    document.getElementById("continue-button").disabled = true;
    document.getElementById("nextstep-button").disabled = true;

    let interval = setInterval(() => {
        if (running == false) {
            clearInterval(interval); 
            return;
        }
        nextStep(); 
    }, delay);
    console.log("Animation continues.");
}


function nextstep_animation() {
    running = false;
    nextStep();
    console.log("Next step done.")
}
function reset() {
    valsToEliminate = vals.slice();

    function resetDropdown(field, key) {
        field.length = 0;
        let op = document.createElement('option');
        op.value = "";
        op.text = "";
        field.appendChild(op);

        let uniqueValues = [...new Set(valsToEliminate.map(p => p[key]))].sort((a, b) => a - b);
        for (const value of uniqueValues) {
            let op = document.createElement('option');
            op.value = value;
            op.text = value;
            field.appendChild(op);
        }
    }

    // Reset parameters
    buffer = [];
    tree = [];
    lastSortedIndex = -1;
    moved = false;
    partitioned_data = [];
    state = 0; 
    max = Number.MIN_SAFE_INTEGER;
    numInsideBuffer = 0;
    overlapper;
    overlapperSet = false;
    overlapped;
    zones_dict = {};
    running = false;
    delay = 1000;
    wait = 3;
    sware_sorts = 0;
    sware_flushes = 0;
    sware_average_pages_per_flush = 0;
    sware_bulk_loads = 0;
    sware_top_inserts = 0;

    quit_fast_inserts = 0;
    quit_top_inserts = 0;
    quit_pole_resets = 0;

    leaf_node_size = 10;
    pole = [];
    pole_prev = [];
    pole_next = [];

    sware_sorts_history = [];
    sware_flushes_history = [];
    sware_average_pages_per_flush_history = [];
    sware_bulk_loads_history = [];
    quit_fast_inserts_history = [];
    sware_top_inserts_history = [];
    quit_top_inserts_history = [];
    quit_pole_resets_history = [];

    // Reset each dropdown
    resetDropdown(document.getElementById("cmp-select-N"), "N");
    resetDropdown(document.getElementById("cmp-select-K"), "K");
    resetDropdown(document.getElementById("cmp-select-L"), "L");
    resetDropdown(document.getElementById("cmp-select-B"), "B");
    resetDropdown(document.getElementById("cmp-select-I"), "I");

    // Hide elements that should not be visible initially
    document.getElementById("chart-column").classList.add("hidden");
    document.getElementById("buttons-container-wrapper").classList.add("hidden");
    document.getElementById("tree-area-step-3+").classList.add("hidden");
    document.getElementById("buffer-area").classList.add("hidden");
    document.getElementById("dashed-line").classList.add("hidden");
    document.getElementById("run-button-container").classList.add("hidden");
    document.getElementById("results-panel").classList.add("hidden");
    document.getElementById("plots").classList.add("hidden");
    document.getElementById("animations-div").classList.add("hidden");
    // stop_animation(); 

    console.log("Reset to default state.");
}


function update_charts() {
    let plot_data = [];
    let data;

    /* Number of SWARE Sorts vs. Operation Steps Chart */
    plot_data.push(['Operation Steps', 'SWARE']);
    for (let i = 1; i <= sware_sorts_history.length; i++) {
        plot_data.push([i, sware_sorts_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of SWARE Sorts vs. Operation Steps",
        hAxis: {title: 'Operation Steps', minValue: 0, maxValue: sware_sorts_history.length, ticks: 1},
        vAxis: {title: '# of SWARE Sorts', minValue: 0, maxValue: Math.max(...sware_sorts_history), ticks: 1},
        legend: "none",
        explorer: { 
            zoomDelta: 0.8,
        },
        legends: "none",
        colors: ["#80CBC4"]
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-sorts-chart"));
    chart.draw(data, options);


    /* Number of SWARE Flushes vs. Operation Steps Chart */
    plot_data = [];
    plot_data.push(['Operation Steps', '# of SWARE Flushes']);
    for (let i = 1; i <= sware_flushes_history.length; i++) {
        plot_data.push([i, sware_flushes_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of SWARE Flushes vs. Operation Steps",
        hAxis: {title: 'Operation Steps', minValue: 0, maxValue: sware_flushes_history.length, ticks: 1},
        vAxis: {title: '# of SWARE Flushes', minValue: 0, maxValue: Math.max(...sware_flushes_history), ticks: 1},
        legend: "none",
        colors: ["#80CBC4"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-flushes-chart"));
    chart.draw(data, options);
    
    /* Number of Average Pages per SWARE Flush vs. Operation Step Chart */
    plot_data = [];
    plot_data.push(['Operation Steps', '# of Average Pages per SWARE Flush vs. Operation Step Chart']);
    for (let i = 1; i <= sware_average_pages_per_flush_history.length; i++) {
        plot_data.push([i, sware_average_pages_per_flush_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of average pages per SWARE flush vs. Operations Steps",
        hAxis: {title: 'Operation Steps', minValue: 0, maxValue: sware_average_pages_per_flush_history.length, ticks: 1},
        vAxis: {title: '# of SWARE Flushes', minValue: 0, maxValue: Math.max(...sware_average_pages_per_flush_history), ticks: 1},
        legend: "none",
        colors: ["#80CBC4"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-average-pages-per-flush-chart"));
    chart.draw(data, options);

    /* Number of SWARE Bulk Loads / QuIT Fast Inserts vs. Operation Step Chart */
    plot_data = [];
    plot_data.push(['Operation Steps', '# SWARE Bulk Loads', '# QuIT Fast Inserts']);
    for (let i = 1; i <= sware_bulk_loads_history.length; i++) {
        plot_data.push([i, sware_bulk_loads_history[i], quit_fast_inserts_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of SWARE Bulk Loads / QuIT Fast Inserts vs. Operations Steps",
        hAxis: {title: 'Operation Steps', minValue: 0, maxValue: sware_bulk_loads_history.length, ticks: 1},
        vAxis: {title: '# of SWARE Bulk Loads / QuIT Fast Inserts', minValue: 0, maxValue: Math.max(Math.max(...sware_bulk_loads_history), Math.max(...quit_fast_inserts_history)), ticks: 1},
        legend: "none",
        colors: ["#80CBC4", "#FFB433"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-bulk-loads/quit-fast-inserts-chart"));
    chart.draw(data, options);

    /* Number of SWARE Top Inserts / QuIT Top Inserts vs. Operation Steps Chart */
    plot_data = [];
    plot_data.push(['Operation Steps', '# SWARE Top Inserts', '# QuIT Top Inserts']);
    for (let i = 1; i <= sware_top_inserts_history.length; i++) {
        plot_data.push([i, sware_top_inserts_history[i], quit_top_inserts_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of SWARE Top Inserts / QuIT Top Inserts vs. Operations Steps",
        hAxis: {title: 'Operation Steps', minValue: 0, maxValue: sware_top_inserts_history.length, ticks: 1},
        vAxis: {title: '# of SWARE Bulk Loads / QuIT Fast Inserts', minValue: 0, maxValue: Math.max(Math.max(...sware_top_inserts_history), Math.max(...quit_top_inserts_history)), ticks: 1},
        legend: "none",
        colors: ["#80CBC4", "#FFB433"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("sware-top-inserts/quit-top-inserts-chart"));
    chart.draw(data, options);

    /* Number of QuIT Pole Resets Chart */
    plot_data = [];
    plot_data.push(['Operation Steps', '# QuIT Pole Resets']);
    for (let i = 1; i <= quit_pole_resets_history.length; i++) {
        plot_data.push([i, quit_pole_resets_history[i]]);
    }
    data = google.visualization.arrayToDataTable(plot_data);

    var options = {
        title: "Number of QuIT Pole Resets vs. Operations Steps",
        hAxis: {title: 'Operation Steps', minValue: 0, maxValue: quit_pole_resets_history.length.length, ticks: 1},
        vAxis: {title: '# of SWARE Bulk Loads / QuIT Fast Inserts', minValue: 0, maxValue: Math.max(...quit_pole_resets_history), ticks: 1},
        legend: "none",
        colors: ["#FFB433"],
        explorer: { 
            zoomDelta: 0.8,
        }
    };

    var chart = new google.visualization.LineChart(document.getElementById("quit-pole-resets-chart"));
    chart.draw(data, options);



}

function update_history() {
    sware_sorts_history.push(sware_sorts);
    sware_flushes_history.push(sware_flushes);
    sware_average_pages_per_flush_history.push(sware_average_pages_per_flush);
    sware_bulk_loads_history.push(sware_bulk_loads);
    quit_fast_inserts_history.push(quit_fast_inserts);
    sware_top_inserts_history.push(sware_top_inserts);
    quit_top_inserts_history.push(quit_top_inserts);
    quit_pole_resets_history.push(quit_pole_resets);
}

function update_table() {
    document.getElementById("sware-sorts").innerHTML = sware_sorts;
    document.getElementById("sware-flushes").innerHTML = sware_flushes;
    document.getElementById("sware-average-pages-per-flush").innerHTML = sware_average_pages_per_flush;
    document.getElementById("sware-bulk-loads").innerHTML = sware_bulk_loads;
    document.getElementById("quit-fast-inserts").innerHTML = quit_fast_inserts;
    document.getElementById("sware-top-inserts").innerHTML = sware_top_inserts;
    document.getElementById("quit-top-inserts").innerHTML = quit_top_inserts;
    document.getElementById("quit-pole-resets").innerHTML = quit_pole_resets;
}





