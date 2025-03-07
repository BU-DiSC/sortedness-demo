// Essential parameters
var buffer = [];
var tree = [];
var lastSortedIndex = -1;
var moved = false;
var partitioned_data = [];
var stat = 0; // used to decide which step nextStep() will be performed

var max = Number.MIN_SAFE_INTEGER; // used for 
var global_max = Number.MIN_SAFE_INTEGER; //used for printing

var numInsideBuffer = 0;

var destroyer; // stores the overlapping element that is added later
var destroyed; // stores the overlapping element that gets overlapped
var destroyerSet = false; // used when calculating lastSortedIndex

var zonesDict = {};

var running = true;

var delay = 1000; // delay between animations


var wait = 3; // how many iterations we whould wait until index is shown (temporary solution!)

var total_data = [];

var selectedN; // stores the N value selected
var selectedK; // stores the K value selected
var selectedL; // stores the L value selected
var selectedB; // stores the B value selected


var inserted_data_quit = [];




var sware_bulk_loads = 0;
var sware_top_inserts = 0;
var sware_sorts = 0;
var sware_flushes = 0;
var sware_average_pages_per_flush = 0;


var quit_fast_inserts = 0;
var quit_top_inserts = 0;
var quit_pole_resets = 0;


/* 
 * Function to draw the chart
 */ 
function visualize_workload() {

    console.log("Visualising workload:")

    document.getElementById('chart-column').classList.remove('hidden');
    document.getElementById('run-button-container').classList.remove('hidden');

    // parameters
    const minN = 20;
    const maxN = 10000;

    // Get the correct input for N
    selectedN = parseInt(document.getElementById('cmp-select-N').value);

    // Get the correct input for K
    selectedK = parseInt(document.getElementById('cmp-select-K').value);

    // Get the correct input for L
    selectedL = parseInt(document.getElementById('cmp-select-L').value);

    // Get the correct input for B
    selectedB = parseFloat(document.getElementById('cmp-select-B').value);

    let flag = true // flag to generate graph when parameters are acceptable
    
    // Put the inputs in console
    console.log("Input N: " + selectedN);
    console.log("Input K: " + selectedK);
    console.log("Input L: " + selectedL);
    console.log("Input B: " + selectedB);
    
    // Give error when parameters are not acceptable and prevent generating graph
    if (selectedN != parseInt(selectedN)) {
        alert("N should be an integer");
        flag = false;
    }
    else {
        if (selectedN < minN || selectedN >  maxN) {
            alert("N should be between " + minN + " and " + maxN);
            flag = false;
        }
    } 

    if (selectedK != parseInt(selectedK)) {
        alert("K should be an integer");
        flag = false;
    }
    else {
        if (selectedK < 0 || selectedK >  100) {
            alert("K should be between 0 and 100");
            flag = false;
        }
    }

    if (selectedL != parseInt(selectedL)) {
        alert("L should be an integer");
        flag = false;
    }
    else {
        if (selectedL < 0 || selectedL >  100) {
            alert("L should be between 0 and 100");
            flag = false;
        }
    }

    if (selectedB != parseFloat(selectedB)) {
        alert("B should be a float");
        flag = false;
    }
    else {
        if (selectedB < 0 || selectedB >  1) {
            alert("B should be between 0 and 1");
            flag = false;
        }
    }
    // Generate graph when parameters are acceptable
    if (flag == true) { 
        // Generate data
        running = true;  
        total_data = create_data(selectedN, selectedK, selectedL, selectedB);
        draw_chart(total_data, selectedN, selectedK, selectedL, selectedB);
    }
    else {
        console.log("Expecting correct input");
    }
}
function draw_chart(total_data, N, K, L, B) {
    const tickCount = 10;

    // Google charts uses the upper bound when generating 
    // ticks. This function manually creates the ticks 
    // using N. 
    function createTicks(N) {
        tickArr = [];
        tickArr.push(0);
        let n =  Math.round(N / tickCount);
        for (let i = n; i < N; i += n) {
            tickArr.push(i);
        }
        tickArr.push(N);

        return tickArr;
    }

    // Adjust data for plotting
    var plot_data = generate_data(N, total_data); 
    //console.log(plot_data);
    var data = google.visualization.arrayToDataTable(plot_data);
    
    // Options for the graph
    var options = {
        title: "position vs. value comparison (N=" + N +", K=" + K + ", L=" + L + ", B=" + B + ")",
        hAxis: {title: 'Position', minValue: 0, maxValue: N, ticks: createTicks(N)},
        vAxis: {title: 'Value', minValue: 0, maxValue: N, ticks: createTicks(N)},
        legend: 'none',
        explorer: { 
            zoomDelta: 0.8,
        }
    };
    
    // Draw the chart
    var chart = new google.visualization.ScatterChart(document.getElementById('chart_div'));
    chart.draw(data, options);
    
    document.getElementById("stop-button").disabled = false;
    document.getElementById("continue-button").disabled = true;
    document.getElementById("nextstep-button").disabled = true;
}


function run_operations() {

    console.log("Starting to run the algorithm.");

    //document.getElementById('tree-area-step-3+').classList.remove('hidden');
    document.getElementById('buffer-area').classList.remove('hidden');
    document.getElementById('buttons-container').classList.remove('hidden');
    document.getElementById('dashed-line').classList.remove('hidden'); 
    document.getElementById('quit-area').classList.remove("hidden");
    document.getElementById('results-panel').classList.remove("hidden");


    draw_buffer(total_data, selectedN, selectedK, selectedL, selectedB);
    let interval = setInterval(() => {
        if (running == false) {
            clearInterval(interval); 
            return;
        }
        nextStep(); 
    }, delay);
}




function fillTheBuffer() {
    while (zones.length != 0) {
        // end of one cycle
        if (numInsideBuffer == 10) {
            destroyerSet = false;
            for (let i = 0; i < numInsideBuffer; i++) {
                const iter = document.getElementById("buffer" + i);
                iter.innerHTML = buffer[i];
            }

            break;
        }
        else {
            var el = zones.shift();
            buffer.push(el);
            numInsideBuffer++;
            if ((el[0] > max) && (moved == false)) {
                lastSortedIndex++;
                max = el[1];
            }
            // push lastSortedIndex back, to its position
            else {
                if (!destroyerSet) {
                    destroyer = numInsideBuffer - 1;
                    destroyerSet = true;
                }
                for (let i = lastSortedIndex; i >= 0; i--) {
                    if (i == 0) {
                        if ((el[0] > buffer[i][0] && el[0] < buffer[i][1]) || (el[0] < buffer[i][0])) {
                            max = buffer[i][1];
                            lastSortedIndex = i - 1;
                            moved = true;
                            break;
                        }
                    }
                    else {
                        if ((el[0] > buffer[i][0] && el[0] < buffer[i][1]) || (el[0] < buffer[i][0] && el[0] > buffer[i-1][1])) {
                            max = buffer[i][1];
                            lastSortedIndex = i - 1;
                            moved = true;
                            break;
                        }
                    }
                }
            }
        }
    }
}

function adjustColors() {
    if (stat == 0) {
        // reset the colors
        resetColors();
    }
    else if (stat == 1) {
        resetColors();
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
    else if (stat == 2) {
        resetColors();
        if (lastSortedIndex == -1) {
            const first = document.getElementById("buffer0");
            first.style.backgroundColor = "#05B51C"; // dark green (sorted)
            const next = document.getElementById("buffer1");
            next.style.backgroundColor = "#FF0000"; // red (overlaps)
            const d = document.getElementById("buffer" + destroyer);
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
                const destroyed = document.getElementById("buffer" + i);
                destroyed.style.backgroundColor = "#FF0000"; // red (overlaps)
                const d = document.getElementById("buffer" + destroyer);
                d.style.backgroundColor = "#FF0000"; // red (overlaps)
            }
        }     
    }
}

function resetColors() {
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


function draw_buffer(total_data, N, K, L, B) {
    partitioned_data = [];
    zones = [];

    for (let i = 0; i < total_data.length; i += 10) {
        const part = total_data.slice(i, i + 10);
        partitioned_data.push(part);
    }

    for (let i = 0; i < partitioned_data.length; i += 1) {
        const min = Math.min(...partitioned_data[i]);
        const max = Math.max(...partitioned_data[i]);
        zones.push([min, max]);
        zonesDict[max] = partitioned_data[i];
    }
    
    stat = 2;



    nextStep();
}


function nextStep() {

    /* SWARE */
    // if the buffer is full and it is flushing time

    if (stat === 0) {
        if (wait-- == 0) {
            document.getElementById("tree-area-step-3+").classList.remove("hidden");
        }
        // flushing operations
        if (buffer.length != 10) {
            running = false;
        }
        else {
            if (lastSortedIndex == -1) {
                tree.push(buffer[0]);
                const lastTreeElement = document.getElementById("last-tree");
                if (buffer[0][1] > global_max) {
                    global_max = buffer[0][1];
                    lastTreeElement.innerHTML = "(... , " + global_max + ")";

                }
                else {
                    // Trigger the glow effect (top insert)
                    const circle = document.getElementById('circle');
                    circle.classList.add('glow-active');
                        
                    setTimeout(() => {
                        circle.classList.remove('glow-active');
                    }, 300);      
                }
                //lastTreeElement.innerHTML = "" + buffer[0];
                buffer.shift();

                // Trigger the glow effect
                                
            }
            else if (lastSortedIndex < 5) {
                for (let j = 0; j <= lastSortedIndex; j++) {
                    tree.push(buffer[j]);
                }
                const lastTreeElement = document.getElementById("last-tree");
                if (buffer[lastSortedIndex][1] > global_max) {
                    global_max = buffer[lastSortedIndex][1];
                    lastTreeElement.innerHTML = "(... , " + global_max + ")";
                }
                else {
                    // Trigger the glow effect (top insert)
                    const circle = document.getElementById('circle');
                    circle.classList.add('glow-active');
                    
                    setTimeout(() => {
                        circle.classList.remove('glow-active');
                    }, 300);
                }
                //lastTreeElement.innerHTML = "" + buffer[lastSortedIndex];
                buffer.splice(0, lastSortedIndex + 1);


            }
            else {
                for (let j = 0; j < 5; j++) {
                    tree.push(buffer[j]);
                }
                const lastTreeElement = document.getElementById("last-tree");
                if (buffer[lastSortedIndex][1] > global_max) {
                    global_max = buffer[lastSortedIndex][1];
                    lastTreeElement.innerHTML = "(... , " + global_max + ")";
                }
                else {
                    // Trigger the glow effect (top insert)
                    const circle = document.getElementById('circle');
                    circle.classList.add('glow-active');
                    
                    setTimeout(() => {
                        circle.classList.remove('glow-active');
                    }, 300);
                }
                //lastTreeElement.innerHTML = "" + buffer[4];
                buffer.splice(0, 5);
            } 

            // update HTMLs to show buffer after flush
            for (let i = 0; i < buffer.length; i++) {
                const iter = document.getElementById("buffer" + i);
                iter.innerHTML = buffer[i];
            }    

            for (let i = buffer.length; i < 10; i++) {
                const iter = document.getElementById("buffer" + i);
                iter.innerHTML = "";
            }
        }

        adjustColors();
       
        stat = 1;
    }
    // sort the remainder
    else if (stat == 1) {
        
        let remainingPages = [];

        for (let i = 0; i < buffer.length; i++) {
            remainingPages = remainingPages.concat(zonesDict[buffer[i][1]]);
        }

        remainingPages.sort((a, b) => a - b);

        partitioned_data = [];
        buffer = [];
    
        for (let i = 0; i < remainingPages.length; i += 10) {
            const part = remainingPages.slice(i, i + 10);
            partitioned_data.push(part);
        }
        
        for (let i = 0; i < partitioned_data.length; i += 1) {
            const min = Math.min(...partitioned_data[i]);
            const max = Math.max(...partitioned_data[i]);
            buffer.push([min, max]);
            zonesDict[max] = partitioned_data[i];
        }

        for (let i = 0; i < buffer.length; i++) {
            const iter = document.getElementById("buffer" + i);
            iter.innerHTML = buffer[i];
        }   

        lastSortedIndex = buffer.length - 1;
        numInsideBuffer = buffer.length;
        max = buffer[buffer.length-1][1];

        adjustColors();

        stat = 2;
    }
    // fill the buffer
    else if (stat == 2) {

        fillTheBuffer();

        adjustColors();

        stat = 0;

    }
    

    /* QuIT */
    /*
    function isOutlier(n) {
        // IQR estimation (temporary solution)
        if (!inserted_data_quit || inserted_data_quit.length < 4) {
            console.log("Insufficient data for outlier detection.");
            return false; // Not enough data to determine outliers
        }
    
        // Sort the data
        const sortedData = [...inserted_data_quit].sort((a, b) => a - b);
        const len = sortedData.length;
    
        // Calculate Q1 and Q3
        const Q1 = sortedData[Math.floor((len / 4))];
        const Q3 = sortedData[Math.floor((3 * len / 4))];
    
        // Calculate IQR
        const IQR = Q3 - Q1;
    
        // Determine lower and upper bounds
        const lowerBound = Q1 - 1.5 * IQR;
        const upperBound = Q3 + 1.5 * IQR;
    
        console.log(`Q1: ${Q1}, Q3: ${Q3}, IQR: ${IQR}`);
        console.log(`Lower Bound: ${lowerBound}, Upper Bound: ${upperBound}`);
        console.log(`Checking if ${n} is an outlier.`);
    
        // Check if n is an outlier
        if (n < lowerBound || n > upperBound) {
            console.log(`${n} is an outlier.`);
            return true;
        } else {
            console.log(`${n} is not an outlier.`);
            return false;
        }
        
    }
    */

    function isOutlierZ(n) {
        if (!inserted_data_quit || inserted_data_quit.length < 4) {
            console.log("Insufficient data for outlier detection.");
            return false;
        }
    
        // Calculate mean
        const mean = inserted_data_quit.reduce((sum, x) => sum + x, 0) / inserted_data_quit.length;
    
        // Calculate standard deviation
        const variance = inserted_data_quit.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / inserted_data_quit.length;
        const stdDev = Math.sqrt(variance);
    
        // Calculate Z-score
        const zScore = Math.abs((n - mean) / stdDev);
    
        console.log(`Mean: ${mean}, StdDev: ${stdDev}, Z-Score of ${n}: ${zScore}`);
    
        // Use a threshold of 1.5 for higher sensitivity
        if (zScore > 1.5) {
            console.log(`${n} is an outlier (Z-Score).`);
            return true;
        } else {
            console.log(`${n} is not an outlier (Z-Score).`);
            return false;
        }
    }
    

    // Start state (can't shift, will input everything)

    let page;

    if (total_data.length == selectedN) {
        page = total_data[0];
        total_data.shift();
        for (let i = 0; i < 15; i++) {
            const p = document.getElementById("page" + i);
            p.innerHTML = total_data[i];
            total_data.shift();
        }
    }
    // Not the start state
    else {
        // Fill the data stream, shift everything left
        page = document.getElementById("page0").innerHTML;
        console.log(page);
        let page_i;
        for (page_i = 0; page_i < 14; page_i++) {
            const p = document.getElementById("page" + page_i);
            const page_next = document.getElementById("page" + (page_i + 1));
            p.innerHTML = page_next.innerHTML;
        }

        const last_p = document.getElementById("page" + page_i);
        last_p.innerHTML = total_data[0];
        total_data.shift();
    }

    page = parseInt(page);

    inserted_data_quit.push(page);

    if (isOutlierZ(page)) {
        let random_x = Math.floor(Math.random() * 81) + 10;
        document.getElementById("pole").style.left = random_x + "%";
    }
    
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
    stat = 0; 
    max = Number.MIN_SAFE_INTEGER;
    numInsideBuffer = 0;
    destroyer;
    destroyerSet = false;
    destroyed;
    zonesDict = {};
    running = false;
    delay = 1000;
    wait = 3;
    sware_bulk_loads = 0;
    sware_top_inserts = 0;
    sware_sorts = 0;
    sware_flushes = 0;
    sware_average_pages_per_flush = 0;
    quit_fast_inserts = 0;
    quit_top_inserts = 0;
    quit_pole_resets = 0;


    // Reset each dropdown
    resetDropdown(document.getElementById("cmp-select-N"), "N");
    resetDropdown(document.getElementById("cmp-select-K"), "K");
    resetDropdown(document.getElementById("cmp-select-L"), "L");
    resetDropdown(document.getElementById("cmp-select-B"), "B");

    // Hide elements that should not be visible initially
    document.getElementById("chart-column").classList.add("hidden");
    document.getElementById("buttons-container").classList.add("hidden");
    document.getElementById("tree-area-step-3+").classList.add("hidden");
    document.getElementById("buffer-area").classList.add("hidden");
    document.getElementById("dashed-line").classList.add("hidden");
    document.getElementById("run-button-container").classList.add("hidden");
    document.getElementById('quit-area').classList.add("hidden");
    document.getElementById("results-panel").classList.add("hidden");

    // stop_animation(); 

    console.log("Reset to default state.");
}

