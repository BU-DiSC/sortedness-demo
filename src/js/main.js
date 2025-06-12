/*
 * Configuration parameters
 */

var selectedN; // stores the N value selected
var selectedK; // stores the K value selected
var selectedL; // stores the L value selected
var selectedB; // stores the B value selected
var selectedI; // stores the I value selected

var wait = 3; // how many iterations we wait before we show index for SWARE algorithm
var delay = 1000; // delay between animations
var total_data = []; // stores the workload data
var total_inversion_data = []; // stores the inversion data
var running = true; // flag to check if animation is running


/* Parameters for the SWARE algorithm */

var buffer = []; //the  buffer 
var tree = []; // the tree
var zones = []; // the zones
var lastSortedIndex = -1; // last sorted index
var moved = false; // used to check if the element is moved
var partitioned_data = []; // partitioned data, 10 elements per partition
var state = 0; // used to decide which step nextStep() will be performed
var sware_max_tree = Number.MIN_SAFE_INTEGER; // stores the max value in the tree
var sware_max_buffer = Number.MIN_SAFE_INTEGER; // stores the max value in the buffer
var numInsideBuffer = 0; // number of elements inside the buffer
var overlapped; // stores the overlapped element
var overlapper; // stores the overlapping element that is added later
var overlapperSet = false; // used when calculating lastSortedIndex
var zones_dict = {}; // dictionary to store the zones


/* Parameters for the QuIT algorithm */

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
    
    // Show the inputs in console
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
        console.log("All parameters valid, generating visualization.");
        
        // Show chart elements
        document.getElementById('chart-column').classList.remove('hidden');
        document.getElementById('run-button-container').classList.remove('hidden');
        
        // Get the data from the imitated server
        running = true;
        let title = "N" + selectedN + "_K" + selectedK + "_L" + selectedL + "_B" + selectedB;
        total_data = map[title];

        // TODO: create a seperate inversion data method
        total_inversion_data = JSON.parse(JSON.stringify(total_data)); 
        
        // Draw charts
        const tickCount = 10;

        // Google charts uses the upper bound when generating 
        // ticks. This function manually creates the ticks 
        // using N. 
        function createTicks(selectedN) {
            let tickArr = [];
            tickArr.push(0);
            let n =  Math.round(selectedN / tickCount);
            for (let i = n; i < selectedN; i += n) {
                tickArr.push(i);
            }
            tickArr.push(selectedN);
    
            return tickArr;
        }
    
        // Adjust data for plotting
        var plot_data = adjust_for_plotting(selectedN, total_data); 
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
        plot_data = adjust_for_plotting(selectedN, total_inversion_data); 
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

