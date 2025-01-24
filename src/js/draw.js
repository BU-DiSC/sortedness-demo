// Essential parameters
var buffer = [];
var tree = [];
var lastSortedIndex = -1;
var moved = false;
var partitioned_data = [];
var stat = 0; // used to decide which step nextStep() will be performed

var max = Number.MIN_SAFE_INTEGER;

var numInsideBuffer = 0;


var zonesDict = {};


/* 
 * Function to draw the chart
 */ 
function run_operations() {
    // parameters
    const minN = 20;
    const maxN = 10000;

    // Get the correct input for N
    let selectedN;
    if (document.getElementById('radioN1').checked) {
        selectedN = parseInt(document.getElementById('cmp-select-N').value);
    }
    else {
        selectedN = document.getElementById("manualN").value;
    }

    // Get the correct input for K
    let selectedK;
    if (document.getElementById('radioK1').checked) {
        selectedK = parseInt(document.getElementById('cmp-select-K').value);
    }
    else {
        selectedK = document.getElementById("manualK").value;
    }

    // Get the correct input for L
    let selectedL;
    if (document.getElementById('radioL1').checked) {
        selectedL = parseInt(document.getElementById('cmp-select-L').value);
    }
    else {
        selectedL = document.getElementById("manualL").value;
    } 

    // Get the correct input for B
    let selectedB;
    if (document.getElementById('radioB1').checked) {
        selectedB = parseFloat(document.getElementById('cmp-select-B').value);
    }
    else {
        selectedB = document.getElementById("manualB").value;
    } 

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
        var total_data = create_data(selectedN, selectedK, selectedL, selectedB);
        draw_chart(total_data, selectedN, selectedK, selectedL, selectedB);
        draw_buffer(total_data, selectedN, selectedK, selectedL, selectedB);
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
        title: 'position vs. value comparison',
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
    
    // Output info besides the chart
    document.getElementById("info_div").innerHTML = `
        <h5>Selected Values</h5>
        <p><strong>N:</strong> ${N}</p>
        <p><strong>K:</strong> ${K}%</p>
        <p><strong>L:</strong> ${L}%</p>
        <p><strong>B:</strong> ${B}</p>
    `;
}

function fillTheBuffer() {
    while (zones.length != 0) {
        // end of one cycle
        if (numInsideBuffer == 10) {

            for (let i = 0; i < numInsideBuffer; i++) {
                const iter = document.getElementById("buffer" + i);
                iter.innerHTML = buffer[i];
            }

            console.log("lastSortedIndex: " + lastSortedIndex);

            break;
        }
        else {
            var el = zones.shift();
            buffer.push(el);
            numInsideBuffer++;
            if ((el[0] > max) && !moved) {
                lastSortedIndex++;
                max = el[1];
            }
            // push lastSortedIndex back, to its position
            else {
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
    resetColors();
    console.log("adjusting colors!");
    console.log("lastSortedIndex: " + lastSortedIndex);
    console.log("we enter here");
    if (lastSortedIndex == -1) {
        const first = document.getElementById("buffer0");
        first.style.backgroundColor = "#b51100";
    }
    else {
        for (let i = 0; i <= lastSortedIndex; i++) {
            const iter = document.getElementById("buffer" + i);
            if (i % 2 == 0) {
                iter.style.backgroundColor = "#b51100";
            }
            else {
                iter.style.backgroundColor = "#FF0000";
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

    console.log("partioned data: ");
    console.log(partitioned_data);



    
    for (let i = 0; i < partitioned_data.length; i += 1) {
        const min = Math.min(...partitioned_data[i]);
        const max = Math.max(...partitioned_data[i]);
        zones.push([min, max]);
        zonesDict[max] = partitioned_data[i];
    }

    console.log("zones dict: ");
    console.log(zonesDict);
    
    fillTheBuffer();
    adjustColors();
}


function nextStep() {
    // if the buffer is full and it is flushing time
    if (stat === 0) {
        // flushing operations
        if (lastSortedIndex == -1) {
            tree.push(buffer[0]);
            const lastTreeElement = document.getElementById("last-tree");
            lastTreeElement.innerHTML = "" + buffer[0];
            buffer.shift();
            
        }
        else if (lastSortedIndex < 5) {
            for (let j = 0; j <= lastSortedIndex; j++) {
                tree.push(buffer[j]);
            }
            const lastTreeElement = document.getElementById("last-tree");
            lastTreeElement.innerHTML = "" + buffer[lastSortedIndex];
            buffer.splice(0, lastSortedIndex + 1);
        }
        else {
            for (let j = 0; j < 5; j++) {
                tree.push(buffer[j]);
            }
            const lastTreeElement = document.getElementById("last-tree");
            lastTreeElement.innerHTML = "" + buffer[4];
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

        resetColors();
       

        stat = 1;

    }
    // sort the remainder
    else if (stat == 1) {
        
        let remainingPages = [];

        console.log(buffer);

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

        console.log("will will the buffer now");
        console.log(zones);
        fillTheBuffer();

        adjustColors();

        console.log("lastSortedIndex from status " + stat + ": " + lastSortedIndex);

        stat = 0;

    }
    
}


