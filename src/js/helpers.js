
/*
 * Adjust a list of data for Google Charts plotting
 */

function adjust_for_plotting(N, data)
{
    let data_points = [];
    for(let i = 1; i <= N; i++)
    {
        data_points.push(i);
    }
    
    // create data array
    let plot_data = [];
    plot_data.push(['Position', 'Value']);
    for(let i = 0; i < N; i++)
    {
        plot_data.push([data_points[i], data[i]]);
    }

    return plot_data;
}



function adjust_for_plotly_plotting(data_points) {
    let dataArray = [];
    for(let i = 1; i <= data_points.length; i++) {
        dataArray.push(data_points[i]);
    }
    
    // Separate data into in-order and out-of-order points
    let inOrderX = [];
    let inOrderY = [];
    let outOfOrderX = [];
    let outOfOrderY = [];
    
    dataArray.forEach((value, index) => {
        // Check if value is in its correct position
        // (index+2 due to 1-indexing conversion as mentioned in your comment)
        if (value === (index + 2)) {
            inOrderX.push(index + 1);
            inOrderY.push(value);
        } else {
            outOfOrderX.push(index + 1);
            outOfOrderY.push(value);
        }
    });
    
    // Create separate traces for legend
    let traces = [];
    
    // Add in-order points
    if (inOrderX.length > 0) {
        traces.push({
            x: inOrderX,
            y: inOrderY,
            type: 'scatter',
            mode: 'markers',
            name: 'In Order',
            marker: {
                color: 'blue',
                size: 6
            }
        });
    }
    
    // Add out-of-order points
    if (outOfOrderX.length > 0) {
        traces.push({
            x: outOfOrderX,
            y: outOfOrderY,
            type: 'scatter',
            mode: 'markers',
            name: 'Out of Order',
            marker: {
                color: 'red',
                size: 6
            }
        });
    }
    
    return traces;
}

/*
 * Update the colors of the SWARE buffer
 */

function update_colors() {

    // Reset colors of the SWARE buffer
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


/*
 * Runs after stop button is clicked
 */

function stop_button() {
    running = false;
    document.getElementById("stop-button").disabled = true;
    document.getElementById("continue-button").disabled = false;
    document.getElementById("nextstep-button").disabled = false;

    console.log("Animation stopped.");
}

/*
 * Runs after continue button is clicked
 */

function continue_button() {
    running = true;
    document.getElementById("stop-button").disabled = false;
    document.getElementById("continue-button").disabled = true;
    document.getElementById("nextstep-button").disabled = true;

    let interval = setInterval(() => {
        if (running == false) {
            clearInterval(interval); 
            return;
        }
        next_step(); 
    }, delay);
    console.log("Animation continues.");
}


/*
 * Runs after next step button is clicked
 */

function nextstep_button() {
    running = false;
    next_step();
    console.log("Next step done.")
}

/*
 * Runs after reset button is clicked
 */

function reset_button() {
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

    selectedN;
    selectedK;
    selectedL; 
    selectedB;
    selectedI; 

    wait = 3; 
    delay = 1000; 
    total_data = []; 
    total_inversion_data = [];
    running = true; 

    buffer = [];
    tree = [];
    zones = []; 
    lastSortedIndex = -1; 
    moved = false; 
    partitioned_data = []; 
    state = 0;
    sware_max_tree = Number.MIN_SAFE_INTEGER;
    sware_max_buffer = Number.MIN_SAFE_INTEGER; 
    numInsideBuffer = 0; 
    overlapped; 
    overlapper; 
    overlapperSet = false;
    zones_dict = {}; 

    inserted_data_quit = []; 
    leaf_node_size = 10;
    pole = []; 
    pole_prev = [];
    pole_next = []; 

    sware_sorts = 0;
    sware_sorts_history = [];
    sware_flushes = 0;
    sware_flushes_history = [];
    sware_average_pages_per_flush = 0;
    sware_average_pages_per_flush_history = [];
    sware_bulk_loads = 0;
    sware_bulk_loads_history = [];
    sware_top_inserts = 0;
    sware_top_inserts_history = [];
    quit_fast_inserts = 0;
    quit_fast_inserts_history = [];
    quit_top_inserts = 0;
    quit_top_inserts_history = []; 
    quit_pole_resets = 0;
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
/*
 * Update the history
 */

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

/*
 * Update the table
 */

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


/*
 * Update the charts
 */

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